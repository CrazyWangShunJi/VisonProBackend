#!/usr/bin/env node

/**
 * 测试优化后的视频文件
 * 检查优化结果并生成报告
 */

import fs from 'fs';
import path from 'path';

// 配置
const ORIGINAL_VIDEO_PATH = '/data/media/video';
const OPTIMIZED_VIDEO_PATH = '/data/media/optimized';
const THUMBNAIL_PATH = '/data/media/thumbnails';

// 视频分类
const VIDEO_CATEGORIES = {
  'activity': '活动视频',
  'TVC': 'TVC广告',
  'short_video': '短视频'
};

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 检查目录是否存在
function checkDirectory(dirPath, name) {
  if (fs.existsSync(dirPath)) {
    console.log(`✅ ${name}: ${dirPath}`);
    return true;
  } else {
    console.log(`❌ ${name}: ${dirPath} (不存在)`);
    return false;
  }
}

// 获取视频文件列表
function getVideoFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  
  const files = fs.readdirSync(dirPath);
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
  });
}

// 检查单个分类的优化结果
function checkCategoryOptimization(category) {
  console.log(`\n📂 检查分类: ${VIDEO_CATEGORIES[category]}`);
  console.log('=' .repeat(50));
  
  const originalDir = path.join(ORIGINAL_VIDEO_PATH, category);
  const optimizedDir = path.join(OPTIMIZED_VIDEO_PATH, category);
  const thumbnailDir = path.join(THUMBNAIL_PATH, category);
  
  // 检查原始视频目录
  if (!fs.existsSync(originalDir)) {
    console.log(`⚠️  原始视频目录不存在: ${originalDir}`);
    return;
  }
  
  const originalVideos = getVideoFiles(originalDir);
  console.log(`📹 原始视频数量: ${originalVideos.length}`);
  
  if (originalVideos.length === 0) {
    console.log(`ℹ️  该分类下没有视频文件`);
    return;
  }
  
  // 检查优化目录
  const hasOptimizedDir = fs.existsSync(optimizedDir);
  const hasThumbnailDir = fs.existsSync(thumbnailDir);
  
  console.log(`📁 优化目录: ${hasOptimizedDir ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`📁 缩略图目录: ${hasThumbnailDir ? '✅ 存在' : '❌ 不存在'}`);
  
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let optimizedCount = 0;
  let thumbnailCount = 0;
  
  // 检查每个视频的优化结果
  for (const videoFile of originalVideos) {
    const fileName = path.parse(videoFile).name;
    const originalPath = path.join(originalDir, videoFile);
    const originalSize = fs.statSync(originalPath).size;
    totalOriginalSize += originalSize;
    
    console.log(`\n📹 ${videoFile}`);
    console.log(`   原始大小: ${formatFileSize(originalSize)}`);
    
    // 检查优化版本
    const qualities = ['480p', '720p', '1080p'];
    let hasOptimized = false;
    
    for (const quality of qualities) {
      const optimizedFile = `${fileName}_${quality}${path.extname(videoFile)}`;
      const optimizedPath = path.join(optimizedDir, optimizedFile);
      
      if (fs.existsSync(optimizedPath)) {
        const optimizedSize = fs.statSync(optimizedPath).size;
        totalOptimizedSize += optimizedSize;
        const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
        
        console.log(`   ${quality}: ${formatFileSize(optimizedSize)} (节省 ${compressionRatio}%)`);
        hasOptimized = true;
      } else {
        console.log(`   ${quality}: ❌ 未生成`);
      }
    }
    
    if (hasOptimized) {
      optimizedCount++;
    }
    
    // 检查缩略图
    const thumbnailFile = `${fileName}.jpg`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFile);
    
    if (fs.existsSync(thumbnailPath)) {
      const thumbnailSize = fs.statSync(thumbnailPath).size;
      console.log(`   缩略图: ✅ ${formatFileSize(thumbnailSize)}`);
      thumbnailCount++;
    } else {
      console.log(`   缩略图: ❌ 未生成`);
    }
  }
  
  // 分类统计
  console.log(`\n📊 ${VIDEO_CATEGORIES[category]} 统计:`);
  console.log(`   原始视频: ${originalVideos.length} 个`);
  console.log(`   已优化: ${optimizedCount} 个`);
  console.log(`   有缩略图: ${thumbnailCount} 个`);
  console.log(`   原始总大小: ${formatFileSize(totalOriginalSize)}`);
  console.log(`   优化后总大小: ${formatFileSize(totalOptimizedSize)}`);
  
  if (totalOptimizedSize > 0) {
    const totalCompressionRatio = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
    console.log(`   总体压缩率: ${totalCompressionRatio}%`);
  }
  
  return {
    category: category,
    categoryName: VIDEO_CATEGORIES[category],
    originalCount: originalVideos.length,
    optimizedCount: optimizedCount,
    thumbnailCount: thumbnailCount,
    originalSize: totalOriginalSize,
    optimizedSize: totalOptimizedSize
  };
}

// 主函数
function main() {
  console.log('🔍 检查视频优化结果');
  console.log('=' .repeat(60));
  
  // 检查基础目录
  console.log('\n📁 目录检查:');
  checkDirectory(ORIGINAL_VIDEO_PATH, '原始视频目录');
  checkDirectory(OPTIMIZED_VIDEO_PATH, '优化视频目录');
  checkDirectory(THUMBNAIL_PATH, '缩略图目录');
  
  // 检查每个分类
  const categoryResults = [];
  
  for (const category of Object.keys(VIDEO_CATEGORIES)) {
    const result = checkCategoryOptimization(category);
    if (result) {
      categoryResults.push(result);
    }
  }
  
  // 生成总体报告
  console.log('\n' + '=' .repeat(60));
  console.log('📈 总体优化报告');
  console.log('=' .repeat(60));
  
  let totalOriginalVideos = 0;
  let totalOptimizedVideos = 0;
  let totalThumbnails = 0;
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  
  for (const result of categoryResults) {
    totalOriginalVideos += result.originalCount;
    totalOptimizedVideos += result.optimizedCount;
    totalThumbnails += result.thumbnailCount;
    totalOriginalSize += result.originalSize;
    totalOptimizedSize += result.optimizedSize;
  }
  
  console.log(`📹 原始视频总数: ${totalOriginalVideos}`);
  console.log(`✅ 已优化视频数: ${totalOptimizedVideos}`);
  console.log(`🖼️  生成缩略图数: ${totalThumbnails}`);
  console.log(`📦 原始总大小: ${formatFileSize(totalOriginalSize)}`);
  console.log(`📦 优化后总大小: ${formatFileSize(totalOptimizedSize)}`);
  
  if (totalOptimizedSize > 0 && totalOriginalSize > 0) {
    const totalCompressionRatio = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
    const spaceSaved = totalOriginalSize - totalOptimizedSize;
    console.log(`💾 总体压缩率: ${totalCompressionRatio}%`);
    console.log(`💾 节省空间: ${formatFileSize(spaceSaved)}`);
  }
  
  // 优化建议
  console.log('\n💡 优化建议:');
  if (totalOptimizedVideos < totalOriginalVideos) {
    console.log(`⚠️  还有 ${totalOriginalVideos - totalOptimizedVideos} 个视频未优化`);
  }
  if (totalThumbnails < totalOriginalVideos) {
    console.log(`⚠️  还有 ${totalOriginalVideos - totalThumbnails} 个视频缺少缩略图`);
  }
  if (totalOptimizedVideos === totalOriginalVideos && totalThumbnails === totalOriginalVideos) {
    console.log(`🎉 所有视频都已完成优化！`);
  }
  
  console.log('\n🌐 访问URL示例:');
  console.log(`   原始视频: http://114.55.73.26:3001/assets/video/activity/视频名.mp4`);
  console.log(`   优化视频: http://114.55.73.26:3001/assets/optimized/activity/视频名_720p.mp4`);
  console.log(`   缩略图: http://114.55.73.26:3001/assets/thumbnails/activity/视频名.jpg`);
}

// 运行主函数
main(); 