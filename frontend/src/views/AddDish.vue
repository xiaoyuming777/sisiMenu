<template>
  <div class="add-page">
    <van-form @submit="onSubmit" class="add-form">
      <!-- ====== 成品照片 ====== -->
      <div class="section">
        <div class="section-header">
          <span class="section-icon">📸</span>
          <span class="section-title">成品照片</span>
        </div>
        <div class="upload-card" :class="{ 'has-photo': uploaderList.length }">
          <van-uploader
            v-model="uploaderList"
            :max-count="1"
            accept="image/*"
            :after-read="afterRead"
            :before-delete="beforeDelete"
            :preview-full-image="false"
          >
            <template #default>
              <div class="upload-placeholder">
                <span class="upload-emoji">📷</span>
                <span class="upload-hint">点击拍照或选择照片</span>
              </div>
            </template>
          </van-uploader>
        </div>
      </div>

      <!-- ====== 基本信息 ====== -->
      <div class="section">
        <div class="section-header">
          <span class="section-icon">📝</span>
          <span class="section-title">基本信息</span>
        </div>
        <div class="info-card">
          <van-field
            v-model="form.name"
            name="name"
            label="菜名"
            placeholder="比如：可乐鸡翅"
            :rules="[{ required: true, message: '请输入菜名～' }]"
            class="warm-field"
          />
          <van-field
            v-model="form.cook_date"
            name="cook_date"
            label="做菜日期"
            type="date"
            class="warm-field"
          />
          <van-field
            v-model="form.ingredients"
            name="ingredients"
            label="食材清单"
            placeholder="鸡翅、可乐、姜片..."
            class="warm-field"
          />
        </div>
      </div>

      <!-- ====== 做菜人 ====== -->
      <div class="section">
        <div class="section-header">
          <span class="section-icon">👨‍🍳</span>
          <span class="section-title">做菜人</span>
        </div>
        <div class="card-selectors cook-selectors">
          <div
            v-for="c in cookOptions"
            :key="c.value"
            :class="['card-option', { active: form.cook_by === c.value }]"
            @click="form.cook_by = c.value"
          >
            <span class="card-avatar">{{ c.icon }}</span>
            <span class="card-label">{{ c.label }}</span>
          </div>
        </div>
      </div>

      <!-- ====== 口味评分 & 难度 ====== -->
      <div class="section">
        <div class="section-header">
          <span class="section-icon">⭐</span>
          <span class="section-title">评分与难度</span>
        </div>
        <div class="info-card">
          <!-- 口味评分 -->
          <div class="rating-row">
            <span class="rating-label">口味评分</span>
            <van-rate v-model="form.rating" :size="28" />
          </div>
          <!-- 难度选择 -->
          <div class="difficulty-label">难度</div>
          <div class="card-selectors diff-selectors">
            <div
              v-for="d in diffOptions"
              :key="d.value"
              :class="['card-option', { active: form.difficulty === d.value }]"
              @click="form.difficulty = d.value"
            >
              <span class="card-avatar">{{ d.icon }}</span>
              <span class="card-label">{{ d.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== 备注心得 ====== -->
      <div class="section">
        <div class="section-header">
          <span class="section-icon">💭</span>
          <span class="section-title">备注心得</span>
        </div>
        <div class="info-card">
          <van-field
            v-model="form.note"
            name="note"
            type="textarea"
            placeholder="记录一下这道菜的故事和心得～"
            rows="3"
            autosize
            class="warm-field note-field"
          />
        </div>
      </div>

      <!-- ====== 提交按钮 ====== -->
      <div class="submit-bar">
        <van-button
          round
          block
          native-type="submit"
          :loading="submitting"
          loading-text="正在记录..."
          class="submit-btn"
        >
          ✨ 记下这道菜
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'

const router = useRouter()
const submitting = ref(false)
const uploaderList = ref([])
const selectedFile = ref(null)

const form = reactive({
  name: '',
  cook_date: new Date().toISOString().slice(0, 10),
  cook_by: '思思',
  rating: 5,
  difficulty: '新手友好',
  ingredients: '',
  note: ''
})

const cookOptions = [
  { value: '思思', icon: '👩‍🍳', label: '思思' },
  { value: '小明', icon: '👨‍🍳', label: '小明' },
  { value: '一起做的', icon: '💑', label: '一起' },
]

const diffOptions = [
  { value: '新手友好', icon: '🌱', label: '新手友好' },
  { value: '小有挑战', icon: '🔥', label: '小有挑战' },
  { value: '硬菜', icon: '💪', label: '硬菜' },
]

function afterRead(item) {
  // item.file is the browser File object
  selectedFile.value = item.file
  uploaderList.value = [{
    url: URL.createObjectURL(item.file),
    status: 'done',
    message: '已选择'
  }]
}

function beforeDelete() {
  selectedFile.value = null
  uploaderList.value = []
  return true
}

async function onSubmit() {
  if (!selectedFile.value) {
    showToast('请上传照片～')
    return
  }

  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('photo', selectedFile.value)
    fd.append('cook_date', form.cook_date)
    fd.append('cook_by', form.cook_by)
    fd.append('rating', form.rating)
    fd.append('difficulty', form.difficulty)
    fd.append('ingredients', form.ingredients)
    fd.append('note', form.note)

    const res = await fetch('/api/dishes', { method: 'POST', body: fd })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      showToast(errData.error || '提交失败（' + res.status + '）')
      submitting.value = false
      return
    }
    const data = await res.json()

    if (data.success) {
      showToast('提交成功')
      router.push('/')
    } else {
      showToast(data.error || '提交失败')
    }
  } catch (e) {
    console.error('新增出错:', e)
    showToast('网络错误：' + e.message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ====== 页面背景 ====== */
.add-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #fef7f0 0%, #fde8d8 40%, #fce4d0 100%);
  padding-bottom: 100px;
}

/* ====== 表单整体 ====== */
.add-form {
  padding: 16px 16px 120px;
}

/* ====== Section 区块 ====== */
.section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 10px;
}

.section-icon {
  font-size: 18px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #8b5e3c;
  letter-spacing: 0.5px;
}

/* ====== 通用卡片 ====== */
.info-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 24px;
  padding: 4px 0;
  box-shadow:
    0 4px 16px rgba(180, 120, 80, 0.08),
    0 1px 4px rgba(180, 120, 80, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

/* ====== 上传区域 ====== */
.upload-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 24px;
  padding: 28px 16px;
  box-shadow:
    0 4px 16px rgba(180, 120, 80, 0.08),
    0 1px 4px rgba(180, 120, 80, 0.06);
  border: 2px dashed #e8c4a8;
  border-radius: 24px;
  display: flex;
  justify-content: center;
  transition: border-color 0.3s;
}

.upload-card.has-photo {
  border-style: solid;
  border-color: #e8826b;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.upload-emoji {
  font-size: 42px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.06));
}

