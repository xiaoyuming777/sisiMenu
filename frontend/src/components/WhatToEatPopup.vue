<template>
  <van-popup
    :show="show"
    position="center"
    transition="ep-scale"
    :style="{ width: '86vw', maxWidth: '420px', borderRadius: '28px', overflow: 'hidden' }"
    @update:show="$emit('update:show', $event)"
    :close-on-click-overlay="false"
  >
    <div class="eat-popup">
      <!-- ═══ 顶部刊头 ═══ -->
      <div class="ep-topline">
        <span class="ep-en">LUCKY DISH · 翻牌子</span>
        <button class="ep-close" @click="$emit('update:show', false)" aria-label="关闭">✕</button>
      </div>

      <!-- ═══ 标题 ═══ -->
      <div class="ep-head">
        <h3 class="ep-title">今天吃什么？</h3>
        <p class="ep-subtitle">{{ rolling ? '好运滚滚来...' : (result ? '就是它了！' : '') }}</p>
      </div>

      <!-- ═══ 抽选区 ═══ -->
      <div class="ep-stage" :class="{ 'is-result': !rolling && result }">
        <!-- 小鸡毛（魔法版）：左上角探头施法，与小白对称 -->
        <img class="ep-bear" src="/deco/bear-magic.gif" alt="" />
        <!-- 小白（像素版）：右上角探头观战 -->
        <img class="ep-ghost" src="/deco/ghost-piko.gif" alt="" />

        <div v-if="dishes.length === 0" class="ep-empty">
          <div class="ep-empty-icon"><img src="/icons/pot.svg" alt="" /></div>
          <p class="ep-empty-text">菜单还空着，先记一道菜吧</p>
        </div>

        <template v-else>
          <!-- 老虎机横向滚动轨道：轨道常驻（图片在预加载阶段就开始加载），停在哪张，哪张就是结果 -->
          <div class="ep-slot" ref="slotRef">
            <div class="ep-slot-track" :class="{ 'is-final': !rolling && result }" :style="{ transform: `translateX(${trackX}px)` }">
              <div
                v-for="d in slotList"
                :key="d.id"
                class="ep-slot-item"
                :class="{ 'is-win': !rolling && result && slotList.indexOf(d) === winIndex }"
              >
                <div class="ep-slot-img">
                  <img :src="d.photo" :alt="d.name" />
                </div>
                <div class="ep-slot-name">{{ d.name }}</div>
              </div>
            </div>
            <!-- 定格：独立居中大卡（flex 居中，任何设备必然居中；显示的就是滚动停下的那张卡） -->
            <transition name="ep-win-pop">
              <div v-if="!rolling && result" class="ep-slot-win">
                <div class="ep-slot-win-card">
                  <div class="ep-slot-img">
                    <img :src="result.photo" :alt="result.name" />
                  </div>
                  <div class="ep-slot-name">{{ result.name }}</div>
                </div>
              </div>
            </transition>
            <!-- 预加载覆盖层：图片未就绪时盖在轨道上（轨道本身已挂载，图片在后台加载） -->
            <div v-if="preloading" class="ep-slot ep-slot-preload">
              <div class="ep-preload-card"><img src="/deco/bear-magic.gif" alt="" /></div>
              <p class="ep-preload-text">洗牌中...</p>
            </div>
            <div class="ep-slot-glass"></div>
          </div>

          <!-- 定格结果 + 次数联动 -->
          <transition name="ep-pop">
            <div v-if="!rolling && result" class="ep-result">
              <div class="ep-result-tag"><img class="ic" src="/icons/star.svg" alt="" /> 今日份幸运</div>
              <div v-if="result.cookedTimes >= 2" class="ep-times-tag">老朋友啦 · 做过 {{ result.cookedTimes }} 次</div>
              <div v-else class="ep-times-tag ep-times-first">首次登场，尝个鲜</div>
            </div>
          </transition>
        </template>
      </div>

      <!-- ═══ 按钮区 ═══ -->
      <div v-if="dishes.length > 0" class="ep-actions">
        <button class="ep-btn ep-btn-ghost" @click="startRoll" :disabled="rolling">
          <img class="ic ic-bear" src="/deco/xiaobai-bear-big.gif" alt="" /> {{ rolling ? '翻牌中...' : '换一个' }}
        </button>
        <button
          class="ep-btn ep-btn-primary"
          :disabled="rolling || !result"
          @click="emitPick"
        >
          <img class="ic ic-bear" src="/deco/xiaobai-ok.gif" alt="" /> 就吃这个
        </button>
      </div>

      <p class="ep-tip">纯随机 · 翻到谁就是谁</p>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { pushPopup, popPopup, registerPopupCloser, unregisterPopupCloser } from '../utils/popupHistory'

