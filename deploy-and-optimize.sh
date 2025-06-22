#!/bin/bash

# 视频优化部署和运行脚本
# 使用方法：./deploy-and-optimize.sh

echo "🚀 开始部署和运行视频优化脚本..."

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用root权限运行此脚本"
    exit 1
fi

# 1. 检查并安装FFmpeg
echo "📦 检查FFmpeg安装状态..."
if ! command -v ffmpeg &> /dev/null; then
    echo "📥 安装FFmpeg..."
    if command -v yum &> /dev/null; then
        # CentOS/RHEL
        yum install -y epel-release
        yum install -y ffmpeg
    elif command -v apt &> /dev/null; then
        # Ubuntu/Debian
        apt update
        apt install -y ffmpeg
    else
        echo "❌ 无法识别的Linux发行版，请手动安装FFmpeg"
        exit 1
    fi
else
    echo "✅ FFmpeg已安装"
fi

# 2. 检查Node.js
echo "📦 检查Node.js安装状态..."
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装Node.js"
    exit 1
else
    echo "✅ Node.js已安装: $(node --version)"
fi

# 3. 安装项目依赖
echo "📦 安装项目依赖..."
npm install

# 4. 检查视频文件目录
VIDEO_DIR="/data/media/video"
if [ ! -d "$VIDEO_DIR" ]; then
    echo "❌ 视频目录不存在: $VIDEO_DIR"
    echo "请确保视频文件在正确的位置"
    exit 1
else
    echo "✅ 找到视频目录: $VIDEO_DIR"
    echo "📊 视频文件统计:"
    find "$VIDEO_DIR" -type f \( -name "*.mp4" -o -name "*.avi" -o -name "*.mov" -o -name "*.wmv" -o -name "*.flv" -o -name "*.webm" -o -name "*.mkv" \) | wc -l | xargs echo "   总视频文件数:"
    echo "📁 视频分类目录:"
    ls -la "$VIDEO_DIR"
fi

# 5. 检查磁盘空间
echo "💾 检查磁盘空间..."
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
REQUIRED_SPACE=10485760  # 10GB in KB
if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
    echo "⚠️  磁盘空间可能不足，建议至少预留10GB空间"
    echo "   当前可用空间: $(df -h . | tail -1 | awk '{print $4}')"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ 磁盘空间充足"
fi

# 6. 运行优化脚本
echo "🎬 开始运行视频优化脚本..."
echo "📝 日志文件: optimization.log"
echo "🔄 脚本将在后台运行，您可以断开SSH连接"

# 后台运行脚本
nohup node optimize-videos-advanced.js > optimization.log 2>&1 &
SCRIPT_PID=$!

echo "✅ 脚本已启动，进程ID: $SCRIPT_PID"
echo ""
echo "📋 监控命令:"
echo "   查看日志: tail -f optimization.log"
echo "   查看进程: ps aux | grep optimize"
echo "   停止脚本: kill $SCRIPT_PID"
echo ""
echo "⏳ 预计处理时间: 根据视频文件大小，可能需要数小时"
echo "🎯 完成后会在以下目录生成文件:"
echo "   优化视频: /data/media/optimized/"
echo "   视频缩略图: /data/media/thumbnails/"

# 显示前几行日志
echo "📄 开始显示日志输出..."
sleep 2

# 提供选择：查看日志或在后台运行
echo ""
echo "选择操作："
echo "1) 实时查看日志 (tail -f optimization.log)"
echo "2) 后台运行，稍后检查结果"
read -p "请选择 (1/2): " -n 1 -r
echo

if [[ $REPLY =~ ^[1]$ ]]; then
    echo "📄 实时显示日志（按 Ctrl+C 停止查看）："
    tail -f optimization.log
else
    echo "✅ 脚本在后台运行中..."
    echo ""
    echo "📋 有用的命令："
    echo "   查看日志: tail -f optimization.log"
    echo "   查看进程: ps aux | grep optimize"
    echo "   检查结果: node test-optimized-videos.js"
    echo "   停止脚本: kill $SCRIPT_PID"
fi 