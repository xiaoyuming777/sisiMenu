<template>
  <div class="stats-page">
    <!-- 概览 -->
    <van-row gutter="16" class="overview-row">
      <van-col span="8">
        <div class="stat-card">
          <div class="stat-num">{{ stats.total }}</div>
          <div class="stat-label">总菜数</div>
        </div>
      </van-col>
      <van-col span="8">
        <div class="stat-card">
          <div class="stat-num">{{ stats.totalCooked }}</div>
          <div class="stat-label">总次数</div>
        </div>
      </van-col>
      <van-col span="8">
        <div class="stat-card">
          <div class="stat-num">{{ stats.thisMonth }}</div>
          <div class="stat-label">本月新菜</div>
        </div>
      </van-col>
    </van-row>

    <!-- 谁做得多 -->
    <van-cell-group inset class="section">
      <van-cell title="👩‍🍳 谁做得多" />
      <div class="section-body">
        <div v-for="item in stats.byCook" :key="item.cook_by" class="cook-row">
          <span>{{ cookIcon(item.cook_by) }} {{ item.cook_by }}</span>
          <div class="bar-wrap">
            <div class="bar" :style="{ width: barWidth(item.count) + '%' }"></div>
          </div>
          <span class="bar-num">{{ item.count }}道</span>
        </div>
        <van-empty v-if="!stats.byCook.length" description="暂无数据" :image-size="60" />
      </div>
    </van-cell-group>

    <!-- 难度分布 -->
    <van-cell-group inset class="section">
      <van-cell title="🔥 难度分布" />
      <div class="section-body diff-grid">
        <div v-for="(count, diff) in diffStats" :key="diff" class="diff-item">
          <div class="diff-icon">{{ diffIcon(diff) }}</div>
          <div class="diff-name">{{ diff }}</div>
          <div class="diff-count">{{ count }}道</div>
        </div>
      </div>
    </van-cell-group>

    <!-- 最高评分 -->
    <van-cell-group inset class="section">
      <van-cell title="⭐ 最高评分" />
      <div class="section-body">
        <div v-for="d in topRated" :key="d.id" class="top-item" @click="openDishDetail(d.id)">
          <span>{{ d.name }}</span>
          <van-rate :model-value="5" :size="12" color="#f5a623" void-icon="star" void-color="#ede3d8" readonly />
        </div>
        <van-empty v-if="topRated.length === 0" description="暂无数据" :image-size="60" />
      </div>
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { showToast } from 'vant'

const openDishDetail = inject('openDishDetail')

const stats = ref({ total: 0, totalCooked: 0, thisMonth: 0, byCook: [] })
const allDishes = ref([])
const topRated = ref([])

const diffStats = computed(() => {
  const map = {}
  allDishes.value.forEach(d => { map[d.difficulty] = (map[d.difficulty] || 0) + 1 })
  return map
})

const maxCookCount = computed(() => {
  if (!stats.value.byCook?.length) return 1
  return Math.max(...stats.value.byCook.map(c => c.count), 1)
})

function barWidth(count) {
  return (count / maxCookCount.value) * 100
}

function cookIcon(c) {
  const m = { '思思': '👩‍🍳', '小明': '👨‍🍳', '一起做的': '👩‍🍳👨‍🍳' }
  return m[c] || ''
}

function diffIcon(d) {
  const m = { '新手友好': '🌱', '小有挑战': '🔥', '硬菜': '💪' }
  return m[d] || ''
}

onMounted(async () => {
  try {
    const [sRes, dRes] = await Promise.all([
      fetch('/api/dishes/stats'),
      fetch('/api/dishes')
    ])
    const sData = await sRes.json()
    const dData = await dRes.json()
    if (sData.success) stats.value = sData.data
    if (dData.success) {
      allDishes.value = dData.data
      topRated.value = dData.data.filter(d => d.rating >= 5).slice(0, 5)
    }
  } catch (e) {
    showToast('加载失败')
  }
})
</script>

<style scoped>
.stats-page {
  padding: 4px 0;
}
.overview-row { padding: 0 4px; margin-bottom: 12px; }
.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 0;
  text-align: center;
}
.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #e8826b;
}
.stat-label {
  font-size: 11px;
  color: #b39587;
  margin-top: 2px;
}
.section { margin-bottom: 12px; }
.section-body { padding: 12px 16px 16px; }
.cook-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #8a6b5e;
}
.bar-wrap {
  flex: 1;
  height: 8px;
  background: #f7f0ea;
  border-radius: 10px;
  overflow: hidden;
}
.bar {
  height: 100%;
  background: linear-gradient(90deg, #f7a58f, #e8826b);
  border-radius: 10px;
  transition: width 0.3s;
}
.bar-num { font-size: 12px; color: #b39587; width: 40px; text-align: right; }
.diff-grid { display: flex; gap: 12px; }
.diff-item {
  flex: 1;
  text-align: center;
  padding: 14px 8px;
  background: #fcf9f6;
  border-radius: 12px;
}
.diff-icon { font-size: 24px; }
.diff-name { font-size: 12px; color: #8a6b5e; margin-top: 4px; }
.diff-count { font-size: 18px; font-weight: 700; color: #e8826b; margin-top: 4px; }
.top-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f7f0ea;
  font-size: 14px;
  color: #3d2c25;
  cursor: pointer;
}
.top-item:last-child { border-bottom: none; }
</style>
