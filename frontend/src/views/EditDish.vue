<template>
  <div class="edit-page">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="修改菜谱"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
      fixed
      placeholder
      class="nav-bar"
    />

    <!-- 加载 -->
    <div v-if="loading" class="loading-wrap">
      <div class="loading-spinner">
        <van-loading type="spinner" size="32" color="#e8826b" />
        <span>加载中...</span>
      </div>
    </div>

    <!-- 表单 -->
    <van-form v-else @submit="onSubmit" class="form-body">
      <!-- ====== Section: 基本信息 ====== -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">🍽️</span>
          <span>基本信息</span>
        </div>

        <div class="card">
          <!-- 菜名 -->
          <div class="field-group">
            <label class="field-label">菜名</label>
            <input
              v-model="form.name"
              class="field-input"
              placeholder="比如：可乐鸡翅"
              maxlength="30"
            />
          </div>

          <!-- 分隔线 -->
          <div class="field-divider"></div>

          <!-- 做菜日期 -->
          <div class="field-group">
            <label class="field-label">做菜日期</label>
            <input
              v-model="form.cook_date"
              type="date"
              class="field-input field-input--date"
            />
          </div>
        </div>
      </div>

      <!-- ====== Section: 成品照片 ====== -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">📸</span>
          <span>成品照片</span>
          <span class="section-hint">（可选，不选则保留原图）</span>
        </div>

        <div class="card card--photo">
          <!-- 当前照片预览 -->
          <div v-if="fileList.length > 0" class="photo-preview">
            <img
              :src="fileList[0].url || fileList[0].content"
              class="photo-img"
              @click="triggerUpload"
            />
            <div class="photo-overlay" @click="triggerUpload">
              <span class="photo-change-hint">点击更换照片</span>
            </div>
            <div class="photo-actions">
              <span class="photo-status" v-if="!hasNewPhoto">当前照片</span>
              <span class="photo-status photo-status--new" v-else>新照片已选择</span>
              <button type="button" class="photo-remove-btn" @click="removePhoto">删除</button>
            </div>
          </div>

          <!-- 无照片 -->
          <div v-else class="photo-empty" @click="triggerUpload">
            <div class="photo-empty-icon">📷</div>
            <div class="photo-empty-text">点击上传成品照</div>
            <div class="photo-empty-sub">展示你的手艺～</div>
          </div>

          <!-- 隐藏的上传器 -->
          <van-uploader
            ref="uploaderRef"
            v-model="fileList"
            :max-count="1"
            :after-read="afterRead"
            :before-delete="beforeDelete"
            accept="image/*"
            class="hidden-uploader"
          />
        </div>
      </div>

      <!-- ====== Section: 做菜信息 ====== -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">👩‍🍳</span>
          <span>做菜信息</span>
        </div>

        <!-- 做菜人 -->
        <div class="card">
          <label class="field-label field-label--block">做菜人</label>
          <div class="cook-cards">
            <div
              v-for="c in cooks"
              :key="c"
              class="cook-card"
              :class="{ 'cook-card--active': form.cook_by === c }"
              @click="form.cook_by = c"
            >
              <span class="cook-emoji">{{ cookIcon(c) }}</span>
              <span class="cook-name">{{ c }}</span>
            </div>
          </div>
        </div>

        <!-- 难度 -->
        <div class="card card--spaced">
          <label class="field-label field-label--block">难度</label>
          <div class="diff-cards">
            <div
              v-for="d in difficulties"
              :key="d"
              class="diff-card"
              :class="{ 'diff-card--active': form.difficulty === d }"
              @click="form.difficulty = d"
            >
              <span class="diff-emoji">{{ diffIcon(d) }}</span>
              <span class="diff-name">{{ d }}</span>
            </div>
          </div>
        </div>

        <!-- 分隔 -->
        <div class="section-divider"></div>

        <!-- 口味评分 -->
        <div class="card card--rating">
          <label class="field-label field-label--block field-label--center">口味评分</label>
          <div class="rating-wrap">
            <van-rate
              v-model="form.rating"
              :size="28"
              color="#f5a623"
              void-color="#ede3d8"
              :count="5"
              allow-half
            />
          </div>
          <div class="rating-text">{{ ratingText }}</div>
        </div>
      </div>

      <!-- ====== Section: 补充信息 ====== -->
      <div class="section">
        <div class="section-title">
          <span class="section-icon">📝</span>
          <span>补充信息</span>
        </div>

        <div class="card">
          <!-- 食材清单 -->
          <div class="field-group">
            <label class="field-label">食材清单</label>
            <input
              v-model="form.ingredients"
              class="field-input"
              placeholder="鸡翅、可乐、姜片..."
              maxlength="200"
            />
          </div>

          <!-- 分隔线 -->
          <div class="field-divider"></div>

          <!-- 备注心得 -->
          <div class="field-group">
            <label class="field-label">备注心得</label>
            <textarea
              v-model="form.note"
              class="field-textarea"
              placeholder="记录一下这道菜的故事和心得～"
              rows="3"
              maxlength="500"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-msg">
        <span class="error-icon">⚠️</span>
        <span>{{ error }}</span>
      </div>

      <!-- 底部占位（为固定按钮留空间） -->
      <div class="bottom-spacer"></div>
    </van-form>

    <!-- 底部固定保存按钮 -->
    <div class="save-bar">
      <van-button
        round
        block
        type="primary"
        native-type="submit"
        :loading="submitting"
        loading-text="保存中..."
        class="save-btn"
        @click="triggerSubmit"
      >
        <span v-if="!submitting">💾 保存修改</span>
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const fileList = ref([])
const hasNewPhoto = ref(false)
const uploaderRef = ref(null)

