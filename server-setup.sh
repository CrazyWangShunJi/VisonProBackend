#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔧 服务器环境配置和缩略图生成${NC}"
echo "========================================"

echo -e "${BLUE}📍 当前目录:${NC} $(pwd)"
echo -e "${BLUE}⏰ 开始时间:${NC} $(date)"
echo

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️ 建议使用root用户运行此脚本以安装系统依赖${NC}"
fi

# 步骤1：检查并安装Node.js
echo -e "${BLUE}📦 步骤1：检查Node.js环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}📥 安装Node.js...${NC}"
    
    # 检测系统类型
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu系统
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL系统
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    else
        echo -e "${RED}❌ 无法识别系统类型，请手动安装Node.js${NC}"
        exit 1
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Node.js安装失败${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Node.js已安装${NC}"
fi

echo "Node.js版本: $(node --version)"
echo "NPM版本: $(npm --version)"

# 步骤2：检查并安装FFmpeg
echo
echo -e "${BLUE}📦 步骤2：检查FFmpeg环境...${NC}"
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}📥 安装FFmpeg...${NC}"
    
    # 检测系统类型并安装FFmpeg
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu系统
        sudo apt update
        sudo apt install -y ffmpeg
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL系统
        sudo yum install -y epel-release
        sudo yum install -y ffmpeg
    else
        echo -e "${RED}❌ 无法识别系统类型，请手动安装FFmpeg${NC}"
        exit 1
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ FFmpeg安装失败${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ FFmpeg已安装${NC}"
fi

echo "FFmpeg版本: $(ffmpeg -version 2>&1 | head -n1)"

# 步骤3：安装Node.js依赖
echo
echo -e "${BLUE}📦 步骤3：安装Node.js依赖...${NC}"
if [ -f "package.json" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Node.js依赖安装失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js依赖安装完成${NC}"
else
    echo -e "${YELLOW}⚠️ 未找到package.json文件${NC}"
fi

# 步骤4：创建必要目录
echo
echo -e "${BLUE}📁 步骤4：创建媒体目录...${NC}"
sudo mkdir -p /data/media/video/{activity,TVC,short_video}
sudo mkdir -p /data/media/thumbnails/{activity,TVC,short_video}
sudo mkdir -p /data/media/optimized/{activity,TVC,short_video}
sudo mkdir -p /data/www/html

# 设置目录权限
sudo chown -R $(whoami):$(whoami) /data/media/
sudo chmod -R 755 /data/media/

echo -e "${GREEN}✅ 媒体目录创建完成${NC}"

# 步骤5：生成视频缩略图
echo
echo -e "${BLUE}🎬 步骤5：生成视频缩略图...${NC}"

# 给脚本执行权限
chmod +x generate-thumbnails.sh

# 检查是否有视频文件
video_count=$(find /data/media/video -name "*.mp4" -o -name "*.avi" -o -name "*.mov" -o -name "*.wmv" -o -name "*.flv" -o -name "*.webm" -o -name "*.mkv" -o -name "*.m4v" 2>/dev/null | wc -l)

if [ $video_count -eq 0 ]; then
    echo -e "${YELLOW}⚠️ 未找到视频文件，跳过缩略图生成${NC}"
    echo "请将视频文件放置在 /data/media/video/ 目录下，然后运行："
    echo "./generate-thumbnails.sh"
else
    echo -e "${GREEN}发现 $video_count 个视频文件${NC}"
    echo -e "${YELLOW}开始生成缩略图...${NC}"
    
    ./generate-thumbnails.sh
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 缩略图生成完成${NC}"
    else
        echo -e "${YELLOW}⚠️ 缩略图生成出现问题${NC}"
    fi
fi

# 步骤6：检查并启动服务
echo
echo -e "${BLUE}🚀 步骤6：检查服务状态...${NC}"

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📥 安装PM2进程管理器...${NC}"
    npm install -g pm2
fi

# 检查服务是否运行
if pm2 list | grep -q "server"; then
    echo -e "${YELLOW}🔄 重启现有服务...${NC}"
    pm2 restart server
else
    if [ -f "server.js" ]; then
        echo -e "${YELLOW}🚀 启动新服务...${NC}"
        pm2 start server.js --name server
    else
        echo -e "${YELLOW}⚠️ 未找到server.js文件${NC}"
    fi
fi

# 步骤7：运行性能监控
echo
echo -e "${BLUE}📊 步骤7：运行性能监控...${NC}"
if [ -f "monitor-performance.js" ]; then
    timeout 10 node monitor-performance.js
else
    echo -e "${YELLOW}⚠️ 未找到monitor-performance.js文件${NC}"
fi

# 完成总结
echo
echo -e "${PURPLE}🎉 服务器配置完成！${NC}"
echo "========================================"
echo -e "${BLUE}📊 配置摘要:${NC}"
echo -e "  ${GREEN}✅ Node.js环境已配置${NC}"
echo -e "  ${GREEN}✅ FFmpeg已安装${NC}"
echo -e "  ${GREEN}✅ 媒体目录已创建${NC}"
if [ $video_count -gt 0 ]; then
    echo -e "  ${GREEN}✅ 视频缩略图已生成${NC}"
else
    echo -e "  ${YELLOW}⚠️ 等待视频文件上传${NC}"
fi
echo -e "  ${GREEN}✅ 服务已启动${NC}"

echo
echo -e "${BLUE}💡 有用的命令:${NC}"
echo "  查看服务状态: pm2 status"
echo "  查看服务日志: pm2 logs server"
echo "  重启服务: pm2 restart server"
echo "  生成缩略图: ./generate-thumbnails.sh"
echo "  性能监控: node monitor-performance.js"

echo
echo -e "${BLUE}📁 重要目录:${NC}"
echo "  视频文件: /data/media/video/"
echo "  缩略图: /data/media/thumbnails/"
echo "  优化视频: /data/media/optimized/"
echo "  网站文件: /data/www/html/"

echo
echo -e "${BLUE}⏰ 完成时间:${NC} $(date)" 