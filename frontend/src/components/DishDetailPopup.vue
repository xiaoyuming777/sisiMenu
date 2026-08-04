<template>
  <van-popup
    :show="show"
    :position="isDesktop ? 'center' : 'bottom'"
    :style="isDesktop
      ? { width: 'min(680px, 94vw)', height: 'min(760px, 88vh)', borderRadius: '24px' }
      : { height: '92%', borderRadius: '24px 24px 0 0' }"
    @update:show="$emit('update:show', $event)"
  >
    <div class="detail-popup">
      <!-- ═══ 顶部刊头 ═══ -->
      <div class="dp-topline">
        <span class="dp-en">RECIPE · 菜谱</span>
        <button class="dp-share" @click="onShare" :disabled="generating" aria-label="分享海报">↗</button>
        <span class="dp-date">{{ todayLabel }}</span>
        <button class="dp-close" @click="close" aria-label="关闭">✕</button>
      </div>

      <!-- ═══ 内容滚动区 ═══ -->
      <div class="dp-body">
        <!-- 加载中 -->
        <div v-if="loading" class="loading">翻页中...</div>

        <!-- 未找到 -->
        <div v-else-if="!dish" class="empty-state">
          <div class="empty-icon"><img src="/icons/silverware.svg" alt="" /></div>
          <div class="empty-title">没有这一页</div>
          <div class="empty-desc">这道菜好像不存在</div>
        </div>

        <!-- 内容 -->
        <template v-else>
          <!-- 全宽圆角大图 -->
          <div class="dp-photo" @click="previewShow = true">
            <img :src="dish.photo" :alt="dish.name" />
          </div>

          <!-- 标题区 -->
          <div class="dp-head">
            <h1 class="dp-name">{{ dish.name }}</h1>
          </div>

          <!-- 胶囊标签组 -->
          <div class="dp-tags">
            <span class="dp-tag"><img class="ic" src="/icons/calendar.svg" alt="" /> {{ dish.cook_date }}</span>
            <span class="dp-tag"><img class="ic" src="/icons/chef.svg" alt="" /> {{ dish.cook_by }}</span>
            <span v-if="dish.rating" class="dp-tag dp-tag-star">{{ starText(dish.rating) }}</span>
            <span v-if="dish.difficulty" class="dp-tag"><img class="ic" :src="`/icons/${difficultyIcon(dish.difficulty)}.svg`" alt="" /> {{ dish.difficulty }}</span>
          </div>

          <!-- 食材清单 -->
          <section v-if="dish.ingredients" class="dp-sec">
            <div class="dp-sec-hd">
              <span class="dp-sec-rule"></span>
              <span class="dp-sec-title"><img class="ic" src="/icons/carrot.svg" alt="" /> 食材</span>
            </div>
            <p class="dp-ingredients">{{ dish.ingredients }}</p>
          </section>

          <!-- 备注心得 -->
          <section v-if="dish.note" class="dp-sec">
            <div class="dp-sec-hd">
              <span class="dp-sec-rule"></span>
              <span class="dp-sec-title"><img class="ic" src="/icons/heart.svg" alt="" /> 心得</span>
            </div>
            <p class="dp-note">{{ dish.note }}</p>
          </section>

          <!-- 操作 -->
          <div class="dp-actions">
            <button class="dp-act dp-act-edit" @click="openDishForm('edit', dish.id)">编辑</button>
            <button class="dp-act dp-act-del" @click="handleDelete">删除</button>
          </div>
        </template>
      </div>
    </div>

    <!-- ═══ 图片全屏预览 ═══ -->
    <Teleport to="body">
      <div v-if="previewShow" class="custom-image-preview" @click="previewShow = false">
        <img :src="dish.photo" :alt="dish.name" class="preview-img" @click.stop />
        <button class="preview-close" @click="previewShow = false">✕</button>
      </div>
    </Teleport>

    <!-- ═══ 海报预览 ═══ -->
    <Teleport to="body">
      <div v-if="posterShow" class="poster-mask" @click="posterShow = false">
        <img :src="posterUrl" class="poster-img" alt="分享海报" @click.stop />
        <p class="poster-tip">长按图片可保存</p>
        <a class="poster-dl" :href="posterUrl" :download="(dish?.name || 'menu') + '.png'" @click.stop>保存图片</a>
      </div>
    </Teleport>
  </van-popup>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { showConfirmDialog, showToast } from 'vant'

const props = defineProps({
  show: { type: Boolean, default: false },
  id: { type: [Number, String], default: null },
})
const emit = defineEmits(['update:show'])

