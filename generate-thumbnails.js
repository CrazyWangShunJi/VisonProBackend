import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置路径
const MEDIA_BASE_PATH = process.env.MEDIA_BASE_PATH || '/data/media';
const VIDEO_PATH = path.join(MEDIA_BASE_PATH, 'video');
const THUMBNAIL_PATH = path.join(MEDIA_BASE_PATH, 'thumbnails');

// 视频分类配置
const VIDEO_CATEGORIES = {
  'activity': '活动',
  'TVC': '宣传片', 
  'short_video': '短视频'
};

// 支持的视频格式（包括大写扩展名）
const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.MP4', '.avi', '.AVI', '.mov', '.MOV', '.wmv', '.WMV', '.flv', '.FLV', '.webm', '.WEBM', '.mkv', '.MKV', '.m4v', '.M4V'];

/**
 * 确保目录存在
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 创建目录: ${dirPath}`);
  }
}

/**
 * 检查ffmpeg是否可用
 */
function checkFFmpeg() {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });
    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * 生成视频缩略图
 * @param {string} videoPath - 视频文件路径
 * @param {string} thumbnailPath - 缩略图输出路径
 * @param {number} timeOffset - 提取帧的时间偏移（秒），默认为3秒
 * @param {string} size - 缩略图尺寸，默认为320x240
 */
function generateThumbnail(videoPath, thumbnailPath, timeOffset = 3, size = '320x240') {
  return new Promise((resolve, reject) => {
    console.log(`🎬 正在生成缩略图: ${path.basename(videoPath)}`);
    
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,           // 输入视频文件
      '-ss', timeOffset.toString(), // 跳转到指定时间
      '-vframes', '1',           // 只提取一帧
      '-s', size,                // 设置输出尺寸
      '-q:v', '2',               // 设置质量（1-31，数字越小质量越高）
      '-y',                      // 覆盖输出文件
      thumbnailPath              // 输出文件路径
    ]);

    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ 缩略图生成成功: ${path.basename(thumbnailPath)}`);
        resolve(thumbnailPath);
      } else {
        console.error(`❌ 缩略图生成失败: ${path.basename(videoPath)}`);
        console.error('FFmpeg错误:', stderr);
        reject(new Error(`FFmpeg退出码: ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      console.error(`❌ FFmpeg执行错误:`, error);
      reject(error);
    });
  });
}

/**
 * 获取视频时长
 */
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      videoPath
    ]);

    let stdout = '';
    
    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(stdout.trim());
        resolve(duration);
      } else {
        reject(new Error(`FFprobe退出码: ${code}`));
      }
    });

    ffprobe.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 为单个视频生成缩略图
 */
