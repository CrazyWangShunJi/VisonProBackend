#!/bin/bash

echo "🔧 修复视频问题..."

# 修复扩展名支持
echo "1. 修复扩展名支持"
node fix-video-extensions.js

# 生成缩略图
echo "2. 生成缩略图"
node generate-thumbnails.js

# 重启服务
echo "3. 重启服务"
pkill -f "node server.js" 2>/dev/null
sleep 2
nohup node server.js > server.log 2>&1 &

echo "✅ 修复完成！"
echo "🌐 访问: http://localhost:3001" 