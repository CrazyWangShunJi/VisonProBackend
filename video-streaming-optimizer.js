import fs from 'fs';
import path from 'path';

/**
 * 视频流优化器
 * 提供智能的视频流处理和自适应优化
 */
export class VideoStreamingOptimizer {
  constructor() {
    // 动态缓冲区配置
    this.bufferConfig = {
      // 基础缓冲区大小（KB）
      base: 128,
      // 最小缓冲区
      min: 64,
      // 最大缓冲区
      max: 512,
      // 质量倍数
      qualityMultipliers: {
        '240p': 0.5,
        '360p': 0.75,
        '480p': 1.0,
        '720p': 1.5,
        '1080p': 2.0
      }
    };

    // 连接状态追踪
    this.connectionStats = new Map();
    
    // 自适应配置
    this.adaptiveConfig = {
      // 网络速度阈值（KB/s）
      speedThresholds: {
        slow: 200,    // < 200KB/s
        medium: 800,  // 200-800KB/s  
        fast: 2000    // > 800KB/s
      },
      // 缓冲健康度阈值
      bufferThresholds: {
        critical: 2,  // 2秒
        low: 5,       // 5秒
        healthy: 10   // 10秒
      }
    };
  }

  /**
   * 计算动态缓冲区大小
   */
  calculateBufferSize(quality = '480p', networkSpeed = 'medium', clientId = null) {
    let bufferSize = this.bufferConfig.base;
    
    // 根据质量调整
    const qualityMultiplier = this.bufferConfig.qualityMultipliers[quality] || 1.0;
    bufferSize *= qualityMultiplier;
    
    // 根据网络速度调整
    const speedMultipliers = {
      'slow': 0.5,
      'medium': 1.0,
      'fast': 1.5
    };
    bufferSize *= speedMultipliers[networkSpeed] || 1.0;
    
    // 根据客户端历史性能调整
    if (clientId && this.connectionStats.has(clientId)) {
      const stats = this.connectionStats.get(clientId);
      if (stats.avgSpeed < this.adaptiveConfig.speedThresholds.slow) {
        bufferSize *= 0.7; // 减小缓冲区
      } else if (stats.avgSpeed > this.adaptiveConfig.speedThresholds.fast) {
        bufferSize *= 1.3; // 增大缓冲区
      }
    }
    
    // 确保在合理范围内
    bufferSize = Math.max(this.bufferConfig.min, Math.min(this.bufferConfig.max, bufferSize));
    
    return Math.round(bufferSize * 1024); // 转换为字节
  }

  /**
   * 计算智能分片大小
   */
  calculateChunkSize(quality = '480p', networkSpeed = 'medium', range = null) {
    const baseChunkSizes = {
      '240p': 256 * 1024,   // 256KB
      '360p': 512 * 1024,   // 512KB
      '480p': 1024 * 1024,  // 1MB
      '720p': 2048 * 1024,  // 2MB
      '1080p': 4096 * 1024  // 4MB
    };
    
    let chunkSize = baseChunkSizes[quality] || baseChunkSizes['480p'];
    
    // 根据网络速度调整分片大小
    const speedMultipliers = {
      'slow': 0.5,
      'medium': 1.0,
      'fast': 2.0
    };
    chunkSize *= speedMultipliers[networkSpeed] || 1.0;
    
    // 如果是范围请求，考虑请求的范围大小
    if (range) {
      const requestedSize = range.end - range.start + 1;
      chunkSize = Math.min(chunkSize, requestedSize);
    }
    
    return Math.round(chunkSize);
  }

  /**
   * 更新连接统计
   */
  updateConnectionStats(clientId, bytesTransferred, duration) {
    if (!this.connectionStats.has(clientId)) {
      this.connectionStats.set(clientId, {
        totalBytes: 0,
        totalTime: 0,
        requestCount: 0,
        avgSpeed: 0,
        lastUpdate: Date.now()
      });
    }
    
    const stats = this.connectionStats.get(clientId);
    stats.totalBytes += bytesTransferred;
    stats.totalTime += duration;
    stats.requestCount++;
    stats.avgSpeed = stats.totalBytes / (stats.totalTime / 1000); // KB/s
    stats.lastUpdate = Date.now();
    
    // 清理过期统计（超过1小时）
    this.cleanupExpiredStats();
  }