defineOptions({ name: 'WhatToEatPopup' })

const props = defineProps({
  show: Boolean,
  dishes: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:show', 'pick'])

// ═══ 返回键关闭：今天吃什么注册为 'eat'（必须在 props 定义之后） ═══
watch(() => props.show, (val) => {
  if (val) pushPopup('eat')
  else popPopup('eat')
})
registerPopupCloser('eat', () => emit('update:show', false))
onBeforeUnmount(() => unregisterPopupCloser('eat'))

const rolling = ref(false)
const result = ref(null)
// 定格时高亮哪张卡（滚动停止后停留在窗口中央的那张）
const winIndex = ref(-1)
// 预加载中：图片就绪后才开始滚动（避免真机首开空白）
const preloading = ref(false)

// ═══ 老虎机滚动状态 ═══
const slotRef = ref(null)
const trackX = ref(0)
// 虚拟滚动：只渲染 SLOT_N 张卡（视口2张+缓冲8张），滚动时循环复用
// DOM 数量恒定 → 不卡顿（192 张卡同时渲染会卡死低端机）
const SLOT_N = 10
const slotList = ref([])
let rafId = null
let timer = null
let baseIndex = 0 // slotList[0] 对应的菜品索引
let scrollCount = 0 // 已滚过的卡数（驱动结束判定）

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function cancelRaf() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// 构建虚拟轨道：渲染 SLOT_N 张卡（从随机起点开始，取模循环）
function buildSlotList() {
  const n = props.dishes.length
  baseIndex = Math.floor(Math.random() * n)
  const list = []
  for (let i = 0; i < SLOT_N; i++) {
    list.push({ ...props.dishes[(baseIndex + i) % n] })
  }
  slotList.value = list
}

// 滚动一格：把最左的卡移到最右，轨道的"窗口"向右推进一张
function rotateSlot() {
  const n = props.dishes.length
  baseIndex = (baseIndex + 1) % n
  const next = { ...props.dishes[(baseIndex + SLOT_N - 1) % n] }
  slotList.value = [...slotList.value.slice(1), next]
}

// 预加载所有菜品图片（只加载唯一 URL，不重复）。全部就绪后开始滚动
// 注意：轨道在弹窗打开时就已挂载（图片同步在加载），这里只是"等图就绪再开滚"
function preloadAndStart() {
  if (props.dishes.length === 0) return
  // 轨道首次打开时构建挂载（图片立即开始加载）；后续打开复用，不重建（避免图片重载）
  if (slotList.value.length === 0) buildSlotList()
  const urls = [...new Set(props.dishes.map(d => d.photo))]
  // 全部已缓存/已加载 → 直接开滚
  const allReady = urls.every(u => {
    const img = new Image()
    img.src = u
    return img.complete && img.naturalWidth > 0
  })
  if (allReady) {
    startRoll()
    return
  }
  preloading.value = true
  let done = 0
  let hasError = false
  const onDone = () => {
    done++
    if (done >= urls.length || (hasError && done >= 5)) {
      preloading.value = false
      startRoll()
    }
  }
  urls.forEach(u => {
    const img = new Image()
    img.onload = onDone
    img.onerror = () => { hasError = true; onDone() }
    img.src = u
  })
  // 兜底：最多等 3 秒，防止弱网卡死
  setTimeout(() => {
    if (preloading.value) {
      preloading.value = false
      startRoll()
    }
  }, 3000)
}

// 老虎机滚动：一次到位（虚拟轨道循环复用，滚完精确停在目标卡，无二次回滚）
async function startRoll() {
  if (props.dishes.length === 0) return
  clearTimer()
  cancelRaf()
  rolling.value = true
  result.value = null
  scrollCount = 0

  // 轨道已在 preloadAndStart 构建挂载（图片已开始加载），这里不重复 build
  const itemW = 200
  // 居中不依赖 JS 测宽：CSS 已把 slotList[0] 中心对准窗口中心（left: calc(50% - 100px)）
  // 滚动中 trackX 在 [-itemW, 0] 区间循环，定格时 trackX = -itemW → slotList[1] 必然居中

  // ① 先定目标卡（滚动终点 = 这张卡居中；落在 slotList 第 1 位即居中位）
  const n = props.dishes.length
  const targetGlobal = Math.floor(Math.random() * n) // 目标菜的全局索引
  winIndex.value = 0 // 目标卡在渲染窗口中的位置（第 1 张 = CSS 定位居中位）

  // ② 预热目标卡图片：滚动 3 秒期间就把图加载/解码好，
  //    定格时 slotList[0] 换到它 src 时已就绪 → 不会停顿等图
  const winPhoto = props.dishes[targetGlobal].photo
  const preImg = new Image()
  preImg.src = winPhoto

  // ③ 计算需要滚过多少张卡：从当前 baseIndex 推进到 targetGlobal 落在第 1 位
  //    即 slotList[0] = targetGlobal → baseIndex 最终 = targetGlobal
  const targetBase = ((targetGlobal) % n + n) % n
  const distFromBase = ((targetBase - baseIndex) % n + n) % n
  // 加上 2~3 圈的过程距离（保证滚动有足够过程感）
  const circles = 2 + Math.floor(Math.random() * 2)
  const totalSteps = circles * n + distFromBase
  scrollCount = 0

  // ③ 速度曲线：加速 15% → 匀速 55% → 减速 30%（速度连续，终点=0）
  // 减速段用"距离驱动"：剩余位移精确插值，速度减到 0 时恰好停在居中位（无跳变）
  const BASE_DURATION = 2400 // ms
  const tAccel = 0.15 * BASE_DURATION
  const tCruise = 0.55 * BASE_DURATION
  const tDecel = 0.3 * BASE_DURATION
  const totalDist = totalSteps * itemW // 总位移（正数）
  // 物理位置（单调递减，不回绕）：phys = -(scrollCount*200) + posX
  // 轨道显示位置 = phys % 200（JS 负数取模 → (-200, 0]），scrollCount = floor(-phys/200)
  let phys = 0
  // 速度由总距离决定（保持总时长 ~2.4s）；每帧位移 clamp 190px（< 卡宽 200px，防跳卡重影）
  const MAX_FRAME_MOVE = 190 // px
  const Vmax = totalDist / (0.5 * tAccel + tCruise + 0.5 * tDecel) // px/ms
  const t0 = performance.now()
  let last = t0
  let v = 0
  let decelStarted = false
  let decelT0 = 0
  let decelDur = 0
  let physStart = 0
  let physTarget = 0

  const step = (now) => {
    const dt = Math.min(32, now - last) // ms（防切后台跳帧）
    last = now
    const elapsed = now - t0

    if (!decelStarted) {
      // 加速 + 匀速段
      let vTarget
      if (elapsed < tAccel) {
        vTarget = Vmax * (elapsed / tAccel) // 加速
      } else if (elapsed < tAccel + tCruise) {
        vTarget = Vmax // 匀速
      } else {
        // 进入减速段：改为距离驱动（easeOut），速度减到 0 时精确停在居中位
        decelStarted = true
        decelT0 = now
        physStart = phys
        physTarget = -totalDist // 精确终点（物理位置 = -总位移）
        // easeOutCubic 起点速度 = 3*dist/dur。物理正确时长 = 3*dist/Vmax，
        // 但限制最长 1.6s（避免剩余距离大时减速过久）：超限则提高有效减速速度（等效于 Vmax 更大）
        const dist = physStart - physTarget
        const physDecelDur = (3 * dist) / Math.max(Vmax, 0.001)
        decelDur = Math.min(physDecelDur, 1600)
        vTarget = 0
      }
      if (!decelStarted) {
        v = vTarget
        // 每帧位移 clamp：防止低速设备/掉帧时一帧跳过多张卡（重影根源）
        phys -= Math.min(v * dt, MAX_FRAME_MOVE)
      }
    }

    if (decelStarted) {
      // 减速段：easeOutCubic 位置插值（精确停在 physTarget）
      const p = Math.min(1, (now - decelT0) / decelDur)
      const ease = 1 - Math.pow(1 - p, 3)
      phys = physStart - (physStart - physTarget) * ease
      if (p >= 1) {
        // ④ 定格：物理位置精确 = 终点 → 轨道位置 = 0（slotList[0] 居中，无跳变）
        phys = physTarget
        // 关键：先完成剩余轮换，确保 slotList[0] = 抽中的菜（不能少转一次）
        const targetScroll = Math.floor(-phys / itemW)
        while (scrollCount < targetScroll) {
          scrollCount++
          rotateSlot()
        }
        trackX.value = 0
        // 双保险：轮换到位的 slotList[0] 就是目标菜；直接用目标菜兜底
        const winner = slotList.value[0]
        result.value = { ...winner }
        rolling.value = false
        return
      }
    }

    // 由物理位置推导：轨道显示位置 + 需要轮换的次数
    let pos = phys % itemW // JS 负数取模 → (-itemW, 0]
    if (pos === -0) pos = 0
    trackX.value = pos
    const targetScroll = Math.floor(-phys / itemW)
    while (scrollCount < targetScroll) {
      scrollCount++
      rotateSlot()
    }

    rafId = requestAnimationFrame(step)
  }
  rafId = requestAnimationFrame(step)
}

function emitPick() {
  if (!result.value) return
  emit('pick', result.value)
  emit('update:show', false)
}

// 打开弹窗即自动开抽（先预加载图片再滚动，避免空白）
watch(
  () => props.show,
  (v) => {
    if (v) preloadAndStart()
    else {
      clearTimer()
      cancelRaf()
    }
  }
)
</script>

<style scoped>
/* ═══════════ 奶油黄风 · 翻牌子 ═══════════ */
.eat-popup {
  background: #fffdf9;
  padding: 0 24px 22px;
  text-align: center;
}

.ic {
  width: 14px;
  height: 14px;
  vertical-align: -2px;
  display: inline-block;
}
/* 「换一个」「就吃这个」按钮上的小白熊/OK幽灵动图 */
.ic-bear {
  width: 44px;
  height: 44px;
  vertical-align: -10px;
  object-fit: contain;
}
/* 「就吃这个」按钮的OK幽灵更大 */
.ep-btn-primary .ic-bear {
  width: 50px;
  height: 50px;
}

/* ═══ 刊头 ═══ */
.ep-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 0 0;
}
.ep-en {
  font-size: 9px;
  letter-spacing: 3px;
  color: #d4b98a;
}
.ep-close {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: #fff3dd;
  color: #b08d55;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ═══ 标题 ═══ */
.ep-head {
  padding: 14px 0 18px;
}
.ep-title {
  font-size: 24px;
  font-weight: 800;
  color: #8a6d4b;
  letter-spacing: 2px;
  margin: 0;
}
.ep-subtitle {
  font-size: 11px;
  letter-spacing: 2px;
  color: #d4b98a;
  margin: 8px 0 0;
}

/* ═══ 抽选舞台 ═══ */
.ep-stage {
  position: relative;
  min-height: 300px;
}
/* 魔法小熊：左上角探头施法，与幽灵对称 */
.ep-bear {
  position: absolute;
  left: -14px;
  top: -24px;
  width: 68px;
  height: 68px;
  object-fit: contain;
  pointer-events: none;
  z-index: 3;
  filter: drop-shadow(0 4px 8px rgba(180, 120, 90, 0.18));
}
/* 像素小幽灵：右上角探头观战，俏皮点缀 */
.ep-ghost {
  position: absolute;
  right: -14px;
  top: -24px;
  width: 68px;
  height: 68px;
  object-fit: contain;
  pointer-events: none;
  z-index: 3;
  filter: drop-shadow(0 4px 8px rgba(180, 120, 90, 0.18));
}
.ep-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(255, 180, 120, 0.22);
  transition: filter 0.15s;
}
.ep-card.blur .ep-card-img img {
  filter: blur(1.5px) brightness(0.98);
}
.ep-card-img {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}
.ep-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: filter 0.15s, transform 0.15s;
}
.ep-card-name {
  padding: 14px 16px 16px;
  font-size: 18px;
  font-weight: 700;
  color: #8a6d4b;
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ═══ 老虎机横向滚动轨道 ═══ */
.ep-slot {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
  box-shadow: inset 0 0 0 2px #f0dfb8, 0 10px 30px rgba(255, 180, 120, 0.22);
}
/* 预加载占位：洗牌中的小熊动画，避免图片未就绪时空白 */
.ep-slot-preload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.ep-preload-card {
  width: 120px;
  height: 120px;
  border-radius: 20px;
  background: linear-gradient(135deg, #fff3dd 0%, #ffe8c9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ep-preload-bounce 0.9s ease-in-out infinite;
}
.ep-preload-card img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}
.ep-preload-text {
  font-size: 12px;
  letter-spacing: 3px;
  color: #d4b98a;
  margin: 0;
}
@keyframes ep-preload-bounce {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-8px) rotate(3deg); }
}
.ep-slot-track {
  /* CSS 定位居中：轨道左边缘 = 窗口中心偏左半卡宽（100px）
     即 slotList[0] 的中心永远对准窗口中心 → 定格左移 200px 后 slotList[1] 必然居中
     不依赖 JS 测宽，真机任何屏幕宽度都精确居中 */
  position: absolute;
  left: calc(50% - 100px);
  top: 0;
  display: flex;
  will-change: transform;
}
.ep-slot-item {
  flex: 0 0 200px;
  width: 200px;
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 0;
}
.ep-slot-img {
  width: 160px;
  height: 130px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(255, 180, 120, 0.18);
  /* 加载中占位：奶油色渐变，图片未就绪时显示"卡片"而非空白 */
  background: linear-gradient(135deg, #fff3dd 0%, #ffe8c9 100%);
}
.ep-slot-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ep-slot-name {
  font-size: 15px;
  font-weight: 700;
  color: #8a6d4b;
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
/* 定格状态：其他卡淡出（中奖卡由独立居中大卡 .ep-slot-win 显示） */
.ep-slot-track .ep-slot-item {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.ep-slot-track.is-final .ep-slot-item {
  opacity: 0;
}
/* 定格：独立居中大卡（flex 居中，任何设备必然居中） */
.ep-slot-win {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  pointer-events: none;
}
.ep-slot-win-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.ep-slot-win .ep-slot-img {
  width: 200px;
  height: 165px;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(255, 180, 120, 0.4);
}
.ep-slot-win .ep-slot-name {
  font-size: 17px;
}
/* 定格弹入由 .ep-slot-win-card 的 ep-win-bounce 动画负责（见下方） */
/* 玻璃遮罩：上下渐变，制造"窗口"感 */
.ep-slot-glass {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 243, 221, 0.55) 0%, transparent 22%, transparent 78%, rgba(255, 243, 221, 0.6) 100%);
}

/* ═══ 定格结果徽章 ═══ */
.ep-result {
  position: absolute;
  left: 0;
  right: 0;
  top: -14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}
.ep-result-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  padding: 6px 16px;
  border-radius: 99px;
  box-shadow: 0 4px 12px rgba(255, 180, 90, 0.45);
}
/* 次数联动徽章：老朋友（蜜桃虚线） / 首次登场（蜂蜜黄） */
.ep-times-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 99px;
  background: #fff3dd;
  border: 1px dashed #ffb6a3;
  color: #c8563a;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
}
.ep-times-first {
  background: #fff6e0;
  border: 1px dashed #ffd66b;
  color: #e8a33d;
}

