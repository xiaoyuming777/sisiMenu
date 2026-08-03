const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
    let sql = 'SELECT * FROM dishes WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    if (cook_by) {
      sql += ' AND cook_by = ?';
      params.push(cook_by);
    }

    sql += ' ORDER BY cook_date DESC, created_at DESC';

    const dishes = db.prepare(sql).all(...params);
    res.json({ success: true, data: dishes });
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
    res.json({ success: true, data: { ...dish, cookedTimes: count.times } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dishes — 新增菜品
router.post('/', (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('上传错误:', err.message);
      return res.status(400).json({ success: false, error: err.message || '照片上传失败' });
    }
    next();
  });
}, (req, res) => {
  try {
    const { name, cook_date, cook_by, rating, difficulty, ingredients, note } = req.body;
    const photo = req.file ? '/uploads/' + req.file.filename : '';

    console.log('收到新增请求:', { name, cook_by, rating, difficulty, hasPhoto: !!req.file });

    if (!name || !photo) {
      return res.status(400).json({ success: false, error: '菜名和照片是必填的哦' });
    }

    const result = db.prepare(`
      INSERT INTO dishes (name, photo, cook_date, cook_by, rating, difficulty, ingredients, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, photo, cook_date || new Date().toISOString().slice(0,10), cook_by || '思思', Number(rating) || 5, difficulty || '新手友好', ingredients || '', note || '');

    console.log('新增成功, ID:', result.lastInsertRowid);
    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    console.error('新增失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/dishes/:id — 修改菜品
router.put('/:id', upload.single('photo'), (req, res) => {
  try {
    const { name, cook_date, cook_by, rating, difficulty, ingredients, note } = req.body;
    const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
    if (!dish) return res.status(404).json({ success: false, error: '没找到这道菜' });

    let photo = dish.photo;
    if (req.file) {
      // 删除旧照片
      const oldPath = path.join(UPLOAD_DIR, path.basename(dish.photo));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      photo = '/uploads/' + req.file.filename;
    }

    db.prepare(`
      UPDATE dishes SET name=?, photo=?, cook_date=?, cook_by=?, rating=?, difficulty=?, ingredients=?, note=?
      WHERE id=?
    `).run(
      name || dish.name,
      photo,
      cook_date || dish.cook_date,
      cook_by || dish.cook_by,
      Number(rating) || dish.rating,
      difficulty || dish.difficulty,
      ingredients !== undefined ? ingredients : dish.ingredients,
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

    // 删除照片文件
    const photoPath = path.join(UPLOAD_DIR, path.basename(dish.photo));
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);

    db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
