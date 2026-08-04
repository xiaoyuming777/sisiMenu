# 思思大王的菜单 — 开发文档

## 📋 项目概述

思思和金（小明）的私人菜单系统，记录两人在家做的每一道菜。

- **项目名称**：思思大王的菜单
- **技术栈**：Node.js + Express 5 + Vue 3 + Vant 4 + SQLite
- **端口**：2001（HTTP）/ 443（HTTPS）
- **域名**：https://www.xiaoyuming.top（阿里云 SSL，Node 直接承载）
- **部署地址**：服务器 `http://localhost:2001`
- **开发者**：AI小明

---

## 🗂 项目结构

```
/root/sisimenu/
├── server.js                 # Express 服务入口（HTTP+HTTPS 双监听）
├── db.js                     # SQLite 数据库配置
├── package.json              # 后端依赖
├── data/
│   └── dishes.db             # SQLite 数据库文件
├── uploads/                  # 菜品照片存储目录（上传自动压缩）
├── ssl/                      # 阿里云 SSL 证书（www.xiaoyuming.top.key/.pem）
├── routes/
│   └── dishes.js             # 菜品 CRUD API 路由（含照片压缩 sharp）
└── frontend/
    ├── index.html            # HTML 入口
    ├── package.json          # 前端依赖
    ├── vite.config.js        # Vite 配置（含API代理）
    ├── public/
    │   └── icons/            # Iconify SVG 图标（mdi 系列，跟随文字色）
    └── src/
        ├── main.js           # Vue 入口
        ├── App.vue           # 主组件（导航 + 新增/详情弹窗 + 数据版本信号）
        ├── style.css         # 全局样式
        ├── router/
        │   └── index.js      # 路由配置（/、/search、/stats）
        ├── components/
        │   ├── DishCard.vue      # 菜品卡片（搜索结果用）
        │   ├── DishFormPopup.vue # 新增/编辑弹窗
        │   └── DishDetailPopup.vue # 详情弹窗（手机底部抽屉/PC居中）
        └── views/
            ├── Home.vue      # 首页 - 菜单墙（单列/双列切换）
            ├── Search.vue    # 发现 - 搜索/筛选页
            └── Stats.vue     # 数据统计页
```

---

## 🚀 启动方式（systemd 守护）

服务已注册为 systemd 系统服务，**开机自启 + 崩溃自动重启**：

```bash
systemctl status sisimenu     # 查看服务状态
systemctl restart sisimenu    # 重启服务
systemctl stop sisimenu       # 停止服务
journalctl -u sisimenu -n 50  # 查看最近 50 行日志
```

服务文件：`/etc/systemd/system/sisimenu.service`

### 手动启动（仅调试用，平时不要用）
```bash
cd /root/sisimenu
node server.js
```

### 前端开发模式（热更新）
```bash
cd /root/sisimenu/frontend
npx vite
```
前端开发服务器默认运行在 `http://localhost:5173`，已配置代理转发 `/api` 和 `/uploads` 到后端 2001 端口。

### 前端构建
```bash
cd /root/sisimenu/frontend
npx vite build
```
构建产物输出到 `frontend/dist/`，由 `server.js` 自动托管（HTML 不缓存、带 hash 资源一年强缓存）。

---

## 🔌 API 接口

### 基础路径：`/api/dishes`

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| GET | `/api/dishes` | 获取所有菜品（支持 `?search=xx&cook_by=xx` 筛选） |
| GET | `/api/dishes/stats` | 统计数据（总菜数、累计次数、本月新菜、做菜人分布） |
| GET | `/api/dishes/counts` | 每道菜做过几次 |
| GET | `/api/dishes/:id` | 获取单道菜详情（含 cookedTimes） |
| POST | `/api/dishes` | 新增菜品（multipart/form-data，含照片上传） |
| PUT | `/api/dishes/:id` | 修改菜品 |
| DELETE | `/api/dishes/:id` | 删除菜品（连照片一起删） |

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
| `/search` | Search | 搜索菜名 + 按做菜人筛选 |
| `/stats` | Stats | 数据统计 |
| `/dish/:id` | （深链） | 直接打开对应菜品的详情弹窗（分享用） |

---

## 🧩 交互结构

- **新增/编辑**：右下角蜂蜜黄悬浮"上新"按钮（FAB）→ DishFormPopup 弹窗
- **详情**：列表点击 → DishDetailPopup（手机端底部 92% 抽屉，PC ≥768px 居中弹窗），支持编辑/删除/分享海报/深链
- **数据刷新**：App.vue 提供 `dataVersion` 信号，新增/编辑/删除成功后 +1，Home/Search 监听后静默刷新（不闪 loading）
- **滚动位置**：离开首页记住滚动位置，返回时恢复

---

## 🎨 UI 风格

- **背景**：奶油底 `#fffbf0`
- **主色**：蜂蜜黄 `#ffc94d`（渐变 #ffd66b→#ffc94d）
- **文字**：焦糖色 `#8a6d4b`
- **点缀**：蜜桃 `#ffb6a3`
- **风格**：可爱温馨奶油黄，大圆角/胶囊/虚线/软阴影
- **图标**：Iconify SVG（mdi 系列，存在 frontend/public/icons/，`currentColor` 跟随文字色），不用 emoji
- **首页布局**：单列大图卡片（默认）/ 双列网格，右上角可切换，选择存 localStorage
- **PC 适配**：≥768px 自动多列网格，隐藏布局切换按钮

---

## 📸 照片存储

- 上传目录：`/root/sisimenu/uploads/`
- 文件名：时间戳 + 随机数 + 扩展名
- 上传自动压缩：最长边 1280px，JPEG 质量 82（sharp，同名覆盖）
- 限制：单张最大 50MB
- 访问：`/uploads/xxx.jpg`，一年强缓存（文件名不可变）
- 删除菜品时同步删除照片文件

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

### 停止/重启服务（systemd 方式）
```bash
systemctl restart sisimenu
systemctl stop sisimenu
```

### 查看服务日志
```bash
journalctl -u sisimenu -n 50          # 最近50行
journalctl -u sisimenu -f             # 实时跟踪
```

---

## 📝 版本记录

| 版本 | 日期 | 说明 |
|:---|:---|:---|
| v1.0.0 | 2026.07.29 | 初始版本，完成核心菜单功能 |
| v1.1.0 | 2026.08.03 | 详情弹窗化、图片压缩+强缓存+懒加载、ICP备案、首页奶油黄风格 |
| v1.2.0 | 2026.08.04 | 接入 systemd 守护（开机自启+崩溃自愈），文档同步更新 |
