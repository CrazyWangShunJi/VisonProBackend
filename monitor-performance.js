#!/usr/bin/env node

/**
 * 服务器性能监控脚本
 * 监控视频服务器的性能指标
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const MEDIA_PATH = '/data/media';
const VIDEO_PATH = '/data/media/video';
const OPTIMIZED_PATH = '/data/media/optimized';
const THUMBNAIL_PATH = '/data/media/thumbnails';
const LOG_FILE = path.join(__dirname, 'performance.log');

// 性能监控类
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      system: {},
      disk: {},
      network: {},
      video: {},
      errors: []
    };
  }

  // 获取系统信息
  getSystemInfo() {
    try {
      // CPU 使用率
      const cpuInfo = execSync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d\'%\' -f1', { encoding: 'utf8' }).trim();
      
      // 内存使用率
      const memInfo = execSync('free -m | awk \'NR==2{printf "%.1f", $3*100/$2}\'', { encoding: 'utf8' }).trim();
      
      // 磁盘使用率
      const diskInfo = execSync('df -h | awk \'$NF=="/"{printf "%s", $5}\'', { encoding: 'utf8' }).trim();
      
      // 系统负载
      const loadInfo = execSync('uptime | awk -F\'load average:\' \'{print $2}\'', { encoding: 'utf8' }).trim();
      
      this.metrics.system = {
        cpuUsage: parseFloat(cpuInfo) || 0,
        memoryUsage: parseFloat(memInfo) || 0,
        diskUsage: diskInfo,
        loadAverage: loadInfo,
        uptime: execSync('uptime -p', { encoding: 'utf8' }).trim()
      };
    } catch (error) {
      this.metrics.errors.push(`系统信息获取失败: ${error.message}`);
    }
  }

  // 获取磁盘空间信息
  getDiskInfo() {
    try {
      const paths = [MEDIA_PATH, VIDEO_PATH, OPTIMIZED_PATH, THUMBNAIL_PATH];
      
      for (const dirPath of paths) {
        if (fs.existsSync(dirPath)) {
          const stats = fs.statSync(dirPath);
          const diskUsage = execSync(`du -sh "${dirPath}" | cut -f1`, { encoding: 'utf8' }).trim();
          
          this.metrics.disk[path.basename(dirPath)] = {
            exists: true,
            size: diskUsage,
            lastModified: stats.mtime
          };
        } else {
          this.metrics.disk[path.basename(dirPath)] = {
            exists: false
          };
        }
      }
    } catch (error) {
      this.metrics.errors.push(`磁盘信息获取失败: ${error.message}`);
    }
  }

  // 获取网络信息
  getNetworkInfo() {
    try {
      // 网络连接数
      const connections = execSync('netstat -an | wc -l', { encoding: 'utf8' }).trim();
      
      // 端口3001监听状态
      const port3001 = execSync('netstat -tlnp | grep :3001 | wc -l', { encoding: 'utf8' }).trim();
      
      this.metrics.network = {
        totalConnections: parseInt(connections) || 0,
        port3001Active: parseInt(port3001) > 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.metrics.errors.push(`网络信息获取失败: ${error.message}`);
    }
  }

  // 获取视频文件统计
  getVideoStats() {
    try {
      const stats = {
        original: { count: 0, totalSize: 0 },
        optimized: { count: 0, totalSize: 0 },
        thumbnails: { count: 0, totalSize: 0 },
        categories: {}
      };

      // 统计原始视频
      if (fs.existsSync(VIDEO_PATH)) {
        const categories = fs.readdirSync(VIDEO_PATH);
        
        for (const category of categories) {
          const categoryPath = path.join(VIDEO_PATH, category);
          if (fs.statSync(categoryPath).isDirectory()) {
            const files = fs.readdirSync(categoryPath);
            const videoFiles = files.filter(file => {
              const ext = path.extname(file).toLowerCase();
              return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
            });

            let categorySize = 0;
            for (const file of videoFiles) {
              const filePath = path.join(categoryPath, file);
              const fileStats = fs.statSync(filePath);
              categorySize += fileStats.size;
            }

            stats.categories[category] = {
              count: videoFiles.length,
              size: categorySize,
              sizeFormatted: this.formatBytes(categorySize)
            };

            stats.original.count += videoFiles.length;
            stats.original.totalSize += categorySize;
          }
        }
      }

      // 统计优化视频
      if (fs.existsSync(OPTIMIZED_PATH)) {
        const categories = fs.readdirSync(OPTIMIZED_PATH);
        
        for (const category of categories) {
          const categoryPath = path.join(OPTIMIZED_PATH, category);
          if (fs.statSync(categoryPath).isDirectory()) {
            const files = fs.readdirSync(categoryPath);
            
            let categorySize = 0;
            for (const file of files) {
              const filePath = path.join(categoryPath, file);
              const fileStats = fs.statSync(filePath);
              categorySize += fileStats.size;
            }

            stats.optimized.count += files.length;
            stats.optimized.totalSize += categorySize;
          }
        }
      }

      // 统计缩略图
      if (fs.existsSync(THUMBNAIL_PATH)) {
        const categories = fs.readdirSync(THUMBNAIL_PATH);
        
        for (const category of categories) {
          const categoryPath = path.join(THUMBNAIL_PATH, category);
          if (fs.statSync(categoryPath).isDirectory()) {
            const files = fs.readdirSync(categoryPath);
            
            let categorySize = 0;
            for (const file of files) {
              const filePath = path.join(categoryPath, file);
              const fileStats = fs.statSync(filePath);
              categorySize += fileStats.size;
            }

            stats.thumbnails.count += files.length;
            stats.thumbnails.totalSize += categorySize;
          }
        }
      }

      // 格式化大小
      stats.original.totalSizeFormatted = this.formatBytes(stats.original.totalSize);
      stats.optimized.totalSizeFormatted = this.formatBytes(stats.optimized.totalSize);
      stats.thumbnails.totalSizeFormatted = this.formatBytes(stats.thumbnails.totalSize);

      // 计算压缩率
      if (stats.original.totalSize > 0) {
        const savedSpace = stats.original.totalSize - stats.optimized.totalSize;
        stats.compressionRatio = ((savedSpace / stats.original.totalSize) * 100).toFixed(1);
        stats.savedSpace = this.formatBytes(savedSpace);
      }

      this.metrics.video = stats;
    } catch (error) {
      this.metrics.errors.push(`视频统计获取失败: ${error.message}`);
    }
  }

  // 格式化字节数
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 检查服务健康状态
  async checkServiceHealth() {
    try {
      // 检查Node.js进程
      const nodeProcesses = execSync('ps aux | grep "node.*server.js" | grep -v grep | wc -l', { encoding: 'utf8' }).trim();
      
      // 检查端口监听
      const portListening = execSync('netstat -tlnp | grep :3001 | wc -l', { encoding: 'utf8' }).trim();
      
      this.metrics.service = {
        nodeProcesses: parseInt(nodeProcesses) || 0,
        portListening: parseInt(portListening) > 0,
        timestamp: new Date().toISOString()
      };

      // 尝试HTTP请求检查
      try {
        const response = await fetch('http://localhost:3001/api/health');
        this.metrics.service.httpResponse = response.ok;
        this.metrics.service.httpStatus = response.status;
      } catch (error) {
        this.metrics.service.httpResponse = false;
        this.metrics.service.httpError = error.message;
      }
    } catch (error) {
      this.metrics.errors.push(`服务健康检查失败: ${error.message}`);
    }
  }

  // 运行所有检查
  async runAllChecks() {
    console.log('🔍 开始性能监控...');
    
    this.getSystemInfo();
    this.getDiskInfo();
    this.getNetworkInfo();
    this.getVideoStats();
    await this.checkServiceHealth();
    
    console.log('✅ 监控完成');
    return this.metrics;
  }

  // 生成报告
  generateReport() {
    const report = [];
    
    report.push('📊 服务器性能报告');
    report.push('=' .repeat(50));
    report.push(`⏰ 时间: ${this.metrics.timestamp}`);
    report.push('');
    
    // 系统信息
    if (this.metrics.system) {
      report.push('💻 系统信息:');
      report.push(`   CPU使用率: ${this.metrics.system.cpuUsage}%`);
      report.push(`   内存使用率: ${this.metrics.system.memoryUsage}%`);
      report.push(`   磁盘使用率: ${this.metrics.system.diskUsage}`);
      report.push(`   系统负载: ${this.metrics.system.loadAverage}`);
      report.push(`   运行时间: ${this.metrics.system.uptime}`);
      report.push('');
    }
    
    // 磁盘信息
    if (this.metrics.disk) {
      report.push('💾 磁盘空间:');
      for (const [name, info] of Object.entries(this.metrics.disk)) {
        if (info.exists) {
          report.push(`   ${name}: ${info.size}`);
        } else {
          report.push(`   ${name}: 不存在`);
        }
      }
      report.push('');
    }
    
    // 视频统计
    if (this.metrics.video) {
      const video = this.metrics.video;
      report.push('🎬 视频文件统计:');
      report.push(`   原始视频: ${video.original.count} 个文件, ${video.original.totalSizeFormatted}`);
      report.push(`   优化视频: ${video.optimized.count} 个文件, ${video.optimized.totalSizeFormatted}`);
      report.push(`   缩略图: ${video.thumbnails.count} 个文件, ${video.thumbnails.totalSizeFormatted}`);
      
      if (video.compressionRatio) {
        report.push(`   压缩率: ${video.compressionRatio}%`);
        report.push(`   节省空间: ${video.savedSpace}`);
      }
      
      report.push('');
      report.push('📂 分类统计:');
      for (const [category, stats] of Object.entries(video.categories)) {
        report.push(`   ${category}: ${stats.count} 个文件, ${stats.sizeFormatted}`);
      }
      report.push('');
    }
    
    // 服务状态
    if (this.metrics.service) {
      const service = this.metrics.service;
      report.push('🚀 服务状态:');
      report.push(`   Node.js进程: ${service.nodeProcesses} 个`);
      report.push(`   端口监听: ${service.portListening ? '✅' : '❌'}`);
      report.push(`   HTTP响应: ${service.httpResponse ? '✅' : '❌'}`);
      if (service.httpStatus) {
        report.push(`   HTTP状态码: ${service.httpStatus}`);
      }
      if (service.httpError) {
        report.push(`   HTTP错误: ${service.httpError}`);
      }
      report.push('');
    }
    
    // 网络信息
    if (this.metrics.network) {
      report.push('🌐 网络状态:');
      report.push(`   总连接数: ${this.metrics.network.totalConnections}`);
      report.push(`   服务端口活跃: ${this.metrics.network.port3001Active ? '✅' : '❌'}`);
      report.push('');
    }
    
    // 错误信息
    if (this.metrics.errors.length > 0) {
      report.push('❌ 错误信息:');
      for (const error of this.metrics.errors) {
        report.push(`   ${error}`);
      }
      report.push('');
    }
    
    return report.join('\n');
  }

  // 保存报告到文件
  saveReport(report) {
    try {
      const logEntry = `\n${'-'.repeat(80)}\n${report}\n`;
      fs.appendFileSync(LOG_FILE, logEntry);
      console.log(`📝 报告已保存到: ${LOG_FILE}`);
    } catch (error) {
      console.error('保存报告失败:', error);
    }
  }
}

// 主函数
async function main() {
  const monitor = new PerformanceMonitor();
  
  try {
    const metrics = await monitor.runAllChecks();
    const report = monitor.generateReport();
    
    console.log(report);
    monitor.saveReport(report);
    
    // 如果有错误，退出码为1
    if (metrics.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('监控脚本执行失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default PerformanceMonitor; 