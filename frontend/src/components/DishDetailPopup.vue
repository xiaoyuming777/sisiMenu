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
          <!-- 全宽圆角大图（多图横向滑动） -->
          <div class="dp-photo" @click="previewAt(0)">
            <div v-if="dishPhotos.length > 1" class="dp-photo-scroll">
              <img v-for="(p, i) in dishPhotos" :key="p" :src="p" :alt="dish.name" @click.stop="previewAt(i)" />
            </div>
            <img v-else :src="dishPhotos[0] || dish.photo" :alt="dish.name" />
            <span v-if="dishPhotos.length > 1" class="dp-photo-count">1/{{ dishPhotos.length }}</span>
          </div>

          <!-- 标题区（双击切换编辑/删除按钮显示） -->
          <div class="dp-head" @dblclick="toggleActions">
            <h1 class="dp-name">{{ dish.name }}</h1>
            <!-- 两只 Good 小狗：标题右侧并排点赞 -->
            <span class="dp-good-group">
              <img class="dp-good" src="/deco/xiaobai-good.gif" alt="" />
              <img class="dp-good" src="/deco/xiaojimao-good.gif" alt="" />
            </span>
          </div>

          <!-- 胶囊标签组 -->
          <div class="dp-tags">
            <span class="dp-tag"><img class="ic" src="/icons/calendar.svg" alt="" /> {{ dish.cook_date }}</span>
            <span class="dp-tag"><img class="ic" src="/icons/chef.svg" alt="" /> {{ dish.cook_by }}</span>
            <span v-if="dish.difficulty" class="dp-tag"><img class="ic" :src="`/icons/${difficultyIcon(dish.difficulty)}.svg`" alt="" /> {{ dish.difficulty }}</span>
            <span v-if="dish.rating" class="dp-tag dp-tag-star">{{ starText(dish.rating) }}</span>
          </div>

          <!-- 备注心得 -->
          <section v-if="dish.note" class="dp-sec">
            <div class="dp-sec-hd">
              <span class="dp-sec-rule"></span>
              <span class="dp-sec-title"><img class="ic" src="/icons/heart.svg" alt="" /> 心得</span>
            </div>
            <p class="dp-note">{{ dish.note }}</p>
          </section>

          <!-- ═══ 评论区 ═══ -->
          <section class="dp-sec dp-comment-sec">
            <div class="dp-sec-hd">
              <span class="dp-sec-rule"></span>
              <span class="dp-sec-title"><img class="ic" src="/icons/chat.svg" alt="" /> 评论
                <span v-if="comments.length" class="cmt-count">{{ comments.length }}</span>
              </span>
            </div>

            <!-- 评论列表 -->
            <div v-if="comments.length" class="cmt-list">
              <div v-for="c in comments" :key="c.id" class="cmt-item">
                <div class="cmt-avatar">{{ avatarText(c.nickname) }}</div>
                <div class="cmt-body">
                  <div class="cmt-meta">
                    <span class="cmt-nick">{{ c.nickname }}</span>
                    <span class="cmt-time">{{ relTime(c.created_at) }}</span>
                  </div>
                  <p class="cmt-content">{{ c.content }}</p>
                </div>
              </div>
            </div>
            <p v-else class="cmt-empty">还没有评论，来抢沙发～ 🛋️</p>

            <!-- 输入区 -->
            <div class="cmt-input-row">
              <input
                v-model="cmtNick"
                class="cmt-nick-input"
                maxlength="20"
                placeholder="昵称"
                @blur="saveNick"
              />
              <input
                v-model="cmtText"
                class="cmt-text-input"
                maxlength="200"
                placeholder="说点什么…"
                @keyup.enter="submitComment"
              />
              <button class="cmt-send" :disabled="sending || !cmtText.trim()" @click="submitComment">
                发送
              </button>
            </div>
          </section>
        </template>
      </div>
      <!-- 操作：悬浮右下角（双击菜名切换显示，不随内容滚动） -->
      <transition name="dp-act-fade">
        <div v-show="showActions" class="dp-actions">
          <button class="dp-act dp-act-edit" title="编辑" aria-label="编辑" @click="openDishForm('edit', dish.id)">✏️</button>
          <button class="dp-act dp-act-del" title="删除" aria-label="删除" @click="handleDelete">🗑️</button>
        </div>
      </transition>
    </div>

    <!-- ═══ 图片全屏预览（Vant ImagePreview：滑动切换 + 双指缩放） ═══ -->
    <van-image-preview
      v-model:show="previewShow"
      :images="dishPhotos"
      :start-position="previewIndex"
      :max-zoom="4"
      closeable
      close-icon="cross"
      @change="previewIndex = $event"
    ></van-image-preview>

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
import { pushPopup, popPopup, registerPopupCloser, unregisterPopupCloser } from '../utils/popupHistory'

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
const previewIndex = ref(0)
// 编辑/删除按钮显示状态（双击标题区切换；关闭弹窗后保留）
const showActions = ref(false)
function toggleActions() {
  showActions.value = !showActions.value
}
const generating = ref(false)
const posterShow = ref(false)
const posterUrl = ref('')

