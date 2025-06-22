import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// 配置
const MEDIA_BASE_PATH = process.env.MEDIA_BASE_PATH || '/data/media';
const VIDEO_PATH = path.join(MEDIA_BASE_PATH, 'video');
const OPTIMIZED_PATH = path.join(MEDIA_BASE_PATH, 'optimized');

const VIDEO_CATEGORIES = ['activity', 'TVC', 'short_video'];

class PerformanceOptimizer {
  constructor() {
    this.stats = {
      processed: 0,
      errors: []
    };
  }

  async optimizeAllVideos() {
    console.log('🚀 开始视频优化...');
    
    // 创建优化目录
    this.setupDirectories();
    
    // 处理每个分类
    for (const category of VIDEO_CATEGORIES) {
      await this.optimizeCategory(category);
    }
    
    console.log(`✅ 优化完成，处理了 ${this.stats.processed} 个视频`);
    if (this.stats.errors.length > 0) {
      console.log('错误:', this.stats.errors);
    }
  }

  setupDirectories() {
    for (const category of VIDEO_CATEGORIES) {
      const dir = path.join(OPTIMIZED_PATH, category);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async optimizeCategory(category) {
    const categoryPath = path.join(VIDEO_PATH, category);
    if (!fs.existsSync(categoryPath)) return;
    
    const files = fs.readdirSync(categoryPath)
      .filter(file => this.isVideoFile(file));
    
    console.log(`📁 处理分类: ${category} (${files.length} 个文件)`);
    
    for (const file of files) {
      await this.optimizeVideo(category, file);
    }
  }

  async optimizeVideo(category, filename) {
    const inputPath = path.join(VIDEO_PATH, category, filename);
    const baseName = path.basename(filename, path.extname(filename));
    
    // 生成不同质量版本
    const qualities = [
      { name: '240p', size: '426x240', bitrate: '400k' },
      { name: '360p', size: '640x360', bitrate: '800k' },
      { name: '480p', size: '854x480', bitrate: '1200k' }
    ];
    
    for (const quality of qualities) {
      const outputPath = path.join(OPTIMIZED_PATH, category, `${baseName}_${quality.name}.mp4`);
      
      if (fs.existsSync(outputPath)) {
        console.log(`⏭️ 跳过已存在: ${quality.name}`);
        continue;
      }
      
      try {
        await this.compressVideo(inputPath, outputPath, quality);
        console.log(`✅ ${filename} -> ${quality.name}`);
        this.stats.processed++;
      } catch (error) {
        console.error(`❌ ${filename} ${quality.name}:`, error.message);
        this.stats.errors.push(`${filename}:${quality.name}`);
      }
    }
  }

  compressVideo(input, output, quality) {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', input,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '26',
        '-maxrate', quality.bitrate,
        '-bufsize', (parseInt(quality.bitrate) * 2) + 'k',
        '-vf', `scale=${quality.size}`,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', output
      ];
      
      const ffmpeg = spawn('ffmpeg', args);
      
      ffmpeg.on('close', (code) => {
        code === 0 ? resolve() : reject(new Error(`FFmpeg错误: ${code}`));
      });
      
      ffmpeg.on('error', reject);
    });
  }

  isVideoFile(filename) {
    const extensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
    return extensions.includes(path.extname(filename).toLowerCase());
  }
}

// 运行优化
const optimizer = new PerformanceOptimizer();
optimizer.optimizeAllVideos().catch(console.error); 