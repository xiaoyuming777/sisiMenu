<template>
  <div class="dish-card" @click="$router.push('/dish/' + dish.id)">
    <div class="card-img-wrap">
      <van-image
        :src="dish.photo"
        :alt="dish.name"
        fit="cover"
        class="card-img"
        loading-icon="photo-o"
        error-icon="photo-o"
      />
      <van-tag v-if="dish.cookedTimes > 1" color="#e8826b" round class="card-badge">
        ✨ 做过{{ dish.cookedTimes }}次
      </van-tag>
    </div>
    <div class="card-body">
      <div class="card-row1">
        <span class="card-name">{{ dish.name }}</span>
        <van-rate
          :model-value="dish.rating"
          :size="14"
          color="#f5a623"
          void-icon="star"
          void-color="#ede3d8"
          readonly
        />
      </div>
      <div class="card-row2">
        <span>📅 {{ formatDate(dish.cook_date) }}</span>
        <span class="card-dot"></span>
        <span>{{ cookByIcon(dish.cook_by) }} {{ dish.cook_by }}</span>
        <span>{{ difficultyIcon(dish.difficulty) }} {{ dish.difficulty }}</span>
      </div>
      <div v-if="dish.note" class="card-note">{{ dish.note }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  dish: { type: Object, required: true }
})

function formatDate(d) {
  if (!d) return ''
  const parts = d.split('-')
  return parts[1] + '.' + parts[2]
}

function cookByIcon(by) {
  const map = { '思思': '👩‍🍳', '小明': '👨‍🍳', '一起做的': '👩‍🍳👨‍🍳' }
  return map[by] || '👩‍🍳'
}

function difficultyIcon(d) {
  const map = { '新手友好': '🌱', '小有挑战': '🔥', '硬菜': '💪' }
  return map[d] || '🌱'
}
</script>

<style scoped>
.dish-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 16px;
  cursor: pointer;
}
.card-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  overflow: hidden;
  background: #efe5dc;
}
.card-img {
  width: 100%;
  height: 100%;
}
.card-badge {
  position: absolute;
  top: 12px;
  right: 12px;
}
.card-body { padding: 12px 16px 14px; }
.card-row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-name {
  font-size: 17px;
  font-weight: 700;
  color: #3d2c25;
}
.card-row2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: #b39587;
}
.card-dot {
  width: 3px; height: 3px;
  border-radius: 50%;
  background: #ddd6ce;
}
.card-note {
  margin-top: 8px;
  font-size: 13px;
  color: #7d6052;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
