<template>
  <van-popup
    :show="show"
    position="bottom"
    :style="{ height: '92%', borderRadius: '24px 24px 0 0' }"
    @update:show="$emit('update:show', $event)"
    :close-on-click-overlay="false"
  >
    <div class="form-popup">
      <!-- ═══ 顶部刊头 ═══ -->
      <div class="fp-topline">
        <span class="fp-en">RECIPE · 食谱</span>
        <span class="fp-date">{{ todayLabel }}</span>
        <button class="fp-close" @click="$emit('update:show', false)" aria-label="关闭">✕</button>
      </div>

      <!-- ═══ 标题 ═══ -->
      <div class="fp-head">
        <h3 class="fp-title">{{ mode === 'edit' ? '改一改' : '记一道菜' }}</h3>
        <p class="fp-subtitle">{{ mode === 'edit' ? '更新这道菜的信息吧' : '写下来，才记得住' }}</p>
      </div>

      <div class="fp-body" ref="bodyRef">
        <van-form @submit="onSubmit">
          <!-- 照片 -->
          <section class="fp-sec">
            <div class="fp-sec-hd">
              <span class="fp-sec-rule"></span>
              <span class="fp-sec-title"><img class="ic" src="/icons/camera.svg" alt="" /> 照片</span>
            </div>
            <div class="upload-card" :class="{ 'has-photo': previewUrl }" @click="triggerUpload">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                style="display:none"
                @change="onFileChange"
              />
              <template v-if="previewUrl">
                <img :src="previewUrl" class="upload-preview-img" @click.stop />
                <button class="upload-delete-btn" @click.stop="removePhoto" type="button">✕</button>
              </template>
              <template v-else>
                <div class="upload-placeholder">
                  <span class="upload-plus">＋</span>
                  <span class="upload-hint">拍照 / 选择照片</span>
                </div>
              </template>
            </div>
          </section>

          <!-- 基本信息 -->
          <section class="fp-sec">
            <div class="fp-sec-hd">
              <span class="fp-sec-rule"></span>
              <span class="fp-sec-title"><img class="ic" src="/icons/pencil.svg" alt="" /> 基本信息</span>
            </div>
            <div class="f-field">
              <span class="f-label">菜名</span>
              <input v-model="form.name" class="f-input" placeholder="比如：可乐鸡翅" />
            </div>
            <div class="f-field" @click="showCalendar = true">
              <span class="f-label">做菜日期</span>
              <div class="f-input f-input-link">{{ dateDisplay(form.cook_date) }}</div>
            </div>
            <div class="f-field">
              <span class="f-label">食材清单</span>
              <input v-model="form.ingredients" class="f-input" placeholder="鸡翅、可乐、姜片…" />
            </div>
          </section>

          <!-- 做菜人 -->
          <section class="fp-sec">
            <div class="fp-sec-hd">
              <span class="fp-sec-rule"></span>
              <span class="fp-sec-title"><img class="ic" src="/icons/chef.svg" alt="" /> 做菜人</span>
            </div>
            <div class="f-choices">
              <div
                v-for="c in cookOptions"
                :key="c.value"
                :class="['f-choice', { active: form.cook_by === c.value }]"
                @click="form.cook_by = c.value"
              >
                <span class="f-choice-txt">{{ c.label }}</span>
              </div>
            </div>
          </section>

          <!-- 评分与难度 -->
          <section class="fp-sec">
            <div class="fp-sec-hd">
              <span class="fp-sec-rule"></span>
              <span class="fp-sec-title"><img class="ic" src="/icons/star.svg" alt="" /> 评分与难度</span>
            </div>
            <div class="f-stars">
              <span
                v-for="n in 5"
                :key="n"
                :class="['f-star', { on: n <= form.rating }]"
                @click="form.rating = n"
              >★</span>
            </div>
            <div class="f-choices">
              <div
                v-for="d in diffOptions"
                :key="d.value"
                :class="['f-choice', { active: form.difficulty === d.value }]"
                @click="form.difficulty = d.value"
              >
                <span class="f-choice-txt">{{ d.label }}</span>
              </div>
            </div>
          </section>

          <!-- 心得 -->
          <section class="fp-sec">
            <div class="fp-sec-hd">
              <span class="fp-sec-rule"></span>
              <span class="fp-sec-title"><img class="ic" src="/icons/heart.svg" alt="" /> 心得</span>
            </div>
            <textarea
              v-model="form.note"
              class="f-textarea"
              placeholder="记录一下这道菜的故事和心得～"
              rows="3"
            ></textarea>
          </section>

          <!-- 底部留白，避免被固定按钮挡住 -->
          <div style="height: 80px"></div>
        </van-form>

        <van-calendar
          v-model:show="showCalendar"
          :min-date="minDate"
          :max-date="maxDate"
          @confirm="onCalendarConfirm"
          :title="'选择日期'"
          :confirm-text="'确定'"
        />
      </div>

      <!-- 固定在底部的提交按钮 -->
      <div class="submit-bar">
        <button class="submit-btn" @click="onSubmit" :disabled="submitting">
          {{ submitting ? (mode === 'edit' ? '保存中…' : '记录中…') : (mode === 'edit' ? '保存修改' : '记下这道菜') }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, reactive, watch, computed, nextTick } from 'vue'
