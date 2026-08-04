<template>
  <div class="home">
    <!-- ═══ 可爱头部 ═══ -->
    <header class="cute-header">
      <div class="cute-topline">
        <span class="cute-en">SISI'S COOKBOOK</span>
        <span class="cute-date">{{ todayLabel }}</span>
      </div>

      <div class="cute-title-row">
        <h1 class="cute-title">思思大王的菜单</h1>
        <img class="cute-chef-bear" src="/deco/chef-bear.png" alt="" />
      </div>
      <!-- 统计：小胶囊 + 布局切换 -->
      <div class="cute-stats">
        <span class="cute-stat-pill"><img class="ic" src="/icons/pot.svg" alt="" /> 已收录 <em>{{ stats.total }}</em> 道菜</span>
        <div class="layout-switch">
          <button
            class="layout-btn"
            :class="{ on: layout === '1col' }"
            @click="setLayout('1col')"
            aria-label="单列布局"
          >
            <img class="ic" src="/icons/view-list.svg" alt="" />
          </button>
          <button
            class="layout-btn"
            :class="{ on: layout === '2col' }"
            @click="setLayout('2col')"
            aria-label="双列布局"
          >
            <img class="ic" src="/icons/view-grid.svg" alt="" />
          </button>
        </div>
      </div>

      <!-- 今天吃什么：翻牌子入口 -->
      <button class="eat-btn" @click="openEat" aria-label="今天吃什么">
        <img class="ic" src="/icons/dice.svg" alt="" />
        今天吃什么
        <span class="eat-btn-arrow">→</span>
      </button>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">翻页中...</div>

    <!-- 空状态 -->
    <div v-else-if="dishes.length === 0" class="empty-state">
      <div class="empty-icon"><img src="/icons/pot.svg" alt="" /></div>
      <div class="empty-title">菜单还是空白页</div>
      <div class="empty-desc">点击下方「记一道菜」<br/>写下你们的第一页好味</div>
    </div>

    <!-- 可爱卡片列表（单列 / 双列切换） -->
    <div v-else class="cute-list" :class="layout === '2col' ? 'layout-2col' : 'layout-1col'">
      <article
        v-for="(dish, i) in dishes"
        :key="dish.id"
        class="entry cute-card"
        @click="goDetail(dish)"
      >
        <div class="cute-card-img">
          <img :src="dish.photo" :alt="dish.name" loading="lazy" />
        </div>
        <div class="cute-card-info">
          <h2 class="cute-card-name">{{ dish.name }}</h2>
          <div class="cute-card-tags">
            <span class="cute-tag"><img class="ic" src="/icons/calendar.svg" alt="" /> {{ formatDate(dish.cook_date) }}</span>
            <span class="cute-tag"><img class="ic" src="/icons/chef.svg" alt="" /> {{ dish.cook_by }}</span>
          </div>
        </div>
      </article>

      <!-- 页脚 -->
      <footer class="cute-footer">
        <p>未完待续 <img class="ic ic-inline" src="/icons/cupcake.svg" alt="" /></p>
      </footer>
    </div>

    <!-- 今天吃什么：翻牌子 -->
    <WhatToEatPopup v-model:show="eatShow" :dishes="dishes" @pick="onEatPick" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onDeactivated, inject, watch, nextTick } from 'vue'
import { showToast } from 'vant'
import WhatToEatPopup from '../components/WhatToEatPopup.vue'

defineOptions({ name: 'Home' })

const dishes = ref([])
const stats = ref({ total: 0, totalCooked: 0, thisMonth: 0 })
const loading = ref(true)

// 今天吃什么：翻牌子弹窗
const eatShow = ref(false)
function openEat() {
  if (dishes.value.length === 0) {
    showToast('菜单还空着，先记一道菜吧')
    return
  }
  eatShow.value = true
}
function onEatPick(dish) {
  openDishDetail(dish.id)
}

// 布局模式：1col 单列 / 2col 双列（记住用户选择，默认双列）
const layout = ref(localStorage.getItem('menuLayout') || '2col')
function setLayout(m) {
  layout.value = m
  localStorage.setItem('menuLayout', m)
}

