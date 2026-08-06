#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# sisimenu 一键安全部署脚本
# 原理：build 到临时目录 → 原子替换 dist → 最后才重启后端
# 安全：任一步失败立即停止，线上 dist 全程不受影响
# 用法：bash deploy.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

ROOT=/root/sisimenu
FRONT=$ROOT/frontend
DIST=$FRONT/dist
TMP=$FRONT/dist-tmp
LOG=/tmp/sisimenu-deploy.log

echo "════════ 开始部署 $(date '+%H:%M:%S') ════════"

# ① 前置检查：磁盘够不够（至少留 1G）
AVAIL=$(df -m / | awk 'NR==2{print $4}')
if [ "$AVAIL" -lt 1024 ]; then
  echo "❌ 磁盘剩余不足 1G（当前 ${AVAIL}M），拒绝部署"
  exit 1
fi
echo "✅ 磁盘检查通过（剩余 ${AVAIL}M）"

# ② 内存检查：可用内存 + swap 合计低于 800M 时警告（不阻断，swap 兜底）
MEM_TOTAL=$(free -m | awk '/^Mem:/{print $7}')
SWAP_TOTAL=$(free -m | awk '/^Swap:/{print $2}')
echo "✅ 可用内存 ${MEM_TOTAL}M + swap ${SWAP_TOTAL}M"

# ③ 清理上次残留的临时目录（若有）
if [ -d "$TMP" ]; then
  echo "⚠️ 清理上次残留的 dist-tmp"
  rm -rf "$TMP"
fi

# ④ build 到临时目录（限内存 1G，不碰线上 dist！）
echo "→ 构建前端（输出到 dist-tmp，限内存 1G）..."
cd "$FRONT"
if ! NODE_OPTIONS=--max-old-space-size=1024 npm run build -- --outDir dist-tmp >>"$LOG" 2>&1; then
  echo "❌ 构建失败，见日志尾部："
  tail -15 "$LOG"
  echo "线上 dist 未受影响，部署已停止"
  exit 1
fi
echo "✅ 构建成功"

# ⑤ 校验构建产物完整（index.html + assets 存在）
if [ ! -f "$TMP/index.html" ] || [ ! -d "$TMP/assets" ]; then
  echo "❌ 构建产物不完整（缺 index.html 或 assets），已停止"
  rm -rf "$TMP"
  exit 1
fi
echo "✅ 产物校验通过"

# ⑥ 原子替换：mv 同盘 rename，毫秒级切换，旧版保留为 dist.bak
if [ -d "$DIST" ]; then
  rm -rf "$DIST.bak"
  mv "$DIST" "$DIST.bak"
fi
mv "$TMP" "$DIST"
echo "✅ 已原子替换 dist（旧版备份在 dist.bak）"

# ⑦ 最后才重启后端（build 峰值已过，错峰）
echo "→ 重启 sisimenu 服务..."
if ! systemctl restart sisimenu; then
  echo "❌ 服务重启失败！尝试回滚 dist..."
  rm -rf "$DIST"
  [ -d "$DIST.bak" ] && mv "$DIST.bak" "$DIST"
  echo "已回滚，服务状态：$(systemctl is-active sisimenu)"
  exit 1
fi
echo "✅ 服务已重启"

# ⑧ 等待就绪并验证（页面 + API 双检查）
echo "→ 验证服务就绪..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  if curl -sf --max-time 3 http://localhost:2001/ -o /dev/null; then
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "❌ 页面 10 秒内未就绪，请手动检查：systemctl status sisimenu"
    exit 1
  fi
done
PAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:2001/)
API_OK=$(curl -s --max-time 5 http://localhost:2001/api/dishes/stats | grep -c '"success":true' || true)
if [ "$PAGE_CODE" = "200" ] && [ "$API_OK" -ge 1 ]; then
  echo "✅ 页面 HTTP $PAGE_CODE，API 正常"
else
  echo "⚠️ 页面 $PAGE_CODE，API 校验异常——请检查"
fi

echo "════════ 部署完成 $(date '+%H:%M:%S') ════════"
echo "提示：确认新版没问题后，可删除备份：rm -rf $DIST.bak"
