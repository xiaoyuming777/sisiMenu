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

    <!-- 右下角悬浮新增按钮（横版胶囊蜜桃渐变，详情页隐藏） -->
    <button
      v-if="!$route.path.startsWith('/dish')"
      class="fab-add"
      @click="openAddPopup"
      aria-label="记一道菜"
    >
      <span class="fab-star">⭐</span>
      <span class="fab-text">上新</span>
      <span class="fab-heart">❤️</span>
    </button>

    <!-- 小鸡毛贴纸：悬浮在按钮正上方（动态GIF） -->
    <img
      v-if="!$route.path.startsWith('/dish')"
      class="fab-pet"
      src="/deco/sticker-bear.gif"
      alt=""
    />

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
/* ═══ 全局 Vant 主题色覆盖 — 奶油黄风 ═══ */
:root {
  --van-primary-color: #8a6d4b;
  --van-danger-color: #c8563a;
  --van-success-color: #7b8c6f;
  --van-warning-color: #e8a33d;

  /* 表单组件 */
  --van-field-label-color: #b08d55;
  --van-field-input-text-color: #8a6d4b;
  --van-field-placeholder-text-color: #d4b98a;
  --van-cell-background: #fffdf9;

  /* 按钮 */
  --van-button-primary-background: #8a6d4b;
  --van-button-primary-border-color: #8a6d4b;
  --van-button-border-radius: 99px;

  /* 标签 */
  --van-tag-primary-color: #8a6d4b;

  /* 评分 */
  --van-rate-icon-full-color: #ffc94d;
  --van-rate-icon-void-color: #f0dfb8;

  /* 弹窗 */
  --van-dialog-width: 300px;
  --van-dialog-radius: 16px;
  --van-dialog-background: #fffdf9;
  --van-dialog-header-font-weight: 600;
  --van-dialog-header-font-size: 17px;
  --van-dialog-message-color: #b08d55;
  --van-dialog-confirm-button-text-color: #c8563a;
  --van-dialog-cancel-button-text-color: #d4b98a;
}

/* 全局样式 */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #fffbf0;
  color: #8a6d4b;
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
/* ═══ 右下角悬浮新增按钮：横版胶囊蜜桃渐变 ═══ */
.fab-add {
  position: fixed;
  right: 24px;
  bottom: 30px;
  width: 148px;
  height: 56px;
  border-radius: 99px;
  background-image: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 60%), linear-gradient(145deg, #ffb3a6, #ff8a7a);
  border: none;
  box-shadow: 0 8px 24px rgba(255, 138, 122, 0.5), 0 4px 12px rgba(255, 107, 89, 0.25);
  cursor: pointer;
  padding: 0 18px;
  z-index: 100;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
}
.fab-add:hover {
  transform: scale(1.06) translateY(-3px);
  box-shadow: 0 14px 32px rgba(255, 138, 122, 0.6), 0 6px 16px rgba(255, 107, 89, 0.3);
  background-image: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 60%), linear-gradient(145deg, #ffbfb2, #ff8f7a);
}
.fab-add:active {
  transform: scale(0.94) translateY(1px);
  box-shadow: 0 4px 12px rgba(255, 138, 122, 0.4);
}

/* 星星：浮动动画 */
.fab-star {
  font-size: 22px;
  line-height: 1;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.08));
  animation: fab-float-star 3s ease-in-out infinite;
}

/* 文字：放大加粗，深棕与星星协调 */
.fab-text {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #4d2e2a;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.6), 0 0 12px rgba(255, 220, 210, 0.3);
  line-height: 1;
}

/* 爱心点缀：跳动动画 */
.fab-heart {
  position: absolute;
  top: 4px;
  right: 12px;
  font-size: 14px;
  line-height: 1;
  filter: drop-shadow(0 2px 6px rgba(255, 215, 0, 0.5));
  animation: fab-pop-heart 2.4s ease-in-out infinite;
  transform-origin: center;
  pointer-events: none;
}

@keyframes fab-float-star {
  0% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(6deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

@keyframes fab-pop-heart {
  0% { transform: scale(1) rotate(0deg); }
  20% { transform: scale(1.4) rotate(-10deg); }
  40% { transform: scale(0.9) rotate(6deg); }
  60% { transform: scale(1.15) rotate(-3deg); }
  80% { transform: scale(1) rotate(0deg); }
  100% { transform: scale(1) rotate(0deg); }
}

/* ═══ 小鸡毛贴纸：悬浮在按钮正上方 ═══ */
.fab-pet {
  position: fixed;
  right: 67px;
  bottom: 88px;
  width: 62px;
  height: 62px;
  pointer-events: none;
  z-index: 99;
  animation: fab-pet-float 3.2s ease-in-out infinite;
  filter: drop-shadow(0 4px 10px rgba(180, 120, 90, 0.18));
}
@keyframes fab-pet-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* 响应式：小屏缩小 */
@media (max-width: 480px) {
  .fab-add {
    width: 100px;
    height: 40px;
    bottom: 24px;
    right: 20px;
    padding: 0 12px;
    gap: 4px;
  }
  .fab-pet {
    right: 20px;
    bottom: 42px;
    width: 100px;
    height: 100px;
  }
  .fab-star {
    font-size: 16px;
  }
  .fab-text {
    font-size: 15px;
    letter-spacing: 1px;
  }
  .fab-heart {
    font-size: 11px;
    top: 2px;
    right: 8px;
  }
}
@media (max-width: 380px) {
  .fab-add {
    width: 88px;
    height: 38px;
    bottom: 18px;
    right: 16px;
    padding: 0 10px;
  }
  .fab-pet {
    right: 16px;
    bottom: 34px;
    width: 88px;
    height: 88px;
  }
  .fab-star {
    font-size: 15px;
  }
  .fab-text {
    font-size: 13px;
    letter-spacing: 0.5px;
  }
  .fab-heart {
    font-size: 10px;
    top: 1px;
    right: 6px;
  }
}
</style>
