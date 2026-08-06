const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 照片压缩：最长边 1280px，JPEG 质量 82（同名覆盖，压缩失败保留原图）
async function optimizePhoto(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const format = ext === '.png' ? 'png' : ext === '.webp' ? 'webp' : 'jpeg';
    let img = sharp(filePath, { failOn: 'none' }).rotate().resize({ width: 1280, withoutEnlargement: true });
    if (format === 'jpeg') img = img.jpeg({ quality: 82, mozjpeg: true });
    else if (format === 'png') img = img.png({ compressionLevel: 9 });
    else img = img.webp({ quality: 82 });
    const buf = await img.toBuffer();
    fs.writeFileSync(filePath, buf);
  } catch (e) {
    console.error('照片压缩失败(保留原图):', e.message);
  }
}

// photos 字段规范化：DB 存 JSON 数组字符串，返回给前端时转成数组（兼容旧数据只有 photo）
function photosOf(dish) {
  try {
    const arr = JSON.parse(dish.photos || '');
    if (Array.isArray(arr) && arr.length) return arr;
  } catch (e) { /* 非法 JSON 忽略 */ }
  return dish.photo ? [dish.photo] : [];
}

// 删除一组照片文件（忽略不存在的）
function unlinkPhotos(photos) {
  for (const p of photos || []) {
    try {
      const fp = path.join(UPLOAD_DIR, path.basename(p));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch (e) { console.error('删除照片失败:', p, e.message); }
  }
}

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = Date.now() + '-' + Math.random().toString(36).slice(2, 6) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    cb(null, true); // 允许所有格式，后端不限制
  }
});

// GET /api/dishes — 获取所有菜品，按日期倒序
router.get('/', (req, res) => {
  try {
    const { search, cook_by } = req.query;
    let sql = 'SELECT d.*, (SELECT COUNT(*) FROM comments c WHERE c.dish_id = d.id) AS comment_count FROM dishes d WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND d.name LIKE ?';
      params.push(`%${search}%`);
    }
    if (cook_by) {
      sql += ' AND d.cook_by = ?';
      params.push(cook_by);
    }

    sql += ' ORDER BY cook_date DESC, created_at DESC';

    const dishes = db.prepare(sql).all(...params);
    res.json({ success: true, data: dishes.map(d => ({ ...d, photos: photosOf(d) })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dishes/stats — 统计数据
router.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM dishes').get();
    const totalCooked = db.prepare('SELECT SUM(cooked_count) as total FROM (SELECT COUNT(*) as cooked_count FROM dishes GROUP BY name)').get();
    const thisMonth = db.prepare("SELECT COUNT(*) as count FROM dishes WHERE strftime('%Y-%m', cook_date) = strftime('%Y-%m', 'now')").get();
    const byCook = db.prepare("SELECT cook_by, COUNT(*) as count FROM dishes GROUP BY cook_by").all();

    res.json({
      success: true,
      data: {
        total: total.count,
        totalCooked: totalCooked.total || total.count,
        thisMonth: thisMonth.count,
        byCook
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dishes/counts — 每道菜做过几次
router.get('/counts', (req, res) => {
  try {
    const counts = db.prepare('SELECT name, COUNT(*) as times FROM dishes GROUP BY name ORDER BY times DESC').all();
    res.json({ success: true, data: counts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dishes/:id — 获取单个菜品
router.get('/:id', (req, res) => {
  try {
    const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
    if (!dish) return res.status(404).json({ success: false, error: '没找到这道菜' });
    const count = db.prepare('SELECT COUNT(*) as times FROM dishes WHERE name = ?').get(dish.name);
    res.json({ success: true, data: { ...dish, photos: photosOf(dish), cookedTimes: count.times } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dishes — 新增菜品（支持最多 10 张照片）
router.post('/', (req, res, next) => {
  upload.array('photos', 10)(req, res, (err) => {
    if (err) {
      console.error('上传错误:', err.message);
      return res.status(400).json({ success: false, error: err.message || '照片上传失败' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { name, cook_date, cook_by, rating, difficulty, note } = req.body;
    const files = req.files || [];
    for (const f of files) {
      await optimizePhoto(f.path); // 每张上传后自动压缩
    }
    const photos = files.map(f => '/uploads/' + f.filename);
    const photo = photos[0] || '';

    console.log('收到新增请求:', { name, cook_by, rating, difficulty, photoCount: photos.length });

    if (!name || !photo) {
      // 必填没满足时清掉刚上传的文件
      unlinkPhotos(photos);
      return res.status(400).json({ success: false, error: '菜名和照片是必填的哦' });
    }

    const result = db.prepare(`
      INSERT INTO dishes (name, photo, photos, cook_date, cook_by, rating, difficulty, ingredients, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, photo, JSON.stringify(photos), cook_date || new Date().toISOString().slice(0,10), cook_by || '思思', Number(rating) || 5, difficulty || '新手友好', '', note || '');

    console.log('新增成功, ID:', result.lastInsertRowid);
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    console.error('新增失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/dishes/:id — 修改菜品（支持多图：keep_photos=保留的旧图 JSON 数组 + 新上传的 photos）
router.put('/:id', upload.array('photos', 10), async (req, res) => {
  try {
    const { name, cook_date, cook_by, rating, difficulty, note } = req.body;
    const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
    if (!dish) return res.status(404).json({ success: false, error: '没找到这道菜' });

    // 旧照片集合
    const oldPhotos = photosOf(dish);
    // 前端要保留的旧照片（去重）
    let keepPhotos = [];
    try {
      const kp = JSON.parse(req.body.keep_photos || '[]');
      if (Array.isArray(kp)) keepPhotos = [...new Set(kp.filter(p => oldPhotos.includes(p)))];
    } catch (e) { /* 忽略非法 JSON */ }

    // 新上传的照片
    const files = req.files || [];
    for (const f of files) await optimizePhoto(f.path);
    const newPhotos = files.map(f => '/uploads/' + f.filename);

    const photos = [...keepPhotos, ...newPhotos];
    const photo = photos[0] || '';

    // 被移除的旧照片：删除物理文件
    const removed = oldPhotos.filter(p => !keepPhotos.includes(p));
    unlinkPhotos(removed);

    if (!photo) {
      unlinkPhotos(newPhotos);
      return res.status(400).json({ success: false, error: '至少保留一张照片哦' });
    }

    db.prepare(`
      UPDATE dishes SET name=?, photo=?, photos=?, cook_date=?, cook_by=?, rating=?, difficulty=?, ingredients=?, note=?
      WHERE id=?
    `).run(
      name || dish.name,
      photo,
      JSON.stringify(photos),
      cook_date || dish.cook_date,
      cook_by || dish.cook_by,
      Number(rating) || dish.rating,
      difficulty || dish.difficulty,
      '',
      note !== undefined ? note : dish.note,
      req.params.id
    );

    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/dishes/:id — 删除菜品
router.delete('/:id', (req, res) => {
  try {
    const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
    if (!dish) return res.status(404).json({ success: false, error: '没找到这道菜' });

    // 删除所有照片文件
    unlinkPhotos(photosOf(dish));

    db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
