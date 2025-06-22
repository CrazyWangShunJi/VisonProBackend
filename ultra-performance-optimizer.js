import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const MEDIA_BASE_PATH = process.env.MEDIA_BASE_PATH || '/data/media';
const VIDEO_PATH = path.join(MEDIA_BASE_PATH, 'video');
const THUMBNAIL_PATH = path.join(MEDIA_BASE_PATH, 'thumbnails');
const OPTIMIZED_PATH = path.join(MEDIA_BASE_PATH, 'optimized');

const VIDEO_CATEGORIES = {
  'activity': '活动',
  'TVC': '宣传片',
  'short_video': '短视频'
};

/**
 * 终极性能优化器
 * 集成视频压缩、缩略图生成、服务器调优等功能
 */
class UltraPerformanceOptimizer {
  constructor() {
    this.stats = {
      videosProcessed: 0,
      thumbnailsGenerated: 0,
      totalSpaceSaved: 0,
      processingTime: 0,
      errors: []
    };
    
    this.config = {
      // 压缩配置 - 针对网络播放优化
      compression: {
        '240p': {
          resolution: '426x240',
          bitrate: '300k',
          crf: 28,
          preset: 'fast'
        },
        '360p': {
          resolution: '640x360', 
          bitrate: '600k',
          crf: 26,
          preset: 'fast'
        },
        '480p': {
          resolution: '854x480',
          bitrate: '1000k',
          crf: 24,
          preset: 'medium'
        }
      },
      
      // 缩略图配置
      thumbnail: {
        size: '320x240',
        quality: 2,
        timeOffset: 3
      },
      
      // 并发处理数量
      maxConcurrent: 3
    };
  }

  /**
   * 运行完整优化流程
   */
  async runFullOptimization() {
    console.log('🚀 启动终极性能优化...');
    console.log('================================');
    
    const startTime = Date.now();
    
    try {
      // 步骤1: 检查环境
      await this.checkEnvironment();
      
      // 步骤2: 创建目录结构
      await this.setupDirectories();
      
      // 步骤3: 批量处理视频
      await this.processAllVideos();
      
      // 步骤4: 生成缩略图
      await this.generateAllThumbnails();
      
      // 步骤5: 优化服务器配置
      await this.optimizeServerConfig();
      
      // 步骤6: 生成报告
      this.stats.processingTime = Date.now() - startTime;
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 优化过程出错:', error);
      throw error;
    }
  }

  /**
   * 检查运行环境
   */
  async checkEnvironment() {
    console.log('🔍 检查运行环境...');
    
    // 检查FFmpeg
    const ffmpegAvailable = await this.checkCommand('ffmpeg');
    if (!ffmpegAvailable) {
      throw new Error('FFmpeg未安装，请先安装FFmpeg');
    }
    
    // 检查可用空间
    const availableSpace = await this.checkDiskSpace();
    console.log(`💾 可用磁盘空间: ${(availableSpace / 1024 / 1024 / 1024).toFixed(2)}GB`);
    
    if (availableSpace < 1024 * 1024 * 1024) { // 1GB
      console.warn('⚠️ 磁盘空间不足1GB，可能影响处理效果');
    }
    
    console.log('✅ 环境检查通过');
  }

  /**
   * 设置目录结构
   */
  async setupDirectories() {
    console.log('📁 设置目录结构...');
    
    const directories = [
      THUMBNAIL_PATH,
      OPTIMIZED_PATH,
      ...Object.keys(VIDEO_CATEGORIES).map(cat => path.join(THUMBNAIL_PATH, cat)),
      ...Object.keys(VIDEO_CATEGORIES).map(cat => path.join(OPTIMIZED_PATH, cat))
    ];
    
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📂 创建目录: ${dir}`);
      }
    }
    
    console.log('✅ 目录结构设置完成');
  }

  /**
   * 批量处理所有视频
   */
  async processAllVideos() {
    console.log('🎬 开始批量处理视频...');
    
    const allVideos = [];
    
    // 收集所有视频文件
    for (const category of Object.keys(VIDEO_CATEGORIES)) {
      const categoryPath = path.join(VIDEO_PATH, category);
      if (!fs.existsSync(categoryPath)) continue;
      
      const files = fs.readdirSync(categoryPath)
        .filter(file => this.isVideoFile(file))
        .map(file => ({ category, filename: file }));
      
      allVideos.push(...files);
    }
    
    console.log(`📊 发现 ${allVideos.length} 个视频文件`);
    
    // 分批处理
    const batches = this.chunkArray(allVideos, this.config.maxConcurrent);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n🔄 处理批次 ${i + 1}/${batches.length} (${batch.length} 个文件)`);
      
