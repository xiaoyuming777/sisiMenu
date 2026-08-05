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

// GET /api/comments?name=可乐鸡翅 — 某道菜的评论列表（时间正序，旧的在上）
router.get('/', (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, error: '缺少菜名参数' });
    const comments = db.prepare(
      'SELECT id, dish_name, nickname, content, created_at FROM comments WHERE dish_name = ? ORDER BY created_at ASC, id ASC'
    ).all(name);
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

    const { dish_name, nickname, content } = req.body || {};
    const name = (dish_name || '').trim();
    const text = (content || '').trim();

    if (!name) return res.status(400).json({ success: false, error: '评论需要关联一道菜哦' });
    if (!text) return res.status(400).json({ success: false, error: '评论内容不能为空' });
    if (text.length > 200) return res.status(400).json({ success: false, error: '评论最多 200 个字' });

    const nick = (nickname || '').trim().slice(0, 20) || '匿名吃货';

    const result = db.prepare(
      'INSERT INTO comments (dish_name, nickname, content) VALUES (?, ?, ?)'
    ).run(name, nick, text);

    const row = db.prepare('SELECT id, dish_name, nickname, content, created_at FROM comments WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
