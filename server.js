const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const app = express();
const HTTP_PORT = 2001;
const HTTPS_PORT = 443;
const DOMAIN = 'www.xiaoyuming.top';

// SSL 证书
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', DOMAIN + '.key')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', DOMAIN + '.pem')),
};

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件：上传的图片（文件名含时间戳+随机数，天然不可变 → 强缓存1年）
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '365d',
  immutable: true,
}));

// 静态文件：构建后的前端
const distPath = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        // HTML 不缓存：每次访问都拿最新版本（防止旧样式残留）
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          // 带 hash 的资源可长缓存
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
}

// API 路由
const dishesRouter = require('./routes/dishes');
app.use('/api/dishes', dishesRouter);
const commentsRouter = require('./routes/comments');
app.use('/api/comments', commentsRouter);

// SPA fallback
if (fs.existsSync(distPath)) {
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 启动 HTTP（2001）
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`🍳 思思大王的菜单 HTTP  → http://localhost:${HTTP_PORT}`);
});

// 启动 HTTPS（443）
https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`🔒 思思大王的菜单 HTTPS → https://${DOMAIN}`);
});