const cooks = ['思思', '小明', '一起做的']
const difficulties = ['新手友好', '小有挑战', '硬菜']

const form = reactive({
  name: '',
  cook_date: '',
  cook_by: '思思',
  rating: 5,
  difficulty: '新手友好',
  ingredients: '',
  note: ''
})

const ratingText = computed(() => {
  const m = { 1: '还有进步空间 😅', 2: '继续加油 💪', 3: '还不错 👍', 4: '很好吃 😋', 5: '绝了！🌟' }
  return m[Math.round(form.rating)] || ''
})

function cookIcon(c) {
  const m = { '思思': '👩‍🍳', '小明': '👨‍🍳', '一起做的': '👩‍🍳👨‍🍳' }
  return m[c] || ''
}

function diffIcon(d) {
  const m = { '新手友好': '🌱', '小有挑战': '🔥', '硬菜': '💪' }
  return m[d] || ''
}

// --- 加载已有菜品数据 ---
async function loadDish() {
  try {
    const res = await fetch('/api/dishes/' + route.params.id)
    const data = await res.json()
    if (data.success) {
      const d = data.data
      form.name = d.name
      form.cook_date = d.cook_date
      form.cook_by = d.cook_by
      form.rating = d.rating
      form.difficulty = d.difficulty
      form.ingredients = d.ingredients || ''
      form.note = d.note || ''
      // 显示原图
      if (d.photo) {
        fileList.value = [{ url: d.photo, name: d.name }]
      }
    } else {
      showToast('加载菜品失败')
    }
  } catch (e) {
    error.value = '加载失败，请返回重试'
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// --- 照片上传 ---
function afterRead(detail) {
  hasNewPhoto.value = true
}

function beforeDelete() {
  hasNewPhoto.value = false
  return true
}

function triggerUpload() {
  // 通过 van-uploader 触发文件选择
  const input = document.querySelector('.hidden-uploader input[type="file"]')
  if (input) input.click()
}

function removePhoto() {
  fileList.value = []
  hasNewPhoto.value = false
}

// --- 提交流程（由底部固定按钮触发）---
function triggerSubmit() {
  const submitEvent = new Event('submit', { cancelable: true, bubbles: true })
  document.querySelector('.form-body')?.dispatchEvent(submitEvent)
}

// --- 提交表单 ---
async function onSubmit() {
  error.value = ''
  if (!form.name.trim()) {
    error.value = '请输入菜名～'
    showToast('请输入菜名')
    return
  }

  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('cook_date', form.cook_date)
    fd.append('cook_by', form.cook_by)
    fd.append('rating', form.rating)
    fd.append('difficulty', form.difficulty)
    fd.append('ingredients', form.ingredients)
    fd.append('note', form.note)

    // 只有选了新照片才附加
    if (hasNewPhoto.value && fileList.value.length > 0) {
      const item = fileList.value[0]
      if (item.file) {
        fd.append('photo', item.file)
      }
    }

    const res = await fetch('/api/dishes/' + route.params.id, {
      method: 'PUT',
      body: fd
    })
    const data = await res.json()
    if (data.success) {
      showToast('保存成功')
      router.push('/dish/' + route.params.id)
    } else {
      error.value = data.error || '保存失败'
      showToast(data.error || '保存失败')
    }
  } catch (e) {
    error.value = '网络错误：' + e.message
    showToast('网络错误')
  } finally {
    submitting.value = false
  }
}

onMounted(loadDish)
</script>

<style scoped>
/* ========== 页面基础 ========== */
.edit-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fef8f4 0%, #faf3ec 30%, #f7ede3 100%);
  padding-bottom: 100px;
}

/* ========== 导航栏 ========== */
.nav-bar {
  --van-nav-bar-background: transparent;
  --van-nav-bar-title-text-color: #3d2c25;
}

/* ========== 加载状态 ========== */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #c9b0a2;
  font-size: 14px;
}

/* ========== 表单主体 ========== */
.form-body {
  padding: 0 12px;
}

/* ========== Section ========== */
.section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #b39587;
  letter-spacing: 0.5px;
}

.section-icon {
  font-size: 16px;
}