import { showToast } from 'vant'

const props = defineProps({
  show: Boolean,
  mode: { type: String, default: 'add' },
  editId: { type: [String, Number], default: null },
})

const emit = defineEmits(['update:show', 'saved'])

const submitting = ref(false)
const loadingEdit = ref(false)
const fileInputRef = ref(null)
const bodyRef = ref(null)
const previewUrl = ref('')
const selectedFile = ref(null)
const showCalendar = ref(false)

const minDate = new Date(2020, 0, 1)
const maxDate = new Date()
const calendarDate = ref(new Date())

const form = reactive({
  name: '',
  cook_date: new Date().toISOString().slice(0, 10),
  cook_by: '思思',
  rating: 5,
  difficulty: '新手友好',
  ingredients: '',
  note: ''
})

const todayLabel = computed(() => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}.${m}.${day}`
})

const cookOptions = [
  { value: '思思', label: '思思' },
  { value: '小明', label: '小明' },
  { value: '一起做的', label: '一起做的' },
]

const diffOptions = [
  { value: '新手友好', label: '新手友好' },
  { value: '小有挑战', label: '小有挑战' },
  { value: '硬菜', label: '硬菜' },
]

// 打开时初始化
watch(() => props.show, async (val) => {
  if (val) {
    resetForm()
    if (props.mode === 'edit' && props.editId) {
      await loadDish(props.editId)
    }
    // 表单滚动回顶部（上次可能滚到过下面）
    await nextTick()
    if (bodyRef.value) bodyRef.value.scrollTop = 0
  }
})

function resetForm() {
  form.name = ''
  form.cook_date = new Date().toISOString().slice(0, 10)
  form.cook_by = '思思'
  form.rating = 5
  form.difficulty = '新手友好'
  form.ingredients = ''
  form.note = ''
  previewUrl.value = ''
  selectedFile.value = null
  loadingEdit.value = false
}

async function loadDish(id) {
  loadingEdit.value = true
  try {
    const res = await fetch('/api/dishes/' + id)
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
      if (d.photo) {
        previewUrl.value = d.photo
      }
    }
  } catch (e) {
    showToast('加载失败')
  } finally {
    loadingEdit.value = false
  }
}

function triggerUpload() {
  fileInputRef.value?.click()
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  // 重置 input 以便重复选同一张
  e.target.value = ''
}

function removePhoto() {
  if (previewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = ''
  selectedFile.value = null
}

function dateDisplay(dateStr) {
  if (!dateStr) return '请选择日期'
  const parts = dateStr.split('-')
  return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`
}

function onCalendarConfirm(date) {
  const d = date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  form.cook_date = `${y}-${m}-${day}`
  showCalendar.value = false
}

async function onSubmit() {
  // 手动校验必填项
  if (!form.name.trim()) {
    showToast('写个菜名嘛～')
    return
  }
  if (!selectedFile.value && !previewUrl.value) {
    showToast('记得传照片～')
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

    if (selectedFile.value) {
      fd.append('photo', selectedFile.value)
    }

    let url = '/api/dishes'
    let method = 'POST'

    if (props.mode === 'edit' && props.editId) {
      url = '/api/dishes/' + props.editId
      method = 'PUT'
    }

    const res = await fetch(url, { method, body: fd })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      showToast(err.error || '提交失败')
      return
    }
    const data = await res.json()
    if (data.success) {
      showToast(props.mode === 'edit' ? '保存成功' : '记下了 ✨')
      emit('saved')
      emit('update:show', false)
    } else {
      showToast(data.error || '提交失败')
    }
  } catch (e) {
    showToast('网络错误')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ═══ 内联图标（Iconify SVG，跟随文字颜色） ═══ */
.ic {
  width: 14px;
  height: 14px;
  vertical-align: -2px;
  display: inline-block;
}

/* ═══ 弹窗：奶油黄 ═══ */
.form-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fffbf0;
  font-family: -apple-system, 'PingFang SC', 'HarmonyOS Sans SC', 'MiSans', 'Microsoft YaHei', sans-serif;
}

/* ═══ 顶部刊头（虚线） ═══ */
.fp-topline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px 12px;
  border-bottom: 1px dashed #f0dfb8;
  flex-shrink: 0;
}
.fp-en {
  flex: 1;
  font-size: 9px;
  letter-spacing: 3px;
  color: #d4b98a;
}
.fp-date {
  font-size: 9px;
  letter-spacing: 2px;
  color: #d4b98a;
}
.fp-close {
  border: none;
  background: none;
  color: #d4b98a;
  font-size: 18px;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
  margin-left: 6px;
}

