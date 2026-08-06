/**
 * popupHistory.js —— 安卓返回键逐层关闭弹窗
 *
 * 原理：
 *   1. 弹窗打开时，向浏览器历史压一条"锚点记录"（history.pushState），
 *      这样安卓返回键会触发 popstate 事件（而不是直接退出页面）。
 *   2. 全局监听 popstate：如果弹窗栈非空，说明用户想关弹窗——
 *      关闭最上层弹窗，并立即用 pushState 把历史指针"补回"到锚点位置，
 *      防止用户再按一次返回就真的退出页面。
 *   3. 弹窗栈为空时放行，返回键正常后退/退出。
 *
 * 为什么不用 Vant 的 close-on-popstate：
 *   Vant 的实现是"每个弹窗各自监听 popstate"，多个弹窗叠加时一次返回会
 *   全部关闭（实测 bug）。本方案用单一栈管理，一次返回只关最上层。
 */

// 弹窗栈：记录当前打开的弹窗 id（后进先出，栈顶 = 最上层弹窗）
const popupStack = []

// 是否已绑定全局 popstate 监听（只绑一次）
let bound = false

/** 弹窗打开时调用：压一条历史锚点 + 入栈 */
export function pushPopup(id) {
  // 压锚点：URL 不变（replace 成当前地址 + 标记），让返回键触发 popstate
  // 用 pushState 追加一条记录，这样按返回时浏览器才会派发 popstate
  history.pushState({ __popupAnchor: true, id }, '')
  // 同一 id 不重复入栈（防御：避免同一弹窗被 push 两次）
  if (!popupStack.includes(id)) {
    popupStack.push(id)
  }
  bindListener()
}

/** 弹窗关闭时调用：出栈 */
export function popPopup(id) {
  const idx = popupStack.indexOf(id)
  if (idx !== -1) popupStack.splice(idx, 1)
}

/** 当前是否有弹窗打开 */
export function hasPopup() {
  return popupStack.length > 0
}

/** 全局 popstate 监听：返回键触发时逐层关弹窗 */
function bindListener() {
  if (bound) return
  bound = true

  window.addEventListener('popstate', (event) => {
    // 栈空 → 放行（让浏览器正常后退/退出页面）
    if (popupStack.length === 0) return

    // 栈非空 → 拦截这次"后退"，改为关闭最上层弹窗
    const topId = popupStack[popupStack.length - 1]
    popPopup(topId)

    // 用 replaceState 替换当前记录为锚点（不新增历史条目）：
    // popstate 已让历史指针回退，replaceState 把当前这条记录变成锚点，
    // 下次按返回仍触发 popstate（关下一层弹窗），且历史长度不膨胀。
    // 不用 pushState —— 安卓 WebView 在 popstate 处理器里 pushState 不可靠。
    history.replaceState({ __popupAnchor: true, id: topId }, '')

    // 通知对应的弹窗组件关闭（组件在 popupHistory 里注册自己的关闭回调）
    const closer = closerMap.get(topId)
    if (closer) closer()
  })
}

// 注册表：id → 关闭回调（组件在 setup 里注册，卸载时注销）
const closerMap = new Map()

/** 组件注册自己的关闭方法（onMounted 时调用） */
export function registerPopupCloser(id, closeFn) {
  closerMap.set(id, closeFn)
}

/** 组件卸载时注销（onUnmounted 时调用） */
export function unregisterPopupCloser(id) {
  closerMap.delete(id)
}