.ep-pop-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ep-pop-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.85);
}

/* ═══ 空状态 ═══ */
.ep-empty {
  padding: 60px 0;
}
.ep-empty-icon {
  width: 72px;
  height: 72px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(255, 180, 120, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
}
.ep-empty-icon img {
  width: 34px;
  height: 34px;
}
.ep-empty-text {
  font-size: 13px;
  color: #c4a97a;
  letter-spacing: 1px;
  margin: 0;
}

/* ═══ 按钮区 ═══ */
.ep-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.ep-btn {
  flex: 1;
  height: 46px;
  border: none;
  border-radius: 99px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.15s, opacity 0.15s;
}
.ep-btn:active {
  transform: scale(0.96);
}
.ep-btn:disabled {
  opacity: 0.45;
  cursor: default;
  transform: none;
}
.ep-btn-ghost {
  background: #fff3dd;
  color: #b08d55;
}
.ep-btn-primary {
  background: linear-gradient(135deg, #ffd66b 0%, #ffc94d 100%);
  color: #fff;
  box-shadow: 0 6px 16px rgba(255, 180, 90, 0.4);
}

.ep-tip {
  margin: 14px 0 0;
  font-size: 10px;
  letter-spacing: 2px;
  color: #d4b98a;
}
</style>

<style>
/* ═══ 中奖卡定格弹跳（模板元素，定格时轻微回弹） ═══ */
.ep-slot-win-card {
  animation: ep-win-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both;
}
@keyframes ep-win-bounce {
  0% { transform: scale(0.7); opacity: 0.4; }
  55% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
/* ═══ 弹窗缩放动画（居中弹窗用，替换默认淡入） ═══
   注意：不能改 transform（Vant 用它做居中定位），用独立 scale 属性缩放
   顺滑减速：0.72 → 1.0，无回弹（用户反馈此版本手感最舒服） */
.ep-scale-enter-active,
.ep-scale-leave-active {
  transition: opacity 0.28s ease, scale 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.ep-scale-enter-from,
.ep-scale-leave-to {
  opacity: 0;
  scale: 0.72;
}
</style>