// PC（≥768px）居中弹窗，手机端底部抽屉（与项目既有断点一致）
const desktopQuery = window.matchMedia('(min-width: 768px)')
const isDesktop = ref(desktopQuery.matches)
function onDesktopChange(e) { isDesktop.value = e.matches }
onMounted(() => desktopQuery.addEventListener('change', onDesktopChange))
onBeforeUnmount(() => desktopQuery.removeEventListener('change', onDesktopChange))

const openDishForm = inject('openDishForm')
const dataVersion = inject('dataVersion', null)

const dish = ref(null)
const loading = ref(false)
const previewShow = ref(false)
const generating = ref(false)
const posterShow = ref(false)
const posterUrl = ref('')

const todayLabel = computed(() => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}.${m}.${day}`
})

function close() {
  emit('update:show', false)
}

async function fetchDish() {
  if (!props.id) return
  loading.value = true
  try {
    const res = await fetch('/api/dishes/' + props.id)
    const data = await res.json()
    if (data.success) dish.value = data.data
    else dish.value = null
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

// 打开 / 切换菜品时加载
watch(() => props.show, (v) => {
  if (v) fetchDish()
})
watch(() => props.id, () => {
  if (props.show) fetchDish()
})

// 编辑/删除后列表数据版本变化 → 详情也重新拉取（菜名/照片可能变了）
if (dataVersion) watch(dataVersion, () => {
  if (props.show && dish.value) fetchDish()
})

function starText(r) {
  const n = Math.max(1, Math.min(5, Math.round(Number(r) || 0)))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
function difficultyIcon(d) { return { '新手友好': 'sprout', '小有挑战': 'chili', '硬菜': 'crown' }[d] || '' }

async function handleDelete() {
  try {
    await showConfirmDialog({ title: '确认删除', message: `确定要删除「${dish.value.name}」吗？`, confirmButtonColor: '#c8563a' })
  } catch { return }
  try {
    const res = await fetch('/api/dishes/' + props.id, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      showToast({ message: '删除成功', icon: 'success', duration: 1500 })
      close()
      if (dataVersion) dataVersion.value++ // 通知列表刷新
    } else {
      showToast({ message: data.error || '删除失败', icon: 'fail' })
    }
  } catch { showToast({ message: '网络错误', icon: 'fail' }) }
}

/* ═══════════════════ 分享海报 ═══════════════════ */

function fmtDate(d) {
  if (!d) return ''
  return d.replace(/-/g, '.')
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// 逐字绘制支持字距（兼容性兜底）
function drawSpaced(ctx, text, x, y, spacing, align = 'left') {
  const widths = []
  let total = 0
  for (const ch of text) {
    const w = ctx.measureText(ch).width
    widths.push(w)
    total += w
  }
  total += spacing * (text.length - 1)
  let startX = x
  if (align === 'center') startX = x - total / 2
  else if (align === 'right') startX = x - total
  let cx = startX
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], cx, y)
    cx += widths[i] + spacing
  }
}

// 底色：奶油渐变
function drawPaper(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#fffdf5')
  g.addColorStop(1, '#fff7e6')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// 眉线：刊头 + 年份（虚线）
function drawTopline(ctx, W, pad) {
  ctx.fillStyle = 'rgba(212,185,138,0.85)'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText("SISI'S COOKBOOK", pad, 52)
  ctx.textAlign = 'right'
  ctx.fillText('MENU · 2026', W - pad, 52)
  ctx.strokeStyle = 'rgba(232,201,138,0.6)'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 8])
  ctx.beginPath()
  ctx.moveTo(pad, 88)
  ctx.lineTo(W - pad, 88)
  ctx.stroke()
  ctx.setLineDash([])
}

// 圆角矩形路径
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 白底圆角图卡 + 蜜桃阴影 + cover 裁剪
function drawPhotoCard(ctx, img, x, y, w, h, r) {
  ctx.save()
  ctx.shadowColor = 'rgba(255,180,120,0.35)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 14
  ctx.fillStyle = '#fff'
  roundRectPath(ctx, x, y, w, h, r)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.save()
  roundRectPath(ctx, x, y, w, h, r)
  ctx.clip()
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale
  const sh = h / scale
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
  ctx.restore()
  ctx.restore()
}

// 胶囊标签（浅黄底圆角），返回占用宽度
function drawPill(ctx, text, x, y, h) {
  ctx.font = '600 24px sans-serif'
  const tw = ctx.measureText(text).width
  const padX = 30
  const w = tw + padX * 2
  roundRectPath(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = '#fff3dd'
  ctx.fill()
  ctx.fillStyle = '#b08d55'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padX, y + h / 2 + 2)
  return w
}

// cover 居中裁剪填充
function drawPhotoCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale
  const sh = h / scale
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

// 红印章"夯！"（旋转）
function drawSeal(ctx, cx, cy, r) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(12 * Math.PI / 180)
  ctx.strokeStyle = 'rgba(200,86,58,0.45)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(200,86,58,0.72)'
  ctx.font = '700 30px "LXGW WenKai", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('夯！', 0, 2)
  ctx.restore()
}

// 逐字换行
function wrapText(ctx, text, maxWidth) {
  const lines = []
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

// 菜名自适应字号
function fitFont(ctx, text, base, maxWidth) {
  let size = base
  ctx.font = `700 ${size}px "LXGW WenKai", serif`
  while (ctx.measureText(text).width > maxWidth && size > 40) {
    size -= 4
    ctx.font = `700 ${size}px "LXGW WenKai", serif`
  }
  return size
}

// 长菜名拆行（居中位置二分）
function splitName(ctx, name, size, maxWidth) {
  ctx.font = `700 ${size}px "LXGW WenKai", serif`
  if (ctx.measureText(name).width <= maxWidth) return [name]
  const lines = []
  let cur = name
  while (ctx.measureText(cur).width > maxWidth && cur.length > 1) {
    let i = Math.ceil(cur.length / 2)
    while (ctx.measureText(cur.slice(0, i)).width > maxWidth && i > 1) i--
    if (i <= 1) break
    lines.push(cur.slice(0, i))
    cur = cur.slice(i)
  }
  if (cur) lines.push(cur)
  return lines
}

async function onShare() {
  if (!dish.value || generating.value) return
  generating.value = true
  try {
    await document.fonts.ready
    const img = await loadImage(dish.value.photo)

    // 统一竖版海报 1080x1440（可爱温馨风：圆角图卡 + 胶囊标签 + 奶油黄）
    const W = 1080
    const H = 1440
    const pad = 64
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    drawPaper(ctx, W, H)
    drawTopline(ctx, W, pad)

    // 大图：白底圆角卡片（4:3，cover 裁剪，蜜桃阴影）
    const imgY = 130
    const imgW = W - pad * 2
    const imgH = imgW * 3 / 4
    drawPhotoCard(ctx, img, pad, imgY, imgW, imgH, 24)
    const imgBottom = imgY + imgH

    // 菜名：左对齐焦糖圆体
    const maxW = imgW
    const baseSize = 76
    const size = fitFont(ctx, dish.value.name, baseSize, maxW)
    const nameLines = splitName(ctx, dish.value.name, size, maxW)
    const lineH = size * 1.3
    const nameTop = imgBottom + 96
    ctx.fillStyle = '#8a6d4b'
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    nameLines.forEach((ln, i) => {
      drawSpaced(ctx, ln, pad, nameTop + i * lineH, size * 0.12, 'left')
    })

    // 胶囊标签组：日期 / 作者 / 难度
    const pillY = nameTop + nameLines.length * lineH + 40
    const pillH = 64
    const pillGap = 20
    let px = pad
    px += drawPill(ctx, fmtDate(dish.value.cook_date), px, pillY, pillH) + pillGap
    if (dish.value.cook_by) px += drawPill(ctx, dish.value.cook_by, px, pillY, pillH) + pillGap
    if (dish.value.difficulty) drawPill(ctx, dish.value.difficulty, px, pillY, pillH)
    const pillBottom = pillY + pillH

    // 星星（按评分）
    const starY = pillBottom + 40
    ctx.fillStyle = '#e8a33d'
    ctx.font = '32px sans-serif'
    ctx.textBaseline = 'alphabetic'
    drawSpaced(ctx, '★'.repeat(Math.min(dish.value.rating || 5, 5)), pad, starY, 8, 'left')

    // 心得：白底圆角卡片 + 蜂蜜黄左边线
    if (dish.value.note) {
      ctx.font = '28px sans-serif'
      const noteLines = wrapText(ctx, dish.value.note, imgW - 68)
      const noteLH = 48
      const cardH = noteLines.length * noteLH + 44
      const cy = starY + 40
      ctx.save()
      ctx.shadowColor = 'rgba(255,180,120,0.2)'
      ctx.shadowBlur = 30
      ctx.shadowOffsetY = 10
      roundRectPath(ctx, pad, cy, imgW, cardH, 20)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.restore()
      // 左黄线
      ctx.fillStyle = '#ffd66b'
      roundRectPath(ctx, pad, cy + 18, 6, cardH - 36, 3)
      ctx.fill()
      // 文字
      ctx.fillStyle = '#8a6d4b'
      ctx.textBaseline = 'alphabetic'
      ctx.font = '28px sans-serif'
      noteLines.forEach((ln, i) => ctx.fillText(ln, pad + 34, cy + 42 + i * noteLH))
    }

    // 导出
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
    if (posterUrl.value) URL.revokeObjectURL(posterUrl.value)
    posterUrl.value = URL.createObjectURL(blob)
    posterShow.value = true
  } catch (e) {
    console.error(e)
    showToast('海报生成失败')
  } finally {
    generating.value = false
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

/* ═══ 弹窗容器 ═══ */
.detail-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fffbf0;
  font-family: -apple-system, 'PingFang SC', 'HarmonyOS Sans SC', 'MiSans', 'Microsoft YaHei', sans-serif;
}

/* ═══ 顶部刊头 ═══ */
.dp-topline {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px 13px;
  border-bottom: 1px dashed #f0dfb8;
}
.dp-en {
  flex: 1;
  font-size: 9px;
  letter-spacing: 3px;
  color: #d4b98a;
}
.dp-share {
  border: none;
  background: none;
  font-size: 16px;
  line-height: 1;
  color: #d4b98a;
  cursor: pointer;
  padding: 0 8px 0 0;
}
.dp-share:disabled {
  opacity: 0.4;
}
.dp-date {
  font-size: 9px;
  letter-spacing: 2px;
  color: #d4b98a;
}
.dp-close {
  border: none;
  background: none;
  font-size: 15px;
  line-height: 1;
  color: #d4b98a;
  cursor: pointer;
  padding: 0 2px;
}

/* ═══ 内容滚动区 ═══ */
.dp-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 30px;
}

/* ═══ 大图：圆角卡片 ═══ */
.dp-photo {
  position: relative;
  margin: 18px 22px 0;
  border-radius: 22px;
  overflow: hidden;
  cursor: zoom-in;
  box-shadow: 0 8px 24px rgba(255, 180, 120, 0.22);
}
.dp-photo img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

/* ═══ 标题区 ═══ */
.dp-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 26px 24px 0;
}
.dp-name {
  flex: 1;
  font-size: 28px;
  font-weight: 800;
  color: #8a6d4b;
  letter-spacing: 2px;
  margin: 0;
  line-height: 1.3;
}

/* 胶囊标签组 */
.dp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 24px 0;
}
.dp-tag {
  font-size: 11px;
  font-weight: 600;
  background: #fff3dd;
  color: #b08d55;
  padding: 5px 12px;
  border-radius: 99px;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dp-tag-star {
  background: #fff6e0;
  color: #e8a33d;
  letter-spacing: 2px;
}

/* ═══ 分栏 ═══ */
.dp-sec {
  padding: 30px 24px 0;
}
.dp-sec-hd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.dp-sec-rule {
  width: 18px;
  border-top: 1px dashed #e8c98a;
}
.dp-sec-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #a07c3a;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* 食材 */
.dp-ingredients {
  margin: 0;
  font-size: 15px;
  line-height: 2;
  color: #6b5540;
  letter-spacing: 1px;
}

/* 心得：白底卡片 */
.dp-note {
  margin: 0;
  padding: 16px 18px;
  background: #fff;
  border-radius: 16px;
  border-left: 3px solid #ffd66b;
  font-size: 14px;
  line-height: 1.9;
  color: #8a6d4b;
  letter-spacing: 0.5px;
  box-shadow: 0 6px 18px rgba(255, 180, 120, 0.14);
}

/* ═══ 操作按钮：可爱胶囊 ═══ */
.dp-actions {
  display: flex;
  gap: 14px;
  padding: 36px 24px 0;
}
.dp-act {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 99px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.dp-act:active {
  transform: scale(0.96);
}
.dp-act-edit {
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  box-shadow: 0 6px 16px rgba(255, 180, 90, 0.4);
}
.dp-act-del {
  background: linear-gradient(135deg, #ffb6a3 0%, #ff9e80 100%);
  box-shadow: 0 6px 16px rgba(255, 150, 120, 0.35);
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
  font-size: 18px;
  font-weight: 700;
  color: #8a6d4b;
  margin-bottom: 8px;
}
.empty-desc {
  font-size: 11px;
  letter-spacing: 2px;
  color: #c4a97a;
}

/* ═══ 海报预览 ═══ */
.poster-mask {
  position: fixed;
  inset: 0;
  background: rgba(30, 22, 16, 0.72);
  z-index: 2500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
}
.poster-img {
  max-width: 90vw;
  max-height: 76vh;
  object-fit: contain;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  background: #fffdf9;
}
.poster-tip {
  color: rgba(255, 255, 255, 0.75);
  font-size: 11px;
  letter-spacing: 4px;
  margin: 0;
}
.poster-dl {
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: #fff;
  font-size: 13px;
  letter-spacing: 4px;
  padding: 10px 32px;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.poster-dl:active {
  background: #fff;
  color: #2d241f;
}

/* ═══ 图片预览 ═══ */
.custom-image-preview {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
}
.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.preview-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: none;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
</style>