async function generateVideoThumbnail(category, filename) {
  const videoPath = path.join(VIDEO_PATH, category, filename);
  const fileExt = path.extname(filename);
  const baseName = path.basename(filename, fileExt);
  const thumbnailFilename = `${baseName}.jpg`;
  const thumbnailDir = path.join(THUMBNAIL_PATH, category);
  const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

  // 检查视频文件是否存在
  if (!fs.existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath}`);
  }

  // 确保缩略图目录存在
  ensureDirectoryExists(thumbnailDir);

  // 如果缩略图已存在，跳过
  if (fs.existsSync(thumbnailPath)) {
    console.log(`⏭️ 缩略图已存在，跳过: ${thumbnailFilename}`);
    return thumbnailPath;
  }

  try {
    // 获取视频时长
    const duration = await getVideoDuration(videoPath);
    
    // 计算提取帧的时间点
    // 如果视频很短（<10秒），从第1秒提取
    // 否则从视频长度的10%处提取，但不超过30秒
    let timeOffset = 1;
    if (duration > 10) {
      timeOffset = Math.min(duration * 0.1, 30);
    }

    // 生成缩略图
    await generateThumbnail(videoPath, thumbnailPath, timeOffset);
    return thumbnailPath;
    
  } catch (error) {
    console.error(`❌ 处理视频失败 ${filename}:`, error.message);
    throw error;
  }
}

/**
 * 批量生成指定分类的所有视频缩略图
 */
async function generateCategoryThumbnails(category) {
  const categoryPath = path.join(VIDEO_PATH, category);
  
  if (!fs.existsSync(categoryPath)) {
    console.log(`⚠️ 分类目录不存在: ${category}`);
    return;
  }

  const files = fs.readdirSync(categoryPath);
  const videoFiles = files.filter(file => 
    SUPPORTED_VIDEO_FORMATS.includes(path.extname(file))
  );

  console.log(`📁 处理分类 "${category}" - 发现 ${videoFiles.length} 个视频文件`);

  let successCount = 0;
  let errorCount = 0;

  for (const filename of videoFiles) {
    try {
      await generateVideoThumbnail(category, filename);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`❌ 生成缩略图失败: ${filename}`, error.message);
    }
  }

  console.log(`✅ 分类 "${category}" 处理完成: 成功 ${successCount}, 失败 ${errorCount}`);
}

/**
 * 生成所有视频的缩略图
 */
async function generateAllThumbnails() {
  console.log('🚀 开始生成视频缩略图...');
  console.log(`📂 视频路径: ${VIDEO_PATH}`);
  console.log(`📂 缩略图路径: ${THUMBNAIL_PATH}`);

  // 检查ffmpeg是否可用
  const ffmpegAvailable = await checkFFmpeg();
  if (!ffmpegAvailable) {
    console.error('❌ FFmpeg不可用，请先安装FFmpeg');
    console.error('安装指南:');
    console.error('  Windows: 下载并安装 https://ffmpeg.org/download.html');
    console.error('  Ubuntu: sudo apt install ffmpeg');
    console.error('  CentOS: sudo yum install ffmpeg');
    process.exit(1);
  }

  console.log('✅ FFmpeg检查通过');

  // 确保缩略图根目录存在
  ensureDirectoryExists(THUMBNAIL_PATH);

  // 处理每个分类
  for (const category of Object.keys(VIDEO_CATEGORIES)) {
    await generateCategoryThumbnails(category);
  }

  console.log('🎉 所有视频缩略图生成完成！');
}

/**
 * 清理无效的缩略图（对应的视频文件已不存在）
 */
function cleanupOrphanedThumbnails() {
  console.log('🧹 清理无效缩略图...');
  
  let cleanedCount = 0;
  
  for (const category of Object.keys(VIDEO_CATEGORIES)) {
    const thumbnailDir = path.join(THUMBNAIL_PATH, category);
    const videoDir = path.join(VIDEO_PATH, category);
    
    if (!fs.existsSync(thumbnailDir)) continue;
    
    const thumbnails = fs.readdirSync(thumbnailDir);
    
    for (const thumbnail of thumbnails) {
      const baseName = path.basename(thumbnail, '.jpg');
      
      // 检查是否存在对应的视频文件
      const videoExists = SUPPORTED_VIDEO_FORMATS.some(ext => {
        const videoPath = path.join(videoDir, baseName + ext);
        return fs.existsSync(videoPath);
      });
      
      if (!videoExists) {
        const thumbnailPath = path.join(thumbnailDir, thumbnail);
        fs.unlinkSync(thumbnailPath);
        console.log(`🗑️ 删除无效缩略图: ${thumbnail}`);
        cleanedCount++;
      }
    }
  }
  
  console.log(`✅ 清理完成，删除了 ${cleanedCount} 个无效缩略图`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('视频缩略图生成工具');
    console.log('');
    console.log('用法:');
    console.log('  node generate-thumbnails.js              # 生成所有缩略图');
    console.log('  node generate-thumbnails.js --clean      # 清理无效缩略图');
    console.log('  node generate-thumbnails.js --category activity  # 只处理指定分类');
    console.log('');
    console.log('选项:');
    console.log('  --clean                清理无效的缩略图');
    console.log('  --category <name>      只处理指定分类');
    console.log('  --help, -h            显示帮助信息');
    return;
  }
  
  if (args.includes('--clean')) {
    cleanupOrphanedThumbnails();
    return;
  }
  
  const categoryIndex = args.indexOf('--category');
  if (categoryIndex !== -1 && categoryIndex + 1 < args.length) {
    const category = args[categoryIndex + 1];
    if (VIDEO_CATEGORIES[category]) {
      await generateCategoryThumbnails(category);
    } else {
      console.error(`❌ 无效的分类: ${category}`);
      console.error(`可用分类: ${Object.keys(VIDEO_CATEGORIES).join(', ')}`);
      process.exit(1);
    }
    return;
  }
  
  // 默认生成所有缩略图
  await generateAllThumbnails();
}

// 导出函数供其他模块使用
export {
  generateVideoThumbnail,
  generateCategoryThumbnails,
  generateAllThumbnails,
  cleanupOrphanedThumbnails
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
} 