const todayLabel = computed(() => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}.${m}.${day}`
})

// 数据版本信号：保存成功后静默刷新
const openDishDetail = inject('openDishDetail')
const dataVersion = inject('dataVersion', null)
if (dataVersion) watch(dataVersion, () => fetchData(false))

async function fetchData(showLoading = true) {
  if (showLoading) loading.value = true
  try {
    const [dishesRes, statsRes, countsRes] = await Promise.all([
      fetch('/api/dishes'),
      fetch('/api/dishes/stats'),
      fetch('/api/dishes/counts')
    ])
    const dishesData = await dishesRes.json()
    const statsData = await statsRes.json()
    const countsData = await countsRes.json()

    if (dishesData.success) {
      const countMap = {}
      if (countsData.success) {
        countsData.data.forEach(c => { countMap[c.name] = c.times })
      }
      dishes.value = dishesData.data.map(d => ({
        ...d,
        cookedTimes: countMap[d.name] || 1
      }))
    }
    if (statsData.success) {
      stats.value = statsData.data
    }
  } catch (e) {
    console.error('加载失败', e)
    showToast('加载失败，请检查网络')
  } finally {
    loading.value = false
  }
}

function goDetail(dish) {
  openDishDetail(dish.id)
}

function formatDate(d) {
  if (!d) return ''
  const parts = d.split('-')
  return `${parts[1]}.${parts[2]}`
}

// 首次进入：显示 loading
onMounted(() => {
  fetchData(true)
})

// 从详情页返回等场景：静默刷新（不闪 loading、不重置列表），并恢复离开时的滚动位置
onActivated(() => {
  const y = parseInt(sessionStorage.getItem('homeScrollY') || '0', 10)
  if (y > 0) nextTick(() => window.scrollTo(0, y))
  fetchData(false)
})

// 离开首页时记住滚动位置（详情页会 scrollTo 顶部，回来时需要恢复）
onDeactivated(() => {
  sessionStorage.setItem('homeScrollY', String(window.scrollY))
})
</script>

<style scoped>
/* ═══════════ 可爱温馨风 · 奶油黄 ═══════════ */
.home {
  background: #fffbf0;
  min-height: 100vh;
  font-family: -apple-system, 'PingFang SC', 'HarmonyOS Sans SC', 'MiSans', 'Microsoft YaHei', sans-serif;
}

/* ═══ 内联图标（Iconify SVG，跟随文字颜色） ═══ */
.ic {
  width: 14px;
  height: 14px;
  vertical-align: -2px;
  display: inline-block;
}
.ic-inline {
  width: 12px;
  height: 12px;
  vertical-align: -1px;
}

/* ═══ 头部 ═══ */
.cute-header {
  padding: 34px 22px 26px;
}

/* 眉线：虚线 + 小字 */
.cute-topline {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: 12px;
  border-bottom: 1px dashed #f0dfb8;
  margin-bottom: 20px;
}
.cute-en {
  font-size: 9px;
  letter-spacing: 3px;
  color: #d4b98a;
}
.cute-date {
  font-size: 10px;
  letter-spacing: 2px;
  color: #d4b98a;
}

/* 标题行 */
.cute-title-row {
  position: relative;
  margin-top: 20px;
}
/* 熊厨师：绝对定位，从标题右上角探出头，俏皮自然 */
.cute-chef-bear {
  position: absolute;
  right: -8px;
  top: -34px;
  width: 96px;
  height: 96px;
  object-fit: contain;
  animation: chef-bear-bounce 2.6s ease-in-out infinite;
  filter: drop-shadow(0 4px 10px rgba(180, 120, 80, 0.22));
}
@keyframes chef-bear-bounce {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-5px) rotate(2deg); }
}
.cute-title {
  font-size: 32px;
  font-weight: 800;
  color: #8a6d4b;
  letter-spacing: 2px;
  line-height: 1.3;
  margin: 0;
  white-space: nowrap;
}

/* 统计胶囊 + 布局切换 */
.cute-stats {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cute-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffe9b8;
  color: #a07c3a;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 99px;
  letter-spacing: 1px;
}
.cute-stat-pill .ic {
  width: 15px;
  height: 15px;
  vertical-align: 0;
}
.cute-stat-pill em {
  font-style: normal;
  font-weight: 800;
  color: #8a6d4b;
}

/* 布局切换：白色胶囊容器 + 两个图标按钮 */
.layout-switch {
  display: flex;
  background: #fff;
  border: 1px solid #f0dfb8;
  border-radius: 99px;
  padding: 3px;
  gap: 2px;
  box-shadow: 0 3px 10px rgba(255, 180, 120, 0.15);
}
.layout-btn {
  width: 32px;
  height: 28px;
  border: none;
  border-radius: 99px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #d4b98a;
  padding: 0;
  transition: background 0.2s, color 0.2s;
}
.layout-btn .ic {
  width: 15px;
  height: 15px;
}
.layout-btn.on {
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(255, 180, 90, 0.4);
}

/* ═══ 可爱卡片列表 ═══ */
.cute-list {
  padding: 0 22px 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.cute-card {
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 8px 24px rgba(255, 180, 120, 0.2);
  overflow: hidden;
  cursor: pointer;
}
.cute-card:active {
  transform: scale(0.98);
}
.cute-card-img {
  overflow: hidden;
}
.cute-card-img img {
  display: block;
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.cute-card:active .cute-card-img img {
  transform: scale(1.04);
}
.cute-card-info {
  padding: 14px 18px 18px;
}
.cute-card-name {
  font-size: 18px;
  font-weight: 700;
  color: #8a6d4b;
  margin: 0;
  letter-spacing: 1px;
}
.cute-card-tags {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.cute-tag {
  font-size: 11px;
  font-weight: 600;
  background: #fff3dd;
  color: #b08d55;
  padding: 4px 12px;
  border-radius: 99px;
  letter-spacing: 0.5px;
}

/* ═══ 双列布局（grid 两列，等宽等高） ═══ */
.layout-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 14px 18px 30px;
}
.layout-2col .cute-card {
  border-radius: 18px;
}
.layout-2col .cute-card-img img {
  height: auto;
  aspect-ratio: 1 / 1;
}
.layout-2col .cute-card-info {
  padding: 10px 12px 12px;
}
.layout-2col .cute-card-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* 双列只留图 + 菜名，隐藏日期/作者标签 */
.layout-2col .cute-card-tags {
  display: none;
}
.layout-2col .cute-footer {
  grid-column: 1 / -1;
}

/* ═══ 页脚 ═══ */
.cute-footer {
  padding: 20px 0 8px;
  text-align: center;
}
.cute-footer p {
  font-size: 11px;
  letter-spacing: 4px;
  color: #d4b98a;
  margin: 0;
}

/* ═══ 今天吃什么：翻牌子入口按钮 ═══ */
.eat-btn {
  margin-top: 14px;
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 99px;
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 18px rgba(255, 180, 90, 0.4);
  transition: transform 0.15s, box-shadow 0.15s;
}
.eat-btn .ic {
  width: 17px;
  height: 17px;
}
.eat-btn:active {
  transform: scale(0.97);
  box-shadow: 0 3px 10px rgba(255, 180, 90, 0.3);
}
.eat-btn-arrow {
  font-size: 14px;
  opacity: 0.85;
  transition: transform 0.2s;
}
.eat-btn:active .eat-btn-arrow {
  transform: translateX(3px);
}

/* ═══ 加载 / 空状态 ═══ */
.loading {
  text-align: center;
  padding: 80px 0;
  color: #d4b98a;
  font-size: 11px;
  letter-spacing: 4px;
}
.empty-state {
  text-align: center;
  padding: 80px 30px;
}
.empty-icon {
  width: 88px;
  height: 88px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(255, 180, 120, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}
.empty-icon img {
  width: 40px;
  height: 40px;
  color: #e0cda6;
}
.empty-title {
  font-size: 20px;
  font-weight: 700;
  color: #8a6d4b;
  margin-bottom: 8px;
}
.empty-desc {
  font-size: 11px;
  color: #c4a97a;
  line-height: 1.8;
  letter-spacing: 1px;
}

/* ═══ PC 自适应（≥768px，手机端完全不受影响） ═══ */
@media (min-width: 768px) {
  /* PC 上不显示布局切换按钮 */
  .layout-switch {
    display: none;
  }
  .cute-header,
  .cute-list,
  .empty-state {
    max-width: 980px;
    margin-left: auto;
    margin-right: auto;
  }
  /* PC 默认多列网格（忽略单列/双列记忆，一律网格） */
  .cute-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 18px;
    padding: 14px 18px 30px;
  }
  .cute-list .cute-card {
    border-radius: 18px;
  }
  .cute-list .cute-card-img img {
    height: auto;
    aspect-ratio: 1 / 1;
  }
  .cute-list .cute-card-info {
    padding: 10px 12px 12px;
  }
  .cute-list .cute-card-name {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cute-list .cute-card-tags {
    display: none;
  }
  .cute-list .cute-footer {
    grid-column: 1 / -1;
  }
  /* 悬停：图片放大（鼠标移入） */
  .cute-card:hover .cute-card-img img {
    transform: scale(1.08);
  }
}
</style>
