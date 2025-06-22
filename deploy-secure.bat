@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 视频项目后端安全部署脚本
echo ========================================
echo.

echo 📋 当前配置:
echo - 服务器IP: 114.55.73.26
echo - 端口: 3001
echo - 安全CORS: 启用（仅允许指定域名）
echo.

echo 📦 准备上传文件...
set SERVER_IP=114.55.73.26
set SERVER_PATH=/root/VisonProBackend

echo.
echo 🔒 安全提醒:
echo - 使用安全的CORS配置
echo - 仅允许指定域名访问
echo - 如需添加新域名，请使用: node manage-cors.js add [域名]
echo.

pause

echo 📤 上传server.js...
scp server.js root@%SERVER_IP%:%SERVER_PATH%/

echo 📤 上传CORS管理工具...
scp manage-cors.js root@%SERVER_IP%:%SERVER_PATH%/

echo 📤 上传package.json...
scp package.json root@%SERVER_IP%:%SERVER_PATH%/

echo.
echo 🔄 重启服务器...
ssh root@%SERVER_IP% "cd %SERVER_PATH% && pm2 restart video-backend || pm2 start server.js --name video-backend"

echo.
echo ✅ 部署完成！
echo.
echo 📋 后续操作:
echo 1. 测试API连接: http://114.55.73.26:3001/api/photo-categories
echo 2. 查看服务状态: ssh root@114.55.73.26 "pm2 status"
echo 3. 查看日志: ssh root@114.55.73.26 "pm2 logs video-backend"
echo 4. 管理CORS域名: ssh root@114.55.73.26 "cd /root/VisonProBackend && node manage-cors.js list"
echo.
echo 🔧 如果需要添加新域名:
echo ssh root@114.55.73.26 "cd /root/VisonProBackend && node manage-cors.js add https://your-domain.com"
echo.

pause 