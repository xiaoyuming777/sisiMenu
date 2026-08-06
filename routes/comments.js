const express = require('express');
const router = express.Router();
const db = require('../db');

// 简单防刷：同一 IP 15 秒内只能发 1 条
const lastPostAt = new Map();
function canPost(ip) {
  const now = Date.now();
  const last = lastPostAt.get(ip) || 0;
  if (now - last < 15000) return false;
  lastPostAt.set(ip, now);
  return true;
}

// GET /api/comments?dish_id=3 — 某道菜的评论列表（时间正序，旧的在上）
router.get('/', (req, res) => {
  try {
    const { dish_id, name } = req.query;
    let comments;
    if (dish_id) {
      comments = db.prepare(
        'SELECT id, dish_id, dish_name, nickname, content, created_at FROM comments WHERE dish_id = ? ORDER BY created_at ASC, id ASC'
      ).all(Number(dish_id));
    } else if (name) {
      // 兼容旧的按菜名查询
      comments = db.prepare(
        'SELECT id, dish_id, dish_name, nickname, content, created_at FROM comments WHERE dish_name = ? ORDER BY created_at ASC, id ASC'
      ).all(name);
    } else {
      return res.status(400).json({ success: false, error: '缺少 dish_id 参数' });
    }
    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/comments — 发评论
router.post('/', (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!canPost(ip)) return res.status(429).json({ success: false, error: '发得太快了，歇一会儿再评论吧' });

    const { dish_id, dish_name, nickname, content } = req.body || {};
    const name = (dish_name || '').trim();
    const text = (content || '').trim();
    const id = Number(dish_id) || null;

    if (!id && !name) return res.status(400).json({ success: false, error: '评论需要关联一道菜哦' });
    if (!text) return res.status(400).json({ success: false, error: '评论内容不能为空' });
    if (text.length > 200) return res.status(400).json({ success: false, error: '评论最多 200 个字' });

    const nick = (nickname || '').trim().slice(0, 20) || '匿名吃货';

    // 有 dish_id 就挂到具体那道菜（同名菜互不冲突）；旧客户端没带 id 时退回挂菜名
    let finalDishId = id;
    let finalName = name;
    if (id) {
      const dish = db.prepare('SELECT id, name FROM dishes WHERE id = ?').get(id);
      if (dish) {
        finalDishId = dish.id;
        finalName = dish.name;
      }
    }

    const result = db.prepare(
      'INSERT INTO comments (dish_id, dish_name, nickname, content) VALUES (?, ?, ?, ?)'
    ).run(finalDishId, finalName, nick, text);

    const row = db.prepare('SELECT id, dish_id, dish_name, nickname, content, created_at FROM comments WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
