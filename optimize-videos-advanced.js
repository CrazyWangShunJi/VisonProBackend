#!/usr/bin/env node

/**
 * 高级视频优化脚本
 * 功能：压缩视频、生成多分辨率版本、创建缩略图
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

// 视频质量配置
const QUALITY_PRESETS = {
  '480p': {
    resolution: '854x480',
    bitrate: '1000k',
    suffix: '_480p'
  },
  '720p': {
    resolution: '1280x720',
    bitrate: '2500k',
    suffix: '_720p'
  },
  '1080p': {
    resolution: '1920x1080',
    bitrate: '5000k',
    suffix: '_1080p'
  }
};

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

// 生成视频缩略图
function generateThumbnail(inputPath, outputPath) {
  try {
    const cmd = `ffmpeg -i "${inputPath}" -ss 00:00:01.000 -vframes 1 -y "${outputPath}"`;
    execSync(cmd, { stdio: 'ignore' });
    console.log(`🖼️  生成缩略图: ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ 生成缩略图失败: ${error.message}`);
    return false;
  }
}

// 压缩视频
function compressVideo(inputPath, outputPath, preset) {
  try {
    const { resolution, bitrate } = preset;
    
    // 使用 H.264 编码，优化网络传输
    const cmd = `ffmpeg -i "${inputPath}" ` +
      `-c:v libx264 -preset fast -crf 23 ` +
      `-vf scale=${resolution} ` +
      `-b:v ${bitrate} -maxrate ${bitrate} -bufsize ${parseInt(bitrate) * 2}k ` +
      `-c:a aac -b:a 128k ` +
      `-movflags +faststart ` + // 优化网络播放
      `-y "${outputPath}"`;
    
    console.log(`🔄 压缩视频: ${path.basename(inputPath)} -> ${resolution}`);
    execSync(cmd, { stdio: 'ignore' });
    
    const inputSize = fs.statSync(inputPath).size;
    const outputSize = fs.statSync(outputPath).size;
    const compressionRatio = ((inputSize - outputSize) / inputSize * 100).toFixed(1);
    
    console.log(`✅ 压缩完成: 节省 ${compressionRatio}% 空间`);
    return true;
  } catch (error) {
    console.error(`❌ 压缩视频失败: ${error.message}`);
    return false;
  }
}

// 处理单个视频文件
function processVideo(videoPath, category) {
  const videoInfo = getVideoInfo(videoPath);
  if (!videoInfo) return;
  
  const fileName = path.basename(videoPath, path.extname(videoPath));
  const fileExt = path.extname(videoPath);
  
  console.log(`\n📹 处理视频: ${fileName}${fileExt}`);
  
  // 获取原始分辨率
  const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
  const originalWidth = videoStream.width;
  const originalHeight = videoStream.height;
  const originalSize = fs.statSync(videoPath).size;
  
  console.log(`📊 原始信息: ${originalWidth}x${originalHeight}, ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
  
  // 创建输出目录
  const categoryOutputPath = path.join(OUTPUT_PATH, category);
  const categoryThumbnailPath = path.join(THUMBNAIL_PATH, category);
  ensureDir(categoryOutputPath);
  ensureDir(categoryThumbnailPath);
  
  // 生成缩略图
  const thumbnailPath = path.join(categoryThumbnailPath, `${fileName}.jpg`);
  generateThumbnail(videoPath, thumbnailPath);
  
  // 根据原始分辨率选择要生成的版本
  const presetsToGenerate = [];
  
  if (originalHeight >= 1080) {
    presetsToGenerate.push('1080p', '720p', '480p');
  } else if (originalHeight >= 720) {
    presetsToGenerate.push('720p', '480p');
  } else if (originalHeight >= 480) {
    presetsToGenerate.push('480p');
  }
  
  // 如果原始视频很大，总是生成压缩版本
  if (originalSize > 50 * 1024 * 1024) { // 50MB
    if (!presetsToGenerate.includes('480p')) {
      presetsToGenerate.push('480p');
    }
  }
  
  // 生成不同质量版本
  for (const presetName of presetsToGenerate) {
    const preset = QUALITY_PRESETS[presetName];
    const outputFileName = `${fileName}${preset.suffix}${fileExt}`;
    const outputPath = path.join(categoryOutputPath, outputFileName);
    
    if (!fs.existsSync(outputPath)) {
      compressVideo(videoPath, outputPath, preset);
    } else {
      console.log(`⏭️  跳过已存在的文件: ${outputFileName}`);
    }
  }
}

// 扫描并处理所有视频
function processAllVideos() {
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
      processVideo(videoPath, category);
    }
  }
}

// 生成优化报告
function generateReport() {
  console.log('\n📊 优化报告');
  console.log('=' .repeat(50));
  
  if (!fs.existsSync(OUTPUT_PATH)) {
    console.log('❌ 没有找到优化后的视频');
    return;
  }
  
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let processedCount = 0;
  
  const categories = fs.readdirSync(OUTPUT_PATH);
  
  for (const category of categories) {
    const categoryPath = path.join(OUTPUT_PATH, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    
    const files = fs.readdirSync(categoryPath);
    
    for (const file of files) {
      const optimizedPath = path.join(categoryPath, file);
      const optimizedSize = fs.statSync(optimizedPath).size;
      
      // 尝试找到原始文件
      const originalFileName = file.replace(/_\d+p/, '');
      const originalPath = path.join(VIDEO_PATH, category, originalFileName);
      
      if (fs.existsSync(originalPath)) {
        const originalSize = fs.statSync(originalPath).size;
        totalOriginalSize += originalSize;
        totalOptimizedSize += optimizedSize;
        processedCount++;
      }
    }
  }
  
  if (processedCount > 0) {
    const savedSpace = totalOriginalSize - totalOptimizedSize;
    const savedPercent = (savedSpace / totalOriginalSize * 100).toFixed(1);
    
    console.log(`📹 处理的视频数量: ${processedCount}`);
    console.log(`📦 原始总大小: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📦 优化后总大小: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`💾 节省空间: ${(savedSpace / 1024 / 1024).toFixed(2)} MB (${savedPercent}%)`);
  }
  
  // 缩略图统计
  if (fs.existsSync(THUMBNAIL_PATH)) {
    const thumbnailCategories = fs.readdirSync(THUMBNAIL_PATH);
    let thumbnailCount = 0;
    
    for (const category of thumbnailCategories) {
      const categoryPath = path.join(THUMBNAIL_PATH, category);
      if (fs.statSync(categoryPath).isDirectory()) {
        const files = fs.readdirSync(categoryPath);
        thumbnailCount += files.filter(f => f.endsWith('.jpg')).length;
      }
    }
    
    console.log(`🖼️  生成的缩略图: ${thumbnailCount} 个`);
  }
}

// 主函数
function main() {
  console.log('🚀 视频优化脚本启动');
  console.log('=' .repeat(50));
  
  // 检查依赖
  if (!checkFFmpeg()) {
    console.log('❌ 错误: 未找到 ffmpeg');
    console.log('请安装 ffmpeg: https://ffmpeg.org/download.html');
    process.exit(1);
  }
  
  console.log('✅ ffmpeg 检查通过');
  
  // 创建输出目录
  ensureDir(OUTPUT_PATH);
  ensureDir(THUMBNAIL_PATH);
  
  // 处理视频
  processAllVideos();
  
  // 生成报告
  generateReport();
  
  console.log('\n🎉 视频优化完成！');
  console.log(`📁 优化后的视频: ${OUTPUT_PATH}`);
  console.log(`🖼️  视频缩略图: ${THUMBNAIL_PATH}`);
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 