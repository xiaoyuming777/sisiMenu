import { createApp } from 'vue'
import './style.css'
// 霞鹜文楷字体（分片按需加载，用于标题/菜名的书法感）
import './assets/lxgw-wenkai.css'
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