.upload-hint {
  font-size: 14px;
  color: #b08a6a;
  letter-spacing: 0.3px;
}

/* ====== 字段样式 ====== */
:deep(.warm-field) {
  background: transparent;
  border-radius: 0;
}

:deep(.warm-field .van-field__label) {
  color: #8b5e3c;
  font-weight: 500;
  width: 5em;
}

:deep(.warm-field .van-field__value) {
  color: #5c3d2e;
}

:deep(.warm-field .van-field__control) {
  color: #5c3d2e;
}

:deep(.warm-field .van-field__control::placeholder) {
  color: #c9a98a;
}

:deep(.note-field .van-field__control) {
  min-height: 80px;
}

/* ====== 卡片选择器（做菜人/难度） ====== */
.card-selectors {
  display: flex;
  gap: 10px;
}
.card-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(180, 120, 80, 0.05);
  cursor: pointer;
  transition: all 0.25s ease;
}
.card-option.active {
  border-color: #e8826b;
  background: #fff5f0;
  box-shadow: 0 2px 12px rgba(232, 130, 107, 0.2);
}
.card-avatar {
  font-size: 32px;
}
.card-label {
  font-size: 13px;
  font-weight: 500;
  color: #a08060;
}
.card-option.active .card-label {
  color: #e8826b;
  font-weight: 700;
}
.cook-selectors {
  padding: 0 4px;
}
.diff-selectors {
  padding: 0 12px 16px;
}
.diff-selectors .card-option {
  padding: 12px 4px;
}
.diff-selectors .card-avatar {
  font-size: 24px;
}
.diff-selectors .card-label {
  font-size: 12px;
}

/* ====== 评分区 ====== */
.rating-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px 16px;
}

.rating-label {
  font-size: 14px;
  font-weight: 500;
  color: #8b5e3c;
}
.difficulty-label {
  font-size: 13px;
  font-weight: 500;
  color: #8b5e3c;
  padding: 8px 16px 10px;
}

/* ====== 提交按钮 ====== */
.submit-bar {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  padding: 12px 16px 12px;
  background: linear-gradient(0deg, #fef7f0 0%, #fef7f0 60%, transparent 100%);
  z-index: 99;
}

.submit-btn {
  height: 50px;
  border-radius: 25px !important;
  background: linear-gradient(135deg, #e8826b 0%, #f0a28b 100%) !important;
  border: none !important;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  box-shadow: 0 4px 16px rgba(232, 130, 107, 0.35);
  transition: all 0.3s ease;
}

.submit-btn:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(232, 130, 107, 0.25);
}

:deep(.submit-btn .van-button__text) {
  color: #fff;
}

:deep(.submit-btn .van-loading__spinner) {
  color: #fff;
}

/* ====== 上传器覆盖 ====== */
:deep(.upload-card .van-uploader__wrapper) {
  width: 100%;
}

:deep(.upload-card .van-uploader) {
  width: 100%;
}

:deep(.upload-card .van-uploader__upload) {
  width: 100%;
  margin: 0;
  background: transparent;
  border: none;
}

:deep(.upload-card .van-uploader__preview) {
  margin: 0 auto;
}

:deep(.upload-card .van-uploader__preview-image) {
  border-radius: 16px;
  max-height: 220px;
  object-fit: cover;
}

/* ====== van-radio-group 水平布局修正 ====== */
:deep(.van-radio-group--horizontal) {
  flex-wrap: nowrap;
}

/* ====== 全局 van-cell 内边距微调 ====== */
:deep(.info-card .van-cell) {
  background: transparent;
}

:deep(.info-card .van-cell::after) {
  border-color: rgba(180, 120, 80, 0.08);
}

:deep(.info-card .van-cell:last-child::after) {
  border-bottom: none;
}
</style>
