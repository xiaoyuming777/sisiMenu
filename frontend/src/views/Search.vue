<template>
  <div class="search-page">
    <!-- 搜索框 -->
    <div class="search-section">
      <van-search
        v-model="keyword"
        shape="round"
        background="transparent"
        placeholder="搜菜名..."
        @search="doSearch"
        @clear="doSearch"
        @update:model-value="!keyword && doSearch()"
      />
    </div>

    <!-- 筛选 -->
    <div class="filter-section">
      <div class="filter-tags">
        <button
          v-for="c in cooks"
          :key="c"
          :class="['filter-btn', { active: filterCook === c }]"
          @click="filterCook = c; doSearch()"
        >
          {{ c === '全部' ? '👥 全部' : (c === '思思' ? '👩‍🍳 思思' : c === '小明' ? '👨‍🍳 小明' : '👩‍🍳👨‍🍳 一起') }}
        </button>
      </div>
    </div>

    <!-- 结果 -->
    <div v-if="loading" class="loading-wrap">
      <van-loading type="spinner" size="28" color="#e8826b" />
      <span class="loading-text">搜索中...</span>
    </div>
    <div v-else-if="results.length > 0" class="results">
      <div class="result-count">找到 {{ results.length }} 道菜</div>
      <DishCard v-for="d in results" :key="d.id" :dish="d" />
    </div>
    <van-empty v-else-if="searched" description="没有找到匹配的菜哦 😅" />
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, inject, watch } from 'vue'
import { showToast } from 'vant'
import DishCard from '../components/DishCard.vue'

defineOptions({ name: 'Search' })

const keyword = ref('')
const filterCook = ref('全部')
const results = ref([])
const searched = ref(true)
const loading = ref(true)
const cooks = ['全部', '思思', '小明', '一起做的']

// 数据版本信号：保存成功后静默刷新
const dataVersion = inject('dataVersion', null)
if (dataVersion) watch(dataVersion, () => doSearch(false))

async function doSearch(showLoading = true) {
  if (showLoading) loading.value = true
  const params = new URLSearchParams()
  if (keyword.value.trim()) params.set('search', keyword.value.trim())
  if (filterCook.value !== '全部') params.set('cook_by', filterCook.value)

  try {
    const [dishesRes, countsRes] = await Promise.all([
      fetch('/api/dishes?' + params.toString()),
      fetch('/api/dishes/counts')
    ])
    const dishesData = await dishesRes.json()
    const countsData = await countsRes.json()
    const countMap = {}
    if (countsData.success) countsData.data.forEach(c => { countMap[c.name] = c.times })
    if (dishesData.success) {
      results.value = dishesData.data.map(d => ({ ...d, cookedTimes: countMap[d.name] || 1 }))
    }
  } catch (e) {
    console.error(e)
    showToast('搜索失败，请检查网络')
  } finally {
    loading.value = false
    searched.value = true
  }
}

// 首次进入：显示 loading
onMounted(() => doSearch(true))

// 从详情页返回：静默刷新（保留搜索词和筛选状态，不闪加载）
onActivated(() => {
  doSearch(false)
})
</script>

<style scoped>
.search-page {
  padding: 4px 0;
}
.search-section {
  margin: 8px 12px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}
:deep(.search-section .van-search__content) {
  background: #fcf9f6;
  border-radius: 24px;
}
.filter-section {
  padding: 0 12px 18px;
}
.filter-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-btn {
  padding: 5px 12px;
  border-radius: 16px;
  border: none;
  background: #f5f0eb;
  color: #8a6b5e;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  font-weight: 500;
}
.filter-btn.active {
  background: linear-gradient(135deg, #f7a58f, #e8826b);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(232,130,107,0.25);
}
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
}
.loading-text {
  color: #c9b0a2;
  font-size: 13px;
}
.result-count {
  padding: 0 16px 12px;
  font-size: 13px;
  color: #b39587;
}
.results {
  padding: 0 16px 10px;
}
</style>
