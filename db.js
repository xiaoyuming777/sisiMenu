const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dishes.db');

// 确保 data 目录存在
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo TEXT NOT NULL,
    cook_date TEXT NOT NULL DEFAULT (date('now')),
    cook_by TEXT NOT NULL DEFAULT '思思',
    rating INTEGER NOT NULL DEFAULT 5,
    difficulty TEXT NOT NULL DEFAULT '新手友好',
    ingredients TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dish_name TEXT NOT NULL,
    nickname TEXT NOT NULL DEFAULT '匿名吃货',
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_comments_dish ON comments(dish_name);
`);

// 多图支持：旧库没有 photos 列时补上（JSON 数组，photo 保留第一张）
const cols = db.prepare("PRAGMA table_info(dishes)").all();
if (!cols.some(c => c.name === 'photos')) {
  db.exec(`ALTER TABLE dishes ADD COLUMN photos TEXT DEFAULT ''`);
  // 已有数据：photos 初始化为 [photo]
  const rows = db.prepare("SELECT id, photo FROM dishes WHERE photos = '' OR photos IS NULL").all();
  const upd = db.prepare('UPDATE dishes SET photos = ? WHERE id = ?');
  for (const r of rows) upd.run(JSON.stringify([r.photo]), r.id);
  console.log('[db] dishes.photos 列已迁移，共', rows.length, '行');
}

module.exports = db;