.section-hint {
  font-size: 12px;
  font-weight: 400;
  color: #c9b0a2;
  margin-left: 4px;
}

.section-divider {
  height: 12px;
}

/* ========== 卡片 ========== */
.card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(180, 140, 120, 0.08);
}

.card--spaced {
  margin-top: 10px;
}

.card--photo {
  padding: 0;
  overflow: hidden;
}

.card--rating {
  text-align: center;
  padding: 20px 16px;
}

/* ========== 表单字段 ========== */
.field-group {
  padding: 4px 0;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #b39587;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.field-label--block {
  margin-bottom: 10px;
  font-size: 14px;
}

.field-label--center {
  text-align: center;
  margin-bottom: 14px;
}

.field-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 16px;
  color: #3d2c25;
  background: transparent;
  padding: 4px 0;
}

.field-input::placeholder {
  color: #d4c4b8;
}

.field-input--date {
  color: #3d2c25;
  -webkit-appearance: none;
}

.field-textarea {
  width: 100%;
  border: none;
  outline: none;
  font-size: 15px;
  color: #3d2c25;
  background: #faf7f3;
  border-radius: 10px;
  padding: 12px;
  resize: vertical;
  min-height: 80px;
  line-height: 1.6;
  font-family: inherit;
}

.field-textarea::placeholder {
  color: #d4c4b8;
}

.field-divider {
  height: 1px;
  background: #f5ede5;
  margin: 12px 0;
}

/* ========== 做菜人卡片 ========== */
.cook-cards {
  display: flex;
  gap: 10px;
}

.cook-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 12px;
  background: #faf7f3;
  border: 1.5px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.cook-card--active {
  background: #fef0ea;
  border-color: #e8826b;
}

.cook-emoji {
  font-size: 26px;
}

.cook-name {
  font-size: 13px;
  color: #6b5a50;
  font-weight: 500;
}

.cook-card--active .cook-name {
  color: #e8826b;
  font-weight: 600;
}

/* ========== 难度卡片 ========== */
.diff-cards {
  display: flex;
  gap: 10px;
}

.diff-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 12px;
  background: #faf7f3;
  border: 1.5px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.diff-card--active {
  background: #fef0ea;
  border-color: #e8826b;
}

.diff-emoji {
  font-size: 26px;
}

.diff-name {
  font-size: 13px;
  color: #6b5a50;
  font-weight: 500;
}

.diff-card--active .diff-name {
  color: #e8826b;
  font-weight: 600;
}

/* ========== 评分 ========== */
.rating-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.rating-text {
  font-size: 13px;
  color: #f5a623;
  font-weight: 500;
}

/* ========== 照片区域 ========== */
.photo-preview {
  position: relative;
  cursor: pointer;
}

.photo-img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  display: block;
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.photo-preview:hover .photo-overlay,
.photo-preview:active .photo-overlay {
  opacity: 1;
}

.photo-change-hint {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.45);
  padding: 8px 20px;
  border-radius: 20px;
}

.photo-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
}

.photo-status {
  font-size: 12px;
  color: #b39587;
}

.photo-status--new {
  color: #e8826b;
  font-weight: 500;
}

.photo-remove-btn {
  font-size: 12px;
  color: #c9b0a2;
  background: none;
  border: 1px solid #ede3d8;
  border-radius: 14px;
  padding: 4px 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.photo-remove-btn:hover {
  color: #e8826b;
  border-color: #e8826b;
}

.photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  cursor: pointer;
  background: #fcf9f6;
  min-height: 160px;
}

.photo-empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
  opacity: 0.6;
}

.photo-empty-text {
  font-size: 14px;
  color: #b39587;
  font-weight: 500;
}

.photo-empty-sub {
  font-size: 12px;
  color: #c9b0a2;
  margin-top: 4px;
}

.hidden-uploader {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}

/* ========== 错误提示 ========== */
.error-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  margin: 0 4px 12px;
  background: #fff3f0;
  border-radius: 10px;
  color: #e8826b;
  font-size: 13px;
}

.error-icon {
  font-size: 15px;
}

/* ========== 底部占位 & 固定保存栏 ========== */
.bottom-spacer {
  height: 100px;
}

.save-bar {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(0deg, #f7ede3 0%, #f7ede3 60%, rgba(247, 237, 227, 0) 100%);
  z-index: 99;
}

.save-btn {
  border: none !important;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  height: 48px;
  border-radius: 24px !important;
  box-shadow: 0 4px 16px rgba(232, 130, 107, 0.35);
  background: linear-gradient(135deg, #f7a58f 0%, #e8826b 100%) !important;
}

.save-btn:active {
  transform: scale(0.98);
  transition: transform 0.15s;
}

/* ========== Vant 组件覆盖 ========== */
:deep(.van-rate) {
  justify-content: center;
}

:deep(.van-rate__icon) {
  margin-right: 6px;
}

:deep(.van-uploader__upload) {
  display: none;
}

:deep(.van-uploader__preview) {
  display: none;
}
</style>
