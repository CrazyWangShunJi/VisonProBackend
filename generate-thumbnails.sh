#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎬 视频缩略图生成工具${NC}"
echo "================================"

# 帮助信息
show_help() {
    echo
    echo "视频缩略图生成工具 - 帮助"
    echo "================================"
    echo
    echo "用法:"
    echo "  ./generate-thumbnails.sh                    # 生成所有缩略图"
    echo "  ./generate-thumbnails.sh --clean            # 清理无效缩略图"
    echo "  ./generate-thumbnails.sh --category activity # 只处理指定分类"
    echo
    echo "选项:"
    echo "  --clean                清理无效的缩略图"
    echo "  --category <name>      只处理指定分类 (activity, TVC, short_video)"
    echo "  --help, -h            显示此帮助信息"
    echo
    echo "注意事项:"
    echo "  1. 需要先安装Node.js和FFmpeg"
    echo "  2. 确保视频文件存在于 /data/media/video/ 目录下"
    echo "  3. 缩略图将生成到 /data/media/thumbnails/ 目录"
    echo "  4. 生成后需要重启后端服务"
    echo
}

# 检查帮助参数
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

echo -e "${BLUE}📍 当前目录:${NC} $(pwd)"
echo -e "${BLUE}📂 检查Node.js环境...${NC}"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js未安装或不在PATH中${NC}"
    echo "请先安装Node.js:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
    echo "  CentOS/RHEL: sudo yum install nodejs npm"
    echo "  或访问: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js环境正常${NC}"
echo "Node.js版本: $(node --version)"

echo -e "${BLUE}📂 检查FFmpeg环境...${NC}"

# 检查FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}❌ FFmpeg未安装或不在PATH中${NC}"
    echo "请先安装FFmpeg:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install ffmpeg"
    echo "  CentOS/RHEL: sudo yum install ffmpeg"
    echo "  或使用snap: sudo snap install ffmpeg"
    exit 1
fi

echo -e "${GREEN}✅ FFmpeg环境正常${NC}"
echo "FFmpeg版本: $(ffmpeg -version 2>&1 | head -n1)"

# 处理命令行参数
if [[ "$1" == "--clean" ]]; then
    echo -e "${YELLOW}🧹 清理无效缩略图...${NC}"
    node generate-thumbnails.js --clean
    exit_code=$?
elif [[ "$1" == "--category" ]]; then
    if [[ -z "$2" ]]; then
        echo -e "${RED}❌ 请指定分类名称${NC}"
        echo "可用分类: activity, TVC, short_video"
        exit 1
    fi
    echo -e "${BLUE}📁 处理分类: $2${NC}"
    node generate-thumbnails.js --category "$2"
    exit_code=$?
else
    echo -e "${BLUE}🚀 开始生成所有视频缩略图...${NC}"
    echo -e "${YELLOW}提示: 这可能需要一些时间，请耐心等待...${NC}"
    echo
    
    node generate-thumbnails.js
    exit_code=$?
fi

echo
if [[ $exit_code -eq 0 ]]; then
    echo -e "${GREEN}✅ 操作完成！${NC}"
else
    echo -e "${RED}❌ 操作失败，退出码: $exit_code${NC}"
fi

echo -e "${BLUE}💡 提示:${NC}"
echo "  - 缩略图保存在 /data/media/thumbnails/ 目录下"
echo "  - 重启后端服务以使缩略图生效: pm2 restart server"
echo "  - 使用 --help 查看更多选项"

exit $exit_code 