@echo off
chcp 65001 >nul
echo 🎬 视频缩略图生成工具
echo ================================

if "%1"=="--help" goto :help
if "%1"=="-h" goto :help

echo 📍 当前目录: %CD%
echo 📂 检查Node.js环境...

node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装或不在PATH中
    echo 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js环境正常

echo 📂 检查FFmpeg环境...
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo ❌ FFmpeg未安装或不在PATH中
    echo 请先安装FFmpeg: https://ffmpeg.org/download.html
    echo 或者下载便携版本放到系统PATH中
    pause
    exit /b 1
)

echo ✅ FFmpeg环境正常

if "%1"=="--clean" (
    echo 🧹 清理无效缩略图...
    node generate-thumbnails.js --clean
    goto :end
)

if "%1"=="--category" (
    if "%2"=="" (
        echo ❌ 请指定分类名称
        echo 可用分类: activity, TVC, short_video
        pause
        exit /b 1
    )
    echo 📁 处理分类: %2
    node generate-thumbnails.js --category %2
    goto :end
)

echo 🚀 开始生成所有视频缩略图...
echo 提示: 这可能需要一些时间，请耐心等待...
echo.

node generate-thumbnails.js

:end
echo.
echo ✅ 操作完成！
echo 💡 提示: 
echo   - 缩略图保存在 /data/media/thumbnails/ 目录下
echo   - 重启后端服务以使缩略图生效
echo   - 使用 --help 查看更多选项
pause
exit /b 0

:help
echo.
echo 视频缩略图生成工具 - 帮助
echo ================================
echo.
echo 用法:
echo   generate-thumbnails.bat                    # 生成所有缩略图
echo   generate-thumbnails.bat --clean            # 清理无效缩略图
echo   generate-thumbnails.bat --category activity # 只处理指定分类
echo.
echo 选项:
echo   --clean                清理无效的缩略图
echo   --category ^<name^>      只处理指定分类 (activity, TVC, short_video)
echo   --help, -h            显示此帮助信息
echo.
echo 注意事项:
echo   1. 需要先安装Node.js和FFmpeg
echo   2. 确保视频文件存在于 /data/media/video/ 目录下
echo   3. 缩略图将生成到 /data/media/thumbnails/ 目录
echo   4. 生成后需要重启后端服务
echo.
pause
exit /b 0 