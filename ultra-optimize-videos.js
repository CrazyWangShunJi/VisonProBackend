const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置路径
const VIDEO_PATH = '/data/media/video';
const OPTIMIZED_PATH = '/data/media/optimized';
const THUMBNAIL_PATH = '/data/media/thumbnails';

// 视频分类
const VIDEO_CATEGORIES = {
  'TVC': 'TVC广告片',
  'activity': '活动视频', 
  'short_video': '短视频'
};

// 超级优化预设 - 专为网络播放优化
const ULTRA_PRESETS = {
  '240p': {
    resolution: '426:240',
    bitrate: '400k',
    maxrate: '600k',
    bufsize: '800k',
    crf: 28,
    preset: 'fast',
    profile: 'baseline',
    level: '3.0'
  },
  '360p': {
    resolution: '640:360', 
    bitrate: '800k',
    maxrate: '1200k',
    bufsize: '1600k',
    crf: 26,
    preset: 'fast',
    profile: 'main',
    level: '3.1'
  },
  '480p': {
    resolution: '854:480',
    bitrate: '1200k',
    maxrate: '1800k', 
    bufsize: '2400k',
    crf: 24,
    preset: 'fast',
    profile: 'main',
    level: '3.1'
  },
  '720p': {
    resolution: '1280:720',
    bitrate: '2000k',
    maxrate: '3000k',
    bufsize: '4000k',
    crf: 22,
    preset: 'medium',
    profile: 'high',
    level: '4.0'
  }
};

// 统计信息
let stats = {
  totalOriginalSize: 0,
  totalOptimizedSize: 0,
  processedFiles: 0,
  failedFiles: 0,
  generatedThumbnails: 0
};

// 确保目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 创建目录: ${dirPath}`);
  }
}

// 检查FFmpeg是否可用
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    console.log('✅ FFmpeg 可用');
    return true;
  } catch (error) {
    console.error('❌ FFmpeg 不可用，请先安装 FFmpeg');
    return false;
  }
}

// 超级压缩视频 - 专为网络播放优化
function ultraCompressVideo(inputPath, outputPath, preset) {
  try {
    const { resolution, bitrate, maxrate, bufsize, crf, preset: speed, profile, level } = preset;
    
    // 使用最优化的FFmpeg参数
    const cmd = `ffmpeg -i "${inputPath}" ` +
      `-c:v libx264 ` +
      `-preset ${speed} ` +
      `-crf ${crf} ` +
      `-profile:v ${profile} ` +
      `-level ${level} ` +
      `-vf "scale=${resolution}:force_original_aspect_ratio=decrease:force_divisible_by=2" ` +
      `-b:v ${bitrate} ` +
      `-maxrate ${maxrate} ` +
      `-bufsize ${bufsize} ` +
      `-c:a aac ` +
      `-b:a 96k ` +
      `-ar 44100 ` +
      `-ac 2 ` +
      `-movflags +faststart ` + // 网络播放优化
      `-tune film ` + // 优化电影内容
      `-x264opts keyint=48:min-keyint=48:scenecut=-1 ` + // 固定关键帧间隔
      `-threads 0 ` + // 使用所有CPU核心
      `-y "${outputPath}"`;
    
    console.log(`🔄 超级压缩: ${path.basename(inputPath)} -> ${resolution.split(':')[1]}p`);
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

// 生成高质量缩略图
function generateThumbnail(inputPath, outputPath) {
  try {
    const cmd = `ffmpeg -i "${inputPath}" ` +
      `-vf "thumbnail,scale=320:240:force_original_aspect_ratio=decrease" ` +
      `-frames:v 1 ` +
      `-q:v 2 ` + // 高质量
      `-y "${outputPath}"`;
    
    execSync(cmd, { stdio: 'ignore' });
    console.log(`📸 生成缩略图: ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ 生成缩略图失败: ${error.message}`);
    return false;
  }
}

// 处理单个视频文件
function processVideoFile(inputPath, category) {
  const filename = path.basename(inputPath);
  const nameWithoutExt = path.basename(inputPath, path.extname(inputPath));
  const originalSize = fs.statSync(inputPath).size;
  
  console.log(`\n🎬 处理视频: ${filename} (${(originalSize / 1024 / 1024).toFixed(2)} MB)`);
  
  // 确保输出目录存在
  const categoryOptimizedPath = path.join(OPTIMIZED_PATH, category);
  const categoryThumbnailPath = path.join(THUMBNAIL_PATH, category);
  ensureDirectoryExists(categoryOptimizedPath);
  ensureDirectoryExists(categoryThumbnailPath);
  
  let totalOptimizedSize = 0;
  let successCount = 0;
  
  // 生成多个质量版本 - 包括240p用于极慢网络
  for (const [quality, preset] of Object.entries(ULTRA_PRESETS)) {
    const outputPath = path.join(categoryOptimizedPath, `${nameWithoutExt}_${quality}.mp4`);
    
    if (ultraCompressVideo(inputPath, outputPath, preset)) {
      const optimizedSize = fs.statSync(outputPath).size;
      totalOptimizedSize += optimizedSize;
      successCount++;
      console.log(`   ✅ ${quality}: ${(optimizedSize / 1024 / 1024).toFixed(2)} MB`);
    }
  }
  
  // 生成缩略图
  const thumbnailPath = path.join(categoryThumbnailPath, `${nameWithoutExt}.jpg`);
  if (generateThumbnail(inputPath, thumbnailPath)) {
    stats.generatedThumbnails++;
  }
  
  // 更新统计信息
  stats.totalOriginalSize += originalSize;
  stats.totalOptimizedSize += totalOptimizedSize;
  
  if (successCount > 0) {
    stats.processedFiles++;
    const compressionRatio = ((originalSize - totalOptimizedSize) / originalSize * 100).toFixed(1);
    console.log(`📊 文件优化完成: 原始 ${(originalSize / 1024 / 1024).toFixed(2)} MB -> 优化 ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB (节省 ${compressionRatio}%)`);
  } else {
    stats.failedFiles++;
  }
}

// 处理分类目录
function processCategoryDirectory(categoryPath, category) {
  if (!fs.existsSync(categoryPath)) {
    console.log(`⚠️ 分类目录不存在: ${categoryPath}`);
    return;
  }
  
  console.log(`\n📂 处理分类: ${VIDEO_CATEGORIES[category] || category}`);
  
  const files = fs.readdirSync(categoryPath);
  const videoFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'].includes(ext);
  });
  
  console.log(`📹 发现 ${videoFiles.length} 个视频文件`);
  
  videoFiles.forEach(file => {
    const filePath = path.join(categoryPath, file);
    processVideoFile(filePath, category);
  });
}

