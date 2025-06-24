/**
 * 视频处理工具模块
 * 统一处理视频文件检测、扩展名支持和缩略图路径生成
 */

import path from 'path';
import fs from 'fs';

// 支持的视频扩展名（包括大写）
export const VIDEO_EXTENSIONS = [
  '.mp4', '.MP4',
  '.avi', '.AVI', 
  '.mov', '.MOV',
  '.wmv', '.WMV',
  '.flv', '.FLV',
  '.webm', '.WEBM',
  '.mkv', '.MKV',
  '.m4v', '.M4V'
];

// 支持的图片扩展名
export const IMAGE_EXTENSIONS = [
  '.jpg', '.JPG',
  '.jpeg', '.JPEG',
  '.png', '.PNG',
  '.gif', '.GIF',
  '.webp', '.WEBP',
  '.bmp', '.BMP'
];

/**
 * 检查文件是否为视频文件
 * @param {string} filename 文件名
 * @returns {boolean} 是否为视频文件
 */
export function isVideoFile(filename) {
  const ext = path.extname(filename);
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * 检查文件是否为图片文件
 * @param {string} filename 文件名
 * @returns {boolean} 是否为图片文件
 */
export function isImageFile(filename) {
  const ext = path.extname(filename);
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * 获取视频文件的基础名称（不含扩展名）
 * @param {string} filename 文件名
 * @returns {string} 基础名称
 */
export function getVideoBaseName(filename) {
  return path.parse(filename).name;
}

/**
 * 生成缩略图路径
 * @param {string} category 分类
 * @param {string} filename 视频文件名
 * @param {string} thumbnailBasePath 缩略图基础路径
 * @returns {object} 包含文件路径和URL路径的对象
 */
export function getThumbnailPaths(category, filename, thumbnailBasePath = '/data/media/thumbnails') {
  const baseName = getVideoBaseName(filename);
  const thumbnailFilename = `${baseName}.jpg`;
  
  return {
    filePath: path.join(thumbnailBasePath, category, thumbnailFilename),
    urlPath: `/api/thumbnail/${category}/${filename}`,
    staticUrlPath: `/assets/thumbnails/${category}/${thumbnailFilename}`
  };
}

/**
 * 检查缩略图是否存在
 * @param {string} category 分类
 * @param {string} filename 视频文件名
 * @param {string} thumbnailBasePath 缩略图基础路径
 * @returns {string|null} 缩略图URL或null
 */
export function checkThumbnailExists(category, filename, thumbnailBasePath = '/data/media/thumbnails') {
  const { filePath, urlPath } = getThumbnailPaths(category, filename, thumbnailBasePath);
  
  if (fs.existsSync(filePath)) {
    return urlPath;
  }
  
  return null;
}

/**
 * 获取优化视频的路径
 * @param {string} category 分类
 * @param {string} filename 原始文件名
 * @param {string} quality 质量等级
 * @param {string} optimizedBasePath 优化视频基础路径
 * @returns {object} 包含文件路径和URL路径的对象
 */
export function getOptimizedVideoPaths(category, filename, quality, optimizedBasePath = '/data/media/optimized') {
  const baseName = getVideoBaseName(filename);
  const ext = path.extname(filename);
  const optimizedFilename = `${baseName}_${quality}${ext}`;
  
  return {
    filePath: path.join(optimizedBasePath, category, optimizedFilename),
    urlPath: `/api/optimized/${category}/${filename}?quality=${quality}`,
    staticUrlPath: `/assets/optimized/${category}/${optimizedFilename}`
  };
}

/**
 * 获取视频的所有可用质量版本
 * @param {string} category 分类
 * @param {string} filename 原始文件名
 * @param {string} optimizedBasePath 优化视频基础路径
 * @returns {Array} 可用的质量版本数组
 */
export function getAvailableQualities(category, filename, optimizedBasePath = '/data/media/optimized') {
  const qualities = ['240p', '360p', '480p', '720p', '1080p'];
  const availableQualities = [];
  
  for (const quality of qualities) {
    const { filePath } = getOptimizedVideoPaths(category, filename, quality, optimizedBasePath);
    if (fs.existsSync(filePath)) {
      availableQualities.push(quality);
    }
  }
  
  return availableQualities;
}

/**
 * 规范化文件扩展名（转为小写）
 * @param {string} filename 文件名
 * @returns {string} 规范化后的文件名
 */
export function normalizeFilename(filename) {
  const parsed = path.parse(filename);
  return parsed.name + parsed.ext.toLowerCase();
}

/**
 * 获取视频文件的完整信息
 * @param {string} category 分类
 * @param {string} filename 文件名
 * @param {string} videoBasePath 视频基础路径
 * @param {string} thumbnailBasePath 缩略图基础路径
 * @param {string} optimizedBasePath 优化视频基础路径
 * @returns {object} 视频文件信息
 */
export function getVideoFileInfo(category, filename, videoBasePath, thumbnailBasePath, optimizedBasePath) {
  const videoPath = path.join(videoBasePath, category, filename);
  
  if (!fs.existsSync(videoPath)) {
    throw new Error('视频文件不存在');
  }
  
  const stat = fs.statSync(videoPath);
  const thumbnailUrl = checkThumbnailExists(category, filename, thumbnailBasePath);
  const availableQualities = getAvailableQualities(category, filename, optimizedBasePath);
  
  // 获取优化版本信息
  const optimizedVersions = availableQualities.map(quality => {
    const { filePath, staticUrlPath } = getOptimizedVideoPaths(category, filename, quality, optimizedBasePath);
    const optimizedStat = fs.statSync(filePath);
    
    return {
      quality,
      url: staticUrlPath,
      size: optimizedStat.size
    };
  });
  
  return {
    name: filename,
    size: stat.size,
    thumbnailUrl,
    availableQualities,
    optimizedVersions,
    streamUrl: `/api/stream/${category}/${filename}`,
    infoUrl: `/api/video-info/${category}/${filename}`
  };
} 