      const promises = batch.map(video => this.processVideo(video.category, video.filename));
      await Promise.allSettled(promises);
    }
    
    console.log('✅ 视频批量处理完成');
  }

  /**
   * 处理单个视频
   */
  async processVideo(category, filename) {
    const videoPath = path.join(VIDEO_PATH, category, filename);
    const baseName = path.basename(filename, path.extname(filename));
    
    try {
      console.log(`🎬 处理视频: ${category}/${filename}`);
      
      // 获取原始文件大小
      const originalSize = fs.statSync(videoPath).size;
      let totalSaved = 0;
      
      // 生成不同质量版本
      for (const [quality, config] of Object.entries(this.config.compression)) {
        const outputPath = path.join(OPTIMIZED_PATH, category, `${baseName}_${quality}.mp4`);
        
        // 如果文件已存在，跳过
        if (fs.existsSync(outputPath)) {
          console.log(`⏭️ 跳过已存在的文件: ${quality}`);
          continue;
        }
        
        try {
          await this.compressVideo(videoPath, outputPath, config);
          
          const compressedSize = fs.statSync(outputPath).size;
          const saved = originalSize - compressedSize;
          totalSaved += saved;
          
          console.log(`✅ ${quality}: ${(compressedSize / 1024 / 1024).toFixed(2)}MB (节省 ${(saved / 1024 / 1024).toFixed(2)}MB)`);
        } catch (error) {
          console.error(`❌ ${quality} 压缩失败:`, error.message);
          this.stats.errors.push(`${category}/${filename} ${quality}: ${error.message}`);
        }
      }
      
      this.stats.videosProcessed++;
      this.stats.totalSpaceSaved += totalSaved;
      
    } catch (error) {
      console.error(`❌ 处理视频失败 ${category}/${filename}:`, error.message);
      this.stats.errors.push(`${category}/${filename}: ${error.message}`);
    }
  }

  /**
   * 压缩视频
   */
  async compressVideo(inputPath, outputPath, config) {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', config.preset,
        '-crf', config.crf.toString(),
        '-maxrate', config.bitrate,
        '-bufsize', (parseInt(config.bitrate) * 2) + 'k',
        '-vf', `scale=${config.resolution}`,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart', // 优化网络播放
        '-y',
        outputPath
      ];
      
      const ffmpeg = spawn('ffmpeg', args);
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg退出码: ${code}`));
        }
      });
      
      ffmpeg.on('error', reject);
    });
  }

  /**
   * 生成所有缩略图
   */
  async generateAllThumbnails() {
    console.log('🖼️ 生成视频缩略图...');
    
    let thumbnailCount = 0;
    
    for (const category of Object.keys(VIDEO_CATEGORIES)) {
      const categoryPath = path.join(VIDEO_PATH, category);
      if (!fs.existsSync(categoryPath)) continue;
      
      const videos = fs.readdirSync(categoryPath)
        .filter(file => this.isVideoFile(file));
      
      for (const video of videos) {
        try {
          await this.generateThumbnail(category, video);
          thumbnailCount++;
        } catch (error) {
          console.error(`❌ 缩略图生成失败 ${category}/${video}:`, error.message);
          this.stats.errors.push(`缩略图 ${category}/${video}: ${error.message}`);
        }
      }
    }
    
    this.stats.thumbnailsGenerated = thumbnailCount;
    console.log(`✅ 生成 ${thumbnailCount} 个缩略图`);
  }

  /**
   * 生成单个缩略图
   */
  async generateThumbnail(category, filename) {
    const videoPath = path.join(VIDEO_PATH, category, filename);
    const baseName = path.basename(filename, path.extname(filename));
    const thumbnailPath = path.join(THUMBNAIL_PATH, category, `${baseName}.jpg`);
    
    // 如果缩略图已存在，跳过
    if (fs.existsSync(thumbnailPath)) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', videoPath,
        '-ss', this.config.thumbnail.timeOffset.toString(),
        '-vframes', '1',
        '-s', this.config.thumbnail.size,
        '-q:v', this.config.thumbnail.quality.toString(),
        '-y',
        thumbnailPath
      ];
      
      const ffmpeg = spawn('ffmpeg', args);
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`缩略图生成失败: ${code}`));
        }
      });
      
      ffmpeg.on('error', reject);
    });
  }

  /**
   * 优化服务器配置
   */
  async optimizeServerConfig() {
    console.log('⚙️ 优化服务器配置...');
    
    // 生成nginx配置建议
    const nginxConfig = this.generateNginxConfig();
    fs.writeFileSync(path.join(__dirname, 'nginx-optimization.conf'), nginxConfig);
    
    // 生成pm2配置
    const pm2Config = this.generatePM2Config();
    fs.writeFileSync(path.join(__dirname, 'pm2-optimization.json'), JSON.stringify(pm2Config, null, 2));
    
    console.log('✅ 服务器配置文件已生成');
  }

  /**
   * 生成优化报告
   */
  generateReport() {
    console.log('\n🎉 优化完成！');
    console.log('================================');
    console.log(`📊 处理统计:`);
    console.log(`  • 处理视频: ${this.stats.videosProcessed} 个`);
    console.log(`  • 生成缩略图: ${this.stats.thumbnailsGenerated} 个`);
    console.log(`  • 节省空间: ${(this.stats.totalSpaceSaved / 1024 / 1024 / 1024).toFixed(2)}GB`);
    console.log(`  • 处理时间: ${(this.stats.processingTime / 1000 / 60).toFixed(2)} 分钟`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️ 错误列表 (${this.stats.errors.length} 个):`);
      this.stats.errors.forEach(error => console.log(`  • ${error}`));
    }
    
    console.log('\n💡 优化建议:');
    console.log('  1. 重启后端服务以应用新配置');
    console.log('  2. 使用生成的nginx配置优化服务器');
    console.log('  3. 定期运行此脚本处理新视频');
    console.log('  4. 监控服务器性能和用户体验');
    
    // 保存报告
    const reportPath = path.join(__dirname, `optimization-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.stats, null, 2));
    console.log(`\n📄 详细报告已保存: ${reportPath}`);
  }

  /**
   * 生成Nginx配置
   */
  generateNginxConfig() {
    return `
# 视频服务优化配置
location /assets/video/ {
    # 启用gzip压缩
    gzip on;
    gzip_types video/mp4 video/webm;
    
    # 缓存配置
    expires 1d;
    add_header Cache-Control "public, immutable";
    
    # 支持范围请求
    add_header Accept-Ranges bytes;
    
    # 启用sendfile
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    
    # 限制带宽（可选）
    # limit_rate 2m;
}

location /assets/thumbnails/ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}

