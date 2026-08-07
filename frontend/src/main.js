import { createApp } from 'vue'
import './style.css'
// Vant 函数式组件（showToast / showConfirmDialog 等）不会通过模板自动导入样式，需手动引入
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import 'vant/es/image-preview/style'
import { Lazyload } from 'vant'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.use(Lazyload, { lazyComponent: true })
app.mount('#app')

// PWA：注册 Service Worker（壳子缓存 + 离线可用；API 永远走网络）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW 注册失败（不影响使用）:', err)
    })
  })
}
