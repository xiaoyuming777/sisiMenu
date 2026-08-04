<template>
  <div class="app-container">
    <!-- 页面内容（只有首页一个路由，其余功能均为弹窗） -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <keep-alive include="Home">
            <component :is="Component" />
          </keep-alive>
        </transition>
      </router-view>

      <!-- 底部备案信息 -->
      <footer class="icp-footer">
        <a href="http://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">湘ICP备2026032707号-1</a>
      </footer>
    </main>

    <!-- 右下角悬浮新增按钮（印章风，详情页隐藏） -->
    <button
      v-if="!$route.path.startsWith('/dish')"
      class="fab-add"
      @click="openAddPopup"
      aria-label="记一道菜"
    >
      <span class="fab-plus">上新</span>
    </button>

    <!-- 新增/编辑弹出层 -->
    <DishFormPopup
      v-model:show="popupShow"
      :mode="popupMode"
      :edit-id="popupEditId"
      @saved="onSaved"
    />

    <!-- 详情弹出层 -->
    <DishDetailPopup v-model:show="detailShow" :id="detailId" />
  </div>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DishFormPopup from './components/DishFormPopup.vue'
import DishDetailPopup from './components/DishDetailPopup.vue'

const router = useRouter()

const popupShow = ref(false)
const popupMode = ref('add')
const popupEditId = ref(null)

// 详情弹窗状态
const detailShow = ref(false)
const detailId = ref(null)

// 数据版本信号：新增/编辑/删除成功后 +1，缓存页面（Home）监听到后静默刷新
const dataVersion = ref(0)
provide('dataVersion', dataVersion)

// 提供给子组件使用（如 DishDetail 的编辑按钮）
provide('openDishForm', (mode, id) => {
  popupMode.value = mode
  popupEditId.value = id || null
  popupShow.value = true
})

// 打开详情弹窗
provide('openDishDetail', (id) => {
  detailId.value = id
  detailShow.value = true
})

function openAddPopup() {
  popupMode.value = 'add'
  popupEditId.value = null
  popupShow.value = true
}

function onSaved() {
  // 表单保存成功后，通知缓存页面刷新数据
  dataVersion.value++
}

// 深链支持：直接访问 /dish/3 时打开详情弹窗并清理 URL
onMounted(() => {
  const m = location.pathname.match(/^\/dish\/(\d+)\/?$/)
  if (m) {
    detailId.value = Number(m[1])
    detailShow.value = true
    router.replace('/')
  }
})
</script>

<style>
/* ═══ 全局 Vant 主题色覆盖 — 墨色杂志风 ═══ */
:root {
  --van-primary-color: #2d241f;
  --van-danger-color: #c8563a;
  --van-success-color: #7b8c6f;
  --van-warning-color: #b58a4a;

  /* 导航栏 */
  --van-nav-bar-background: #fbf8f3;
  --van-nav-bar-text-color: #2d241f;
  --van-nav-bar-icon-color: #2d241f;

  /* 表单组件 */
  --van-field-label-color: #8a8177;
  --van-field-input-text-color: #2d241f;
  --van-field-placeholder-text-color: #d8cfc5;
  --van-cell-background: #fbf8f3;

  /* 搜索 */
  --van-search-background: #fbf8f3;

  /* 按钮 */
  --van-button-primary-background: #2d241f;
  --van-button-primary-border-color: #2d241f;
  --van-button-border-radius: 2px;

  /* 标签 */
  --van-tag-primary-color: #2d241f;

  /* 评分 */
  --van-rate-icon-full-color: #b58a4a;
  --van-rate-icon-void-color: #e8e2da;

  /* 弹窗 */
  --van-dialog-width: 300px;
  --van-dialog-radius: 2px;
  --van-dialog-background: #fbf8f3;
  --van-dialog-header-font-weight: 600;
  --van-dialog-header-font-size: 17px;
  --van-dialog-message-color: #8a8177;
  --van-dialog-confirm-button-text-color: #c8563a;
  --van-dialog-cancel-button-text-color: #b5aca1;
}

/* 全局样式 */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #fbf8f3;
  color: #2d241f;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
.app-main {
  background: #fffbf0;
  min-height: calc(100vh - 100px);
}

/* ═══ 底部备案信息：小字浅灰，居中对齐 ═══ */
.icp-footer {
  text-align: center;
  padding: 18px 0 14px;
}
.icp-footer a {
  font-size: 11px;
  color: #b5aca1;
  text-decoration: none;
}

/* ═══ 页面切换淡入 ═══ */
.page-enter-active {
  transition: opacity 0.3s ease;
}
.page-leave-active {
  transition: opacity 0.15s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>

<style scoped>
/* ═══ 右下角悬浮新增按钮：可爱蜂蜜黄 ═══ */
.fab-add {
  position: fixed;
  right: 22px;
  bottom: 26px;
  width: 58px;
  height: 58px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  box-shadow: 0 8px 20px rgba(255, 180, 90, 0.5);
  cursor: pointer;
  padding: 0;
  z-index: 100;
  transition: transform 0.2s, box-shadow 0.2s;
}
.fab-add:active {
  transform: scale(0.92);
  box-shadow: 0 4px 12px rgba(255, 180, 90, 0.4);
}
/* "上新"二字：竖排白字 */
.fab-plus {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 3px;
  writing-mode: vertical-rl;
}
/* 白色虚线内圈，可爱点缀 */
.fab-add::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1.5px dashed rgba(255, 255, 255, 0.75);
  pointer-events: none;
}
</style>