// 主函数
function main() {
  console.log('🚀 开始超级视频优化...\n');
  
  // 检查FFmpeg
  if (!checkFFmpeg()) {
    process.exit(1);
  }
  
  // 确保基础目录存在
  ensureDirectoryExists(OPTIMIZED_PATH);
  ensureDirectoryExists(THUMBNAIL_PATH);
  
  // 处理每个分类
  for (const category of Object.keys(VIDEO_CATEGORIES)) {
    const categoryPath = path.join(VIDEO_PATH, category);
    processCategoryDirectory(categoryPath, category);
  }
  
  // 输出最终统计
  console.log('\n' + '='.repeat(60));
  console.log('📊 超级优化完成统计报告');
  console.log('='.repeat(60));
  console.log(`✅ 成功处理: ${stats.processedFiles} 个文件`);
  console.log(`❌ 处理失败: ${stats.failedFiles} 个文件`);
  console.log(`📸 生成缩略图: ${stats.generatedThumbnails} 个`);
  console.log(`📦 原始总大小: ${(stats.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🎯 优化后大小: ${(stats.totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (stats.totalOriginalSize > 0) {
    const totalSavings = ((stats.totalOriginalSize - stats.totalOptimizedSize) / stats.totalOriginalSize * 100).toFixed(1);
    const savedSpace = (stats.totalOriginalSize - stats.totalOptimizedSize) / 1024 / 1024;
    console.log(`💾 节省空间: ${savedSpace.toFixed(2)} MB (${totalSavings}%)`);
  }
  
  console.log('\n🎉 超级优化完成！');
  console.log('💡 建议：');
  console.log('   - 240p: 适用于极慢网络（<1Mbps）');
  console.log('   - 360p: 适用于慢速网络（1-2Mbps）');
  console.log('   - 480p: 适用于中速网络（2-5Mbps）');
  console.log('   - 720p: 适用于快速网络（>5Mbps）');
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  ultraCompressVideo,
  generateThumbnail,
  ULTRA_PRESETS
}; 