// 多图：优先用 photos 数组，兼容旧数据只有 photo
const dishPhotos = computed(() => {
  if (!dish.value) return []
  if (Array.isArray(dish.value.photos) && dish.value.photos.length) return dish.value.photos
  return dish.value.photo ? [dish.value.photo] : []
})

function previewAt(idx) {
  previewIndex.value = idx
  previewShow.value = true
}

/* ═══ 图片预览：返回键支持（栈序：detail → preview，返回先关预览） ═══ */
watch(previewShow, (val) => {
  if (val) pushPopup('preview')
  else popPopup('preview')
})
registerPopupCloser('preview', () => { previewShow.value = false })
onBeforeUnmount(() => unregisterPopupCloser('preview'))

/* ═══════════════════ 评论 ═══════════════════ */
const comments = ref([])
const commentsLoading = ref(false)
const cmtNick = ref(localStorage.getItem('cmt_nick') || '')
const cmtText = ref('')
const sending = ref(false)

function saveNick() {
  const nick = cmtNick.value.trim()
  if (nick) localStorage.setItem('cmt_nick', nick.slice(0, 20))
}

function avatarText(nickname) {
  const n = (nickname || '').trim()
  return n ? n[0] : '匿'
}

function relTime(ts) {
  if (!ts) return ''
  const t = new Date(ts.replace(' ', 'T')).getTime()
  if (isNaN(t)) return ''
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return ts.slice(0, 10)
}

async function fetchComments() {
  if (!dish.value?.id) return
  commentsLoading.value = true
  try {
    const res = await fetch('/api/comments?dish_id=' + dish.value.id)
    const data = await res.json()
    if (data.success) comments.value = data.data
  } catch (e) { console.error(e) }
  finally { commentsLoading.value = false }
}

async function submitComment() {
  const text = cmtText.value.trim()
  const nick = cmtNick.value.trim().slice(0, 20) || '匿名吃货'
  if (!text || sending.value) return
  sending.value = true
  saveNick()
  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dish_id: dish.value.id, nickname: nick, content: text }),
    })
    const data = await res.json()
    if (data.success) {
      cmtText.value = ''
      comments.value.push(data.data)
      showToast({ message: '评论成功', icon: 'success', duration: 1200 })
    } else {
      showToast({ message: data.error || '发送失败', icon: 'fail' })
    }
  } catch { showToast({ message: '网络错误', icon: 'fail' }) }
  finally { sending.value = false }
}

