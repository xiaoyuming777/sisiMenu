// 思思大王的菜单 - Service Worker
// 策略：页面壳子缓存优先（离线可用），API/上传图片永远走网络（数据必须最新）
// ⚠️ 前端代码更新后，把下面版本号 +1 并重新部署（如 menu-v2）
const CACHE = 'sisimenu-v1'
const PRECACHE = ['/', '/index.html', '/manifest.json', '/favicon.png', '/favicon-192.png', '/favicon-512.png']

// 安装：预缓存壳子
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

// 激活：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// 请求处理
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 跨域请求（如图片 CDN、外链）不拦截，走默认
  if (url.origin !== self.location.origin) return

  // 动态数据（API）永远走网络，绝不缓存 —— 评论/菜谱必须最新
  if (url.pathname.startsWith('/api/')) return

  // 上传的图片：网络优先，失败时回退缓存（弱网也能看到旧图）
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      fetch(event.request).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        return res
      }).catch(() => caches.match(event.request))
    )
    return
  }

  // 静态资源（带 hash 的 js/css/字体/图标）：缓存优先，网络兜底
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((res) => {
        // 只缓存成功的同源响应
        if (res.ok && url.pathname !== '/index.html') {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return res
      })
    }).catch(() => caches.match('/index.html'))
  )
})
