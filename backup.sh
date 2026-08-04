#!/bin/bash
# sisimenu 数据库自动备份脚本
# 每天备份 dishes.db 到 backups/，保留最近 7 天，自动清理旧备份
set -e

BACKUP_DIR=/root/sisimenu/backups
DB_FILE=/root/sisimenu/data/dishes.db

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
cp "$DB_FILE" "$BACKUP_DIR/dishes-$STAMP.db"

# 清理 7 天前的备份（保留最近 7 份）
find "$BACKUP_DIR" -name "dishes-*.db" -mtime +7 -delete

echo "备份完成: dishes-$STAMP.db ($(du -h "$BACKUP_DIR/dishes-$STAMP.db" | cut -f1))"