  /**
   * 清理过期统计数据
   */
  cleanupExpiredStats() {
    const now = Date.now();
    const expireTime = 60 * 60 * 1000; // 1小时
    
    for (const [clientId, stats] of this.connectionStats.entries()) {
      if (now - stats.lastUpdate > expireTime) {
        this.connectionStats.delete(clientId);
      }
    }
  }

  /**
   * 获取推荐的视频质量
   */
  getRecommendedQuality(clientId, availableQualities = ['240p', '360p', '480p', '720p']) {
    if (!this.connectionStats.has(clientId)) {
      return '480p'; // 默认质量
    }
    
    const stats = this.connectionStats.get(clientId);
    const speed = stats.avgSpeed;
    
    // 根据网络速度推荐质量
    if (speed > this.adaptiveConfig.speedThresholds.fast) {
      return availableQualities.includes('720p') ? '720p' : availableQualities[availableQualities.length - 1];
    } else if (speed > this.adaptiveConfig.speedThresholds.medium) {
      return availableQualities.includes('480p') ? '480p' : '360p';
    } else if (speed > this.adaptiveConfig.speedThresholds.slow) {
      return availableQualities.includes('360p') ? '360p' : '240p';
    } else {
      return '240p';
    }
  }

  /**
   * 优化响应头
   */
  getOptimizedHeaders(fileSize, quality = '480p', networkSpeed = 'medium') {
    const headers = {
      'Accept-Ranges': 'bytes',
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      'Connection': 'keep-alive'
    };
    
    // 根据质量和网络状况调整缓存策略
    if (quality === '240p' || networkSpeed === 'slow') {
      headers['Cache-Control'] = 'public, max-age=7200, stale-while-revalidate=172800';
    } else if (quality === '720p' && networkSpeed === 'fast') {
      headers['Cache-Control'] = 'public, max-age=1800, stale-while-revalidate=3600';
    }
    
    // 添加压缩支持
    headers['Vary'] = 'Accept-Encoding';
    
    return headers;
  }

  /**
   * 创建优化的读取流
   */
  createOptimizedStream(filePath, options = {}) {
    const {
      start = 0,
      end,
      quality = '480p',
      networkSpeed = 'medium',
      clientId = null
    } = options;
    
    const bufferSize = this.calculateBufferSize(quality, networkSpeed, clientId);
    
    const streamOptions = {
      start,
      end,
      highWaterMark: bufferSize,
      // 启用自动销毁
      autoDestroy: true,
      // 启用对象模式以获得更好的性能
      objectMode: false
    };
    
    const stream = fs.createReadStream(filePath, streamOptions);
    
    // 添加性能监控
    let bytesRead = 0;
    const startTime = Date.now();
    
    stream.on('data', (chunk) => {
      bytesRead += chunk.length;
    });
    
    stream.on('end', () => {
      const duration = Date.now() - startTime;
      if (clientId) {
        this.updateConnectionStats(clientId, bytesRead, duration);
      }
    });
    
    return stream;
  }

  /**
   * 获取客户端ID（基于IP和User-Agent）
   */
  getClientId(req) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return Buffer.from(`${ip}:${userAgent}`).toString('base64').slice(0, 16);
  }

  /**
   * 检测网络质量
   */
  detectNetworkQuality(clientId) {
    if (!this.connectionStats.has(clientId)) {
      return 'medium';
    }
    
    const stats = this.connectionStats.get(clientId);
    const speed = stats.avgSpeed;
    
    if (speed > this.adaptiveConfig.speedThresholds.fast) {
      return 'fast';
    } else if (speed > this.adaptiveConfig.speedThresholds.slow) {
      return 'medium';
    } else {
      return 'slow';
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const totalConnections = this.connectionStats.size;
    let totalBytes = 0;
    let avgSpeed = 0;
    
    for (const stats of this.connectionStats.values()) {
      totalBytes += stats.totalBytes;
      avgSpeed += stats.avgSpeed;
    }
    
    return {
      totalConnections,
      totalBytes,
      avgSpeed: totalConnections > 0 ? avgSpeed / totalConnections : 0,
      activeConnections: totalConnections
    };
  }
}

// 创建全局实例
export const streamingOptimizer = new VideoStreamingOptimizer(); 