const todayLabel = computed(() => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}.${m}.${day}`
})

function close() {
  emit('update:show', false)
}

/* ═══ 返回键逐层关闭：详情弹窗注册为 'detail' ═══ */
// 打开时压锚点（pushPopup 里 pushState），返回键先关详情
watch(() => props.show, (val) => {
  if (val) pushPopup('detail')
  else popPopup('detail')
})
// 注册关闭回调：返回键触发时调用 close()
registerPopupCloser('detail', close)
// 组件卸载时注销，避免内存泄漏/重复绑定
onBeforeUnmount(() => unregisterPopupCloser('detail'))

async function fetchDish() {
  if (!props.id) return
  loading.value = true
  try {
    const res = await fetch('/api/dishes/' + props.id)
    const data = await res.json()
    if (data.success) {
      dish.value = data.data
      fetchComments() // 换菜时同步加载评论
    } else dish.value = null
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

// 关闭时清掉旧评论，避免下次打开闪旧数据
watch(() => props.show, (v) => {
  if (v) fetchDish()
  else comments.value = []
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
  position: relative; /* 悬浮按钮定位参照 */
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

/* ═══ 大图：圆角卡片（多图横向滑动） ═══ */
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
.dp-photo-scroll {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.dp-photo-scroll::-webkit-scrollbar {
  display: none;
}
.dp-photo-scroll img {
  flex-shrink: 0;
  width: 100%;
  scroll-snap-align: start;
}
.dp-photo-count {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 3px 10px;
  border-radius: 99px;
  background: rgba(60, 40, 20, 0.55);
  color: #fff;
  font-size: 11px;
  letter-spacing: 1px;
  pointer-events: none;
}

/* ═══ 标题区 ═══ */
.dp-head {
  position: relative;
  padding: 30px 24px 0;
}
.dp-name {
  font-size: 28px;
  font-weight: 800;
  color: #8a6d4b;
  letter-spacing: 2px;
  margin: 0;
  line-height: 1.3;
  padding-right: 125px;
}
/* 两只 Good 小狗：标题右侧并排探头点赞 */
.dp-good-group {
  position: absolute;
  right: 8px;
  top: -20px;
  line-height: 0;
  pointer-events: none;
}
.dp-good {
  width: 72px;
  height: 72px;
  object-fit: contain;
  display: inline-block;
  filter: drop-shadow(0 3px 6px rgba(180, 120, 90, 0.15));
}
.dp-good + .dp-good {
  margin-left: -18px;
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

/* ═══ 评论区 ═══ */
.dp-comment-sec {
  padding-bottom: 4px;
}
.cmt-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ffd66b;
  color: #8a6d4b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  border-radius: 99px;
}
.cmt-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}
.cmt-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.cmt-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  color: #8a6d4b;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(255, 180, 90, 0.3);
}
.cmt-body {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 4px 14px 14px 14px;
  padding: 10px 14px;
  box-shadow: 0 4px 12px rgba(255, 180, 120, 0.12);
}
.cmt-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}
.cmt-nick {
  font-size: 13px;
  font-weight: 700;
  color: #a07c3a;
}
.cmt-time {
  font-size: 11px;
  color: #d4b98a;
}
.cmt-content {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #6b5540;
  word-break: break-word;
  white-space: pre-wrap;
}
.cmt-empty {
  margin: 0 0 18px;
  font-size: 13px;
  color: #d4b98a;
  letter-spacing: 1px;
  text-align: center;
  padding: 6px 0;
}
.cmt-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 99px;
  padding: 6px 6px 6px 16px;
  box-shadow: 0 4px 14px rgba(255, 180, 120, 0.14);
}
.cmt-nick-input {
  width: 64px;
  flex-shrink: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #8a6d4b;
  border-right: 1px dashed #f0d9b0;
}
.cmt-nick-input::placeholder,
.cmt-text-input::placeholder {
  color: #d4b98a;
}
.cmt-text-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #6b5540;
}
.cmt-send {
  flex-shrink: 0;
  height: 34px;
  padding: 0 18px;
  border: none;
  border-radius: 99px;
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  color: #8a6d4b;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}
.cmt-send:active {
  transform: scale(0.94);
}
.cmt-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ═══ 操作按钮：悬浮底部居中（双击菜名切换显示） ═══ */
.dp-actions {
  position: absolute;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 30;
}
.dp-act {
  width: 40px;
  height: 40px;
  border: 1.5px solid;
  border-radius: 50%;
  background: #fff;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
.dp-act:active {
  transform: scale(0.9);
}
.dp-act-edit {
  border-color: #e8a33d;
  background: #fff3dd;
  box-shadow: 0 4px 12px rgba(232, 163, 61, 0.3);
}
.dp-act-del {
  border-color: #ffb6a3;
  background: #ffe9e4;
  box-shadow: 0 4px 12px rgba(200, 86, 58, 0.25);
}

/* 悬浮入场：底部滑入 + 淡入（保持居中位移） */
.dp-act-fade-enter-active,
.dp-act-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.dp-act-fade-enter-from,
.dp-act-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(14px) scale(0.85);
}
.dp-act-fade-enter-to,
.dp-act-fade-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
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
  color: #8a6d4b;
}
</style>