# API代理配置
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # 超时配置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
`;
  }

  /**
   * 生成PM2配置
   */
  generatePM2Config() {
    return {
      apps: [{
        name: "video-server",
        script: "server.js",
        instances: "max",
        exec_mode: "cluster",
        env: {
          NODE_ENV: "production",
          PORT: 3001
        },
        max_memory_restart: "1G",
        node_args: "--max-old-space-size=2048",
        log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        error_file: "./logs/err.log",
        out_file: "./logs/out.log",
        log_file: "./logs/combined.log"
      }]
    };
  }

  /**
   * 辅助方法
   */
  async checkCommand(command) {
    return new Promise((resolve) => {
      const child = spawn(command, ['--version']);
      child.on('close', (code) => resolve(code === 0));
      child.on('error', () => resolve(false));
    });
  }

  async checkDiskSpace() {
    return new Promise((resolve) => {
      const child = spawn('df', ['-B1', MEDIA_BASE_PATH]);
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', () => {
        const lines = output.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          resolve(parseInt(parts[3]) || 0);
        } else {
          resolve(0);
        }
      });
      
      child.on('error', () => resolve(0));
    });
  }

  isVideoFile(filename) {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
    return videoExtensions.includes(path.extname(filename).toLowerCase());
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// 主函数
async function main() {
  const optimizer = new UltraPerformanceOptimizer();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('终极性能优化器');
    console.log('================');
    console.log('用法: node ultra-performance-optimizer.js [选项]');
    console.log('');
    console.log('选项:');
    console.log('  --help, -h     显示帮助信息');
    console.log('  --videos-only  仅处理视频压缩');
    console.log('  --thumbs-only  仅生成缩略图');
    console.log('');
    return;
  }
  
  try {
    if (args.includes('--videos-only')) {
      await optimizer.checkEnvironment();
      await optimizer.setupDirectories();
      await optimizer.processAllVideos();
    } else if (args.includes('--thumbs-only')) {
      await optimizer.checkEnvironment();
      await optimizer.setupDirectories();
      await optimizer.generateAllThumbnails();
    } else {
      await optimizer.runFullOptimization();
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { UltraPerformanceOptimizer }; 