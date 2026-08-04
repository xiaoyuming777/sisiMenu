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
        <!-- 魔法小熊：左上角探头施法（与右上角幽灵对称） -->
        <img class="ep-bear" src="/deco/bear-magic.gif" alt="" />
        <!-- 像素小幽灵：右上角探头观战 -->
        <img class="ep-ghost" src="/deco/ghost-piko.gif" alt="" />

        <div v-if="dishes.length === 0" class="ep-empty">
          <div class="ep-empty-icon"><img src="/icons/pot.svg" alt="" /></div>
          <p class="ep-empty-text">菜单还空着，先记一道菜吧</p>
        </div>

        <template v-else>
          <!-- 轮播中的卡片 -->
          <div class="ep-card" :class="{ 'blur': rolling }">
            <div class="ep-card-img">
              <img :src="current.photo" :alt="current.name" />
            </div>
            <div class="ep-card-name">{{ current.name }}</div>
          </div>

          <!-- 定格结果 -->
          <transition name="ep-pop">
            <div v-if="!rolling && result" class="ep-result">
              <div class="ep-result-tag"><img class="ic" src="/icons/star.svg" alt="" /> 今日份幸运</div>
            </div>
          </transition>
        </template>
      </div>

      <!-- ═══ 按钮区 ═══ -->
      <div v-if="dishes.length > 0" class="ep-actions">
        <button class="ep-btn ep-btn-ghost" @click="startRoll" :disabled="rolling">
          <img class="ic" src="/icons/shuffle.svg" alt="" /> {{ rolling ? '翻牌中...' : '换一个' }}
        </button>
        <button
          class="ep-btn ep-btn-primary"
          :disabled="rolling || !result"
          @click="emitPick"
        >
          <img class="ic" src="/icons/silverware.svg" alt="" /> 就吃这个
        </button>
      </div>

      <p class="ep-tip">纯随机 · 翻到谁就是谁</p>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, watch } from 'vue'

defineOptions({ name: 'WhatToEatPopup' })

const props = defineProps({
  show: Boolean,
  dishes: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:show', 'pick'])

const rolling = ref(false)
const result = ref(null)
const current = ref(null)

let timer = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

// 老虎机式轮播：间隔逐渐拉长，约 1.6s 后定格
function startRoll() {
  if (props.dishes.length === 0) return
  clearTimer()
  rolling.value = true
  result.value = null
  current.value = props.dishes[Math.floor(Math.random() * props.dishes.length)]

  let delay = 55
  const step = () => {
    if (delay >= 320) {
      // 定格
      current.value = props.dishes[Math.floor(Math.random() * props.dishes.length)]
      result.value = { ...current.value }
      rolling.value = false
      return
    }
    current.value = props.dishes[Math.floor(Math.random() * props.dishes.length)]
    delay = Math.round(delay * 1.28)
    timer = setTimeout(step, delay)
  }
  timer = setTimeout(step, delay)
}

function emitPick() {
  if (!result.value) return
  emit('pick', result.value)
  emit('update:show', false)
}

// 打开弹窗即自动开抽
watch(
  () => props.show,
  (v) => {
    if (v) startRoll()
    else clearTimer()
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
