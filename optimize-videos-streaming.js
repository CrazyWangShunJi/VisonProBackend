#!/usr/bin/env node

/**
 * 流媒体优化视频压缩脚本
 * 专门针对网络播放进行优化，解决卡顿问题
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置 - 服务器实际路径
const VIDEO_PATH = '/data/media/video';
const OUTPUT_PATH = '/data/media/optimized';
const THUMBNAIL_PATH = '/data/media/thumbnails';

// 针对网络流播放的优化配置 - 支持横屏和竖屏自适应
const STREAMING_PRESETS = {
  '240p': {
    height: 240,  // 只指定高度，保持原始宽高比
    videoBitrate: '300k',
    audioBitrate: '64k',
    crf: 28,
    preset: 'fast',
    bufsize: '600k',
    maxrate: '400k',
    gop: 60,  // 2秒GOP，便于seek
    suffix: '_240p'
  },
  '360p': {
    height: 360,  // 只指定高度，保持原始宽高比
    videoBitrate: '600k',
    audioBitrate: '96k',
    crf: 26,
    preset: 'fast',
    bufsize: '1200k',
    maxrate: '800k',
    gop: 60,
    suffix: '_360p'
  },
  '480p': {
    height: 480,  // 只指定高度，保持原始宽高比
    videoBitrate: '1000k',
    audioBitrate: '128k',
    crf: 24,
    preset: 'medium',
    bufsize: '2000k',
    maxrate: '1200k',
    gop: 60,
    suffix: '_480p'
  }
};

// 计算自适应分辨率（保持宽高比）
function calculateAdaptiveResolution(originalWidth, originalHeight, targetHeight) {
  const aspectRatio = originalWidth / originalHeight;
  const targetWidth = Math.round(targetHeight * aspectRatio);
  
  // 确保宽度是偶数（视频编码要求）
  const adjustedWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
  
  return `${adjustedWidth}x${targetHeight}`;
}

// 检测视频方向
function detectVideoOrientation(width, height) {
  const aspectRatio = width / height;
  if (aspectRatio > 1.2) {
    return 'landscape'; // 横屏
  } else if (aspectRatio < 0.8) {
    return 'portrait';  // 竖屏
  } else {
    return 'square';    // 正方形
  }
}

// 检查 ffmpeg 是否安装
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// 创建目录
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 创建目录: ${dirPath}`);
  }
}

// 获取视频信息
function getVideoInfo(videoPath) {
  try {
    const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    const output = execSync(cmd, { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    console.error(`❌ 获取视频信息失败: ${videoPath}`, error.message);
    return null;
  }
}

// 优化的视频压缩 - 专门针对网络流播放，支持横竖屏自适应
function compressVideoForStreaming(inputPath, outputPath, preset, originalWidth, originalHeight) {
  try {
    const { height, videoBitrate, audioBitrate, crf, preset: ffmpegPreset, bufsize, maxrate, gop } = preset;
    
    // 计算自适应分辨率（保持原始宽高比）
    const adaptiveResolution = calculateAdaptiveResolution(originalWidth, originalHeight, height);
    const orientation = detectVideoOrientation(originalWidth, originalHeight);
    
    // 构建FFmpeg命令 - 重点优化网络播放
    const cmd = `ffmpeg -i "${inputPath}" ` +
      // 视频编码设置
      `-c:v libx264 ` +
      `-preset ${ffmpegPreset} ` +
      `-crf ${crf} ` +
      `-vf scale=${adaptiveResolution}:flags=lanczos ` +
      // 码率控制 - 关键！
      `-b:v ${videoBitrate} ` +
      `-maxrate ${maxrate} ` +
      `-bufsize ${bufsize} ` +
      // GOP设置 - 便于网络传输和seek
      `-g ${gop} ` +
      `-keyint_min ${gop} ` +
      `-sc_threshold 0 ` +
      // 音频编码
      `-c:a aac ` +
      `-b:a ${audioBitrate} ` +
      `-ar 44100 ` +
      `-ac 2 ` +
      // 关键优化 - 网络播放
      `-movflags +faststart ` +     // moov原子前置
      `-fflags +genpts ` +          // 生成PTS
      `-avoid_negative_ts make_zero ` +  // 避免负时间戳
      // 像素格式
      `-pix_fmt yuv420p ` +
      // 其他优化
      `-threads 0 ` +               // 使用所有CPU核心
      `-tune film ` +               // 针对电影内容优化
      // 输出
      `-y "${outputPath}"`;
    
    console.log(`🔄 压缩视频: ${path.basename(inputPath)} -> ${adaptiveResolution} (${orientation})`);
    console.log(`📊 参数: 视频=${videoBitrate}, 音频=${audioBitrate}, CRF=${crf}, GOP=${gop}`);
    
    execSync(cmd, { stdio: 'inherit' });
    
    const inputSize = fs.statSync(inputPath).size;
    const outputSize = fs.statSync(outputPath).size;
    const compressionRatio = ((inputSize - outputSize) / inputSize * 100).toFixed(1);
    
    console.log(`✅ 压缩完成: 节省 ${compressionRatio}% 空间`);
    console.log(`📦 输出大小: ${(outputSize / 1024 / 1024).toFixed(2)}MB`);
    
    return { success: true, inputSize, outputSize, compressionRatio };
  } catch (error) {
    console.error(`❌ 压缩视频失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 生成优化的缩略图 - 支持横竖屏自适应
function generateOptimizedThumbnail(inputPath, outputPath, originalWidth, originalHeight) {
  try {
    // 计算缩略图尺寸（保持宽高比，最大边320px）
    const maxSize = 320;
    let thumbWidth, thumbHeight;
    
    if (originalWidth > originalHeight) {
      // 横屏视频
      thumbWidth = maxSize;
      thumbHeight = Math.round(maxSize * (originalHeight / originalWidth));
    } else {
      // 竖屏视频
      thumbHeight = maxSize;
      thumbWidth = Math.round(maxSize * (originalWidth / originalHeight));
    }
    
    // 确保尺寸是偶数
    thumbWidth = thumbWidth % 2 === 0 ? thumbWidth : thumbWidth + 1;
    thumbHeight = thumbHeight % 2 === 0 ? thumbHeight : thumbHeight + 1;
    
    const orientation = detectVideoOrientation(originalWidth, originalHeight);
    
    // 生成3个时间点的缩略图，选择最清晰的
    const timePoints = ['00:00:01.000', '00:00:03.000', '00:00:05.000'];
    const tempThumbs = [];
    
    for (let i = 0; i < timePoints.length; i++) {
      const tempPath = outputPath.replace('.jpg', `_temp${i}.jpg`);
      const cmd = `ffmpeg -i "${inputPath}" -ss ${timePoints[i]} -vframes 1 ` +
        `-vf scale=${thumbWidth}:${thumbHeight}:flags=lanczos ` +
        `-q:v 2 -y "${tempPath}"`;
      
      try {
        execSync(cmd, { stdio: 'ignore' });
        tempThumbs.push(tempPath);
      } catch (err) {
        // 如果某个时间点失败，继续下一个
        continue;
      }
    }
    
    if (tempThumbs.length > 0) {
      // 选择文件大小最大的（通常最清晰）
      let bestThumb = tempThumbs[0];
      let maxSize = fs.statSync(bestThumb).size;
      
      for (const thumb of tempThumbs) {
        const size = fs.statSync(thumb).size;
        if (size > maxSize) {
          maxSize = size;
          bestThumb = thumb;
        }
      }
      
      // 复制最佳缩略图
      fs.copyFileSync(bestThumb, outputPath);
      
      // 清理临时文件
      tempThumbs.forEach(thumb => {
        try {
          fs.unlinkSync(thumb);
        } catch (err) {
          // 忽略清理错误
        }
      });
      
      console.log(`🖼️  生成缩略图: ${path.basename(outputPath)} (${thumbWidth}x${thumbHeight}, ${orientation})`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 生成缩略图失败: ${error.message}`);
    return false;
  }
}

// 处理单个视频文件
function processVideoForStreaming(videoPath, category) {
  const videoInfo = getVideoInfo(videoPath);
  if (!videoInfo) return;
  
  const fileName = path.basename(videoPath, path.extname(videoPath));
  const fileExt = path.extname(videoPath);
  
  console.log(`\n📹 处理流媒体视频: ${fileName}${fileExt}`);
  
  // 获取原始分辨率
  const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
  const originalWidth = videoStream.width;
  const originalHeight = videoStream.height;
  const originalSize = fs.statSync(videoPath).size;
  
  const orientation = detectVideoOrientation(originalWidth, originalHeight);
  console.log(`📊 原始信息: ${originalWidth}x${originalHeight}, ${(originalSize / 1024 / 1024).toFixed(2)}MB (${orientation})`);
  
  // 创建输出目录
  const categoryOutputPath = path.join(OUTPUT_PATH, category);
  const categoryThumbnailPath = path.join(THUMBNAIL_PATH, category);
  ensureDir(categoryOutputPath);
  ensureDir(categoryThumbnailPath);
  
  // 生成缩略图
  const thumbnailPath = path.join(categoryThumbnailPath, `${fileName}.jpg`);
  generateOptimizedThumbnail(videoPath, thumbnailPath, originalWidth, originalHeight);
  
  // 智能选择要生成的质量版本
  const presetsToGenerate = [];
  
  // 根据原始分辨率和文件大小决定
  if (originalHeight >= 720 || originalSize > 100 * 1024 * 1024) {
    presetsToGenerate.push('480p', '360p', '240p');
  } else if (originalHeight >= 480 || originalSize > 50 * 1024 * 1024) {
    presetsToGenerate.push('360p', '240p');
  } else {
    presetsToGenerate.push('240p');
  }
  
  // 总是生成360p作为默认版本（网络友好）
  if (!presetsToGenerate.includes('360p')) {
    presetsToGenerate.unshift('360p');
  }
  
  console.log(`🎯 将生成质量: ${presetsToGenerate.join(', ')}`);
  
  // 生成不同质量版本
  for (const presetName of presetsToGenerate) {
    const preset = STREAMING_PRESETS[presetName];
    const outputFileName = `${fileName}${preset.suffix}${fileExt}`;
    const outputPath = path.join(categoryOutputPath, outputFileName);
    
    if (!fs.existsSync(outputPath)) {
      const result = compressVideoForStreaming(videoPath, outputPath, preset, originalWidth, originalHeight);
      if (result.success) {
        console.log(`💾 保存: ${outputFileName}`);
      }
    } else {
      console.log(`⏭️  跳过已存在: ${outputFileName}`);
    }
  }
}

// 扫描并处理所有视频
function processAllVideosForStreaming() {
  if (!fs.existsSync(VIDEO_PATH)) {
    console.log('❌ 视频目录不存在:', VIDEO_PATH);
    return;
  }
  
  const categories = fs.readdirSync(VIDEO_PATH);
  
  for (const category of categories) {
    const categoryPath = path.join(VIDEO_PATH, category);
    
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    
    console.log(`\n📂 处理分类: ${category}`);
    
    const files = fs.readdirSync(categoryPath);
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
    });
    
    console.log(`📹 找到 ${videoFiles.length} 个视频文件`);
    
    for (const videoFile of videoFiles) {
      const videoPath = path.join(categoryPath, videoFile);
      processVideoForStreaming(videoPath, category);
    }
  }
}

// 生成性能报告
function generateStreamingReport() {
  console.log('\n📊 流媒体优化报告');
  console.log('================================');
  
  const categories = ['activity', 'TVC', 'short_video'];
  let totalOriginal = 0;
  let totalOptimized = 0;
  let fileCount = 0;
  
  for (const category of categories) {
    const originalPath = path.join(VIDEO_PATH, category);
    const optimizedPath = path.join(OUTPUT_PATH, category);
    
    if (!fs.existsSync(originalPath) || !fs.existsSync(optimizedPath)) continue;
    
    console.log(`\n📂 ${category}:`);
    
    const originalFiles = fs.readdirSync(originalPath).filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));
    const optimizedFiles = fs.readdirSync(optimizedPath).filter(f => f.includes('_240p') || f.includes('_360p') || f.includes('_480p'));
    
    let categoryOriginal = 0;
    let categoryOptimized = 0;
    
    originalFiles.forEach(file => {
      const size = fs.statSync(path.join(originalPath, file)).size;
      categoryOriginal += size;
    });
    
    optimizedFiles.forEach(file => {
      const size = fs.statSync(path.join(optimizedPath, file)).size;
      categoryOptimized += size;
    });
    
    console.log(`   原始文件: ${originalFiles.length} 个, ${(categoryOriginal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   优化文件: ${optimizedFiles.length} 个, ${(categoryOptimized / 1024 / 1024).toFixed(2)}MB`);
    
    totalOriginal += categoryOriginal;
    totalOptimized += categoryOptimized;
    fileCount += originalFiles.length;
  }
  
  const savedSpace = totalOriginal - totalOptimized;
  const savedPercent = totalOriginal > 0 ? (savedSpace / totalOriginal * 100).toFixed(1) : 0;
  
  console.log(`\n💾 总计:`);
  console.log(`   处理文件: ${fileCount} 个`);
  console.log(`   原始大小: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   优化大小: ${(totalOptimized / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   节省空间: ${(savedSpace / 1024 / 1024).toFixed(2)}MB (${savedPercent}%)`);
  
  console.log(`\n🚀 流媒体优化建议:`);
  console.log(`   1. 推荐优先使用 360p 版本 (网络友好)`);
  console.log(`   2. 在慢速网络下自动降级到 240p`);
  console.log(`   3. 所有视频已优化为流媒体播放 (faststart)`);
  console.log(`   4. 建议配合新的 Nginx 配置使用`);
}

// 主函数
function main() {
  console.log('🚀 启动流媒体视频优化...');
  console.log('================================');
  
  // 检查环境
  if (!checkFFmpeg()) {
    console.error('❌ 错误: FFmpeg 未安装');
    console.log('请先安装 FFmpeg:');
    console.log('  Ubuntu/Debian: sudo apt install ffmpeg');
    console.log('  CentOS/RHEL: sudo yum install ffmpeg');
    process.exit(1);
  }
  
  // 创建输出目录
  ensureDir(OUTPUT_PATH);
  ensureDir(THUMBNAIL_PATH);
  
  const startTime = Date.now();
  
  try {
    // 处理所有视频
    processAllVideosForStreaming();
    
    // 生成报告
    generateStreamingReport();
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n🎉 流媒体优化完成! 耗时: ${duration} 分钟`);
    console.log(`\n📝 下一步:`);
    console.log(`   1. 更新 Nginx 配置 (使用 nginx-optimized.conf)`);
    console.log(`   2. 重启 Nginx: sudo systemctl reload nginx`);
    console.log(`   3. 重启后端服务`);
    console.log(`   4. 测试视频播放性能`);
    
  } catch (error) {
    console.error('❌ 优化过程出错:', error);
    process.exit(1);
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 