# 思思大王的菜单 — 开发文档

## 📋 项目概述

思思和金（小明）的私人菜单系统，记录两人在家做的每一道菜。

- **项目名称**：思思大王的菜单
- **技术栈**：Node.js + Express + Vue 3 + Vant 4 + SQLite
- **端口**：2001
- **部署地址**：服务器 `http://localhost:2001`
- **开发者**：AI小明

---

## 🗂 项目结构

```
/root/sisimenu/
├── server.js                 # Express 服务入口
├── db.js                     # SQLite 数据库配置
├── package.json              # 后端依赖
├── package-lock.json
├── data/
│   └── dishes.db             # SQLite 数据库文件
├── uploads/                  # 菜品照片存储目录
├── routes/
│   └── dishes.js             # 菜品 CRUD API 路由
└── frontend/
    ├── index.html            # HTML 入口
    ├── package.json          # 前端依赖
    ├── vite.config.js        # Vite 配置（含API代理）
    └── src/
        ├── main.js           # Vue 入口
        ├── App.vue           # 主组件（含底部导航）
        ├── style.css         # 全局样式
        ├── router/
        │   └── index.js      # 路由配置
        ├── components/
        │   └── DishCard.vue  # 菜品卡片组件（复用）
        └── views/
            ├── Home.vue      # 首页 - 菜单墙
            ├── AddDish.vue   # 新增菜品页
            ├── DishDetail.vue# 菜品详情页
            ├── Search.vue    # 搜索/筛选页
            └── Stats.vue     # 数据统计页
```

---

## 🚀 启动方式

### 1. 启动后端服务（含前端静态文件）

```bash
cd /root/sisimenu
node server.js
```

访问：`http://localhost:2001`

### 2. 开发模式（前后端热更新）

**终端1：后端**
```bash
cd /root/sisimenu
node server.js
```

**终端2：前端**
```bash
cd /root/sisimenu/frontend
npx vite
```

前端开发服务器默认运行在 `http://localhost:5173`，已配置代理转发 `/api` 和 `/uploads` 到后端 2001 端口。

### 3. 前端构建

```bash
cd /root/sisimenu/frontend
npx vite build
```

构建产物输出到 `frontend/dist/`，由 `server.js` 自动托管。

---

## 🔌 API 接口

### 基础路径：`/api/dishes`

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| GET | `/api/dishes` | 获取所有菜品（支持 `?search=xx&cook_by=xx` 筛选） |
| GET | `/api/dishes/stats` | 统计数据（总菜数、累计次数、本月新菜、做菜人分布） |
| GET | `/api/dishes/counts` | 每道菜做过几次 |
| GET | `/api/dishes/:id` | 获取单道菜详情 |
| POST | `/api/dishes` | 新增菜品（multipart/form-data，含照片上传） |
| PUT | `/api/dishes/:id` | 修改菜品 |
| DELETE | `/api/dishes/:id` | 删除菜品 |

### 菜品字段

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| id | INTEGER | — | 自增主键 |
| name | TEXT | ✅ | 菜名 |
| photo | TEXT | ✅ | 照片路径（`/uploads/xxx.jpg`） |
| cook_date | TEXT | — | 做菜日期，默认今天 |
| cook_by | TEXT | — | 做菜人：思思 / 小明 / 一起做的 |
| rating | INTEGER | — | 评分 1-5，默认 5 |
| difficulty | TEXT | — | 难度：新手友好 / 小有挑战 / 硬菜 |
| ingredients | TEXT | — | 食材清单（选填） |
| note | TEXT | — | 备注心得（选填） |
| created_at | TEXT | — | 创建时间，自动生成 |

---

## 🎨 前端路由

| 路径 | 页面 | 说明 |
|:---|:---|:---|
| `/` | Home | 首页菜单墙，按日期倒序 |
| `/add` | AddDish | 新增菜品表单 |
| `/dish/:id` | DishDetail | 菜品详情 |
| `/search` | Search | 搜索 + 按做菜人筛选 |
| `/stats` | Stats | 数据统计 |

---

## 🧩 底部导航

五个 Tab：首页 🔍 发现 ➕ 记一道菜 📊 统计 👤 我的

中间"记一道菜"按钮为凸起圆形按钮，跳转到 `/add` 页面。

---

## 🎨 UI 风格

- **主色调**：暖橙 `#e8826b` / `#f7a58f`
- **背景**：米白 `#fcf7f2`
- **文字**：深棕 `#3d2c25`
- **卡片**：白色圆角 + 柔和阴影
- **整体**：温暖可爱风，适合手机端

---

## 📸 照片存储

- 上传目录：`/root/sisimenu/uploads/`
- 文件名：时间戳 + 随机数 + 扩展名
- 限制：单张最大 10MB，支持 JPG/PNG/GIF/WebP
- 通过 `http://localhost:2001/uploads/xxx.jpg` 访问

---

## 🗄 数据库

使用 SQLite，数据库文件位于 `data/dishes.db`。

表结构：

```sql
CREATE TABLE dishes (
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
```

---

## 🔧 常见维护

### 备份数据库
```bash
cp /root/sisimenu/data/dishes.db /root/sisimenu/data/dishes.backup.db
```

### 查看数据
```bash
cd /root/sisimenu
node -e "const db=require('./db'); console.log(db.prepare('SELECT * FROM dishes').all())"
```

### 停止服务
```bash
kill $(lsof -t -i:2001)
```

---

## 📝 版本记录

| 版本 | 日期 | 说明 |
|:---|:---|:---|
| v1.0.0 | 2026.07.29 | 初始版本，完成核心菜单功能 |