/* ═══ 标题 ═══ */
.fp-head {
  padding: 22px 24px 0;
  flex-shrink: 0;
}
.fp-title {
  font-size: 26px;
  font-weight: 800;
  color: #8a6d4b;
  letter-spacing: 2px;
  margin: 0 0 6px;
}
.fp-subtitle {
  font-size: 10px;
  letter-spacing: 3px;
  color: #d4b98a;
  margin: 0;
}

/* ═══ 滚动内容 ═══ */
.fp-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 24px 0;
}

/* ═══ 分节 ═══ */
.fp-sec {
  padding: 26px 0 0;
}
.fp-sec-hd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.fp-sec-rule {
  width: 18px;
  border-top: 1px dashed #e8c98a;
}
.fp-sec-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #a07c3a;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* ═══ 字段：小字标签 + 下划线输入 ═══ */
.f-field {
  padding: 10px 0 14px;
}
.f-label {
  display: block;
  font-size: 10px;
  letter-spacing: 3px;
  color: #d4b98a;
  margin-bottom: 8px;
}
.f-input {
  width: 100%;
  border: none;
  border-bottom: 1px dashed #ecd9ae;
  background: none;
  font-size: 16px;
  color: #6b5540;
  padding: 6px 0;
  letter-spacing: 1px;
  outline: none;
  border-radius: 0;
}
.f-input:focus {
  border-bottom-color: #ffc94d;
  border-bottom-style: solid;
}
.f-input::placeholder {
  color: #e0cda6;
}
.f-input-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  color: #6b5540;
}
.f-input-link::after {
  content: '›';
  font-size: 18px;
  color: #e0cda6;
}

/* ═══ 选择器：圆角胶囊，选中蜂蜜黄 ═══ */
.f-choices {
  display: flex;
  gap: 10px;
}
.f-choice {
  flex: 1;
  height: 40px;
  border: 1px solid #f0dfb8;
  border-radius: 99px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  user-select: none;
}
.f-choice-txt {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #b08d55;
  white-space: nowrap;
}
.f-choice.active {
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  border-color: #ffc94d;
}
.f-choice.active .f-choice-txt {
  color: #fff;
}

/* ═══ 评分：★ 字符 ═══ */
.f-stars {
  display: flex;
  gap: 10px;
  padding: 2px 0 18px;
}
.f-star {
  font-size: 26px;
  line-height: 1;
  color: #efe3c8;
  cursor: pointer;
  transition: color 0.15s, transform 0.15s;
}
.f-star.on {
  color: #e8a33d;
}
.f-star:active {
  transform: scale(0.85);
}

/* ═══ 备注：白底圆角 ═══ */
.f-textarea {
  width: 100%;
  border: 1.5px dashed #ecd9ae;
  border-radius: 16px;
  background: #fff;
  font-size: 14px;
  line-height: 1.8;
  color: #6b5540;
  padding: 12px 14px;
  letter-spacing: 1px;
  outline: none;
  resize: none;
  box-sizing: border-box;
}
.f-textarea:focus {
  border-color: #ffc94d;
  border-style: solid;
}
.f-textarea::placeholder {
  color: #e0cda6;
}

/* ═══ 照片上传：圆角虚线框 ═══ */
.upload-card {
  border: 1.5px dashed #ecd9ae;
  border-radius: 16px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  background: #fff;
}
.upload-card.has-photo {
  border: none;
}
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.upload-plus {
  font-size: 26px;
  color: #e0cda6;
  font-weight: 300;
}
.upload-hint {
  font-size: 11px;
  letter-spacing: 3px;
  color: #d4b98a;
}
.upload-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.upload-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  background: rgba(160, 124, 58, 0.6);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
}

/* ═══ 提交按钮：蜂蜜黄胶囊 ═══ */
.submit-bar {
  flex-shrink: 0;
  padding: 12px 24px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px dashed #f0dfb8;
  background: #fffbf0;
}
.submit-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  border: none;
  border-radius: 99px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 4px;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(255, 180, 90, 0.4);
  transition: opacity 0.2s, transform 0.2s;
}
.submit-btn:active {
  opacity: 0.82;
  transform: scale(0.98);
}
.submit-btn:disabled {
  opacity: 0.5;
}
</style>

<style>
/* ═══ 弹窗弹出动画（全局，因 popup 挂载在 body 下）：抽纸回弹 ═══ */
.van-popup-slide-bottom-enter-active {
  animation: paperIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both !important;
  transition: none !important;
}
.van-popup-slide-bottom-leave-active {
  transition: transform 0.25s ease-in !important;
}
.van-popup-slide-bottom-leave-to {
  transform: translate3d(0, 100%, 0) !important;
}
@keyframes paperIn {
  0% { transform: translate3d(0, 100%, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

/* ═══ PC 自适应：弹窗变居中卡片（手机端不受影响） ═══ */
@media (min-width: 768px) {
  .van-popup {
    left: 0;
    right: 0;
    margin: 0 auto;
    width: 560px;
    max-width: 92vw;
  }
}
</style>
