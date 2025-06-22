import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 媒体文件存储路径配置 - 支持环境变量配置
const MEDIA_BASE_PATH = process.env.MEDIA_BASE_PATH || path.join(__dirname, 'PublicAssets');
const PHOTO_PATH = path.join(MEDIA_BASE_PATH, 'photo');
const VIDEO_PATH = path.join(MEDIA_BASE_PATH, 'video');
const THUMBNAIL_PATH = path.join(MEDIA_BASE_PATH, 'thumbnails');
const OPTIMIZED_PATH = path.join(MEDIA_BASE_PATH, 'optimized');

// 图片分类配置
const PHOTO_CATEGORIES = {
  'Documentary': '纪实',
  'landscapes': '风景', 
  'Meeting': '会议',
  'people': '人物',
  'wedding': '婚礼'
};

// 视频分类配置
const VIDEO_CATEGORIES = {
  'activity': '活动',
  'TVC': '宣传片', 
  'short_video': '短视频'
};

// 中间件 - 安全的CORS配置
const allowedOrigins = [
  'http://localhost:5173',     // Vite开发服务器
  'http://localhost:4173',     // Vite预览服务器
  'http://127.0.0.1:5173',     // 本地IP
  'http://127.0.0.1:4173',     // 本地IP预览
  'http://xiangbai.cc',   // 您的生产域名（请替换为实际域名）
  'http://xiangbai.cc'     // 您的生产域名HTTP版本
];

app.use(cors({
  origin: function (origin, callback) {
    // 允许没有origin的请求（如移动应用、Postman等）
    if (!origin) return callback(null, true);
    
    // 检查origin是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'Origin', 
    'X-Requested-With', 
    'Range',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: [
    'Content-Range',
    'Accept-Ranges', 
    'Content-Length',
    'Content-Type',
    'Cache-Control',
    'Last-Modified',
    'ETag'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));
app.use(express.json());

// 额外的CORS处理中间件 - 更安全的版本
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // 只为允许的源设置CORS头
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Range');
    res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
  }
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// 静态文件服务 - 提供媒体文件访问，启用流媒体传输
app.use('/assets', express.static(MEDIA_BASE_PATH, {
  // 启用流媒体传输
  acceptRanges: true,
  // 设置缓存策略
  maxAge: '1d', // 1天缓存
  // 启用Etag
  etag: true,
  // 启用Last-Modified
  lastModified: true,
  // 设置缓存控制
  setHeaders: (res, path) => {
    // 对视频文件设置特殊的缓存策略
    if (path.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1小时缓存，减少服务器压力
      res.setHeader('Accept-Ranges', 'bytes'); // 支持范围请求
    }
    // 对图片文件设置缓存
    if (path.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7天
    }
  }
}));

// 优化后的视频文件访问
const OPTIMIZED_STATIC_PATH = process.env.OPTIMIZED_PATH || '/data/media/optimized';
app.use('/assets/optimized', express.static(OPTIMIZED_STATIC_PATH, {
  acceptRanges: true,
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}));

// 视频缩略图访问
const THUMBNAIL_STATIC_PATH = process.env.THUMBNAIL_PATH || '/data/media/thumbnails';
app.use('/assets/thumbnails', express.static(THUMBNAIL_STATIC_PATH, {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 确保媒体目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 创建目录: ${dirPath}`);
  }
}

// 初始化媒体目录
ensureDirectoryExists(PHOTO_PATH);
ensureDirectoryExists(VIDEO_PATH);

// 初始化分类目录
for (const categoryKey of Object.keys(PHOTO_CATEGORIES)) {
  ensureDirectoryExists(path.join(PHOTO_PATH, categoryKey));
}
for (const categoryKey of Object.keys(VIDEO_CATEGORIES)) {
  ensureDirectoryExists(path.join(VIDEO_PATH, categoryKey));
}

// 获取图片分类列表
app.get('/api/photo-categories', (req, res) => {
  try {
    if (!fs.existsSync(PHOTO_PATH)) {
      return res.json([]);
    }

    const categories = [];
    
    for (const [categoryKey, categoryName] of Object.entries(PHOTO_CATEGORIES)) {
      const categoryPath = path.join(PHOTO_PATH, categoryKey);
      
      if (fs.existsSync(categoryPath) && fs.statSync(categoryPath).isDirectory()) {
        // 获取该分类下的图片文件
        const files = fs.readdirSync(categoryPath);
        const photoFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
        });

        // 获取第一张图片作为封面
        let coverImage = null;
        if (photoFiles.length > 0) {
          const firstPhoto = photoFiles[0];
          coverImage = {
            name: firstPhoto,
            url: `/assets/photo/${categoryKey}/${firstPhoto}`
          };
        }

        categories.push({
          id: categoryKey,
          name: categoryName,
          englishName: categoryKey,
          photoCount: photoFiles.length,
          coverImage: coverImage
        });
      }
    }

    res.json(categories);
  } catch (error) {
    console.error('获取图片分类失败:', error);
    res.status(500).json({ error: '获取图片分类失败' });
  }
});

// 获取视频分类列表
app.get('/api/video-categories', (req, res) => {
  try {
    if (!fs.existsSync(VIDEO_PATH)) {
      return res.json([]);
    }

    const categories = [];
    
    for (const [categoryKey, categoryName] of Object.entries(VIDEO_CATEGORIES)) {
      const categoryPath = path.join(VIDEO_PATH, categoryKey);
      
      if (fs.existsSync(categoryPath) && fs.statSync(categoryPath).isDirectory()) {
        // 获取该分类下的视频文件
        const files = fs.readdirSync(categoryPath);
        const videoFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
        });

        // 获取第一个视频作为封面
        let coverVideo = null;
        if (videoFiles.length > 0) {
          const firstVideo = videoFiles[0];
          coverVideo = {
            name: firstVideo,
            url: `/assets/video/${categoryKey}/${firstVideo}`
          };
        }

        categories.push({
          id: categoryKey,
          name: categoryName,
          englishName: categoryKey,
          videoCount: videoFiles.length,
          coverVideo: coverVideo
        });
      }
    }

    res.json(categories);
  } catch (error) {
    console.error('获取视频分类失败:', error);
    res.status(500).json({ error: '获取视频分类失败' });
  }
});

// 获取某个分类下的所有图片
app.get('/api/photos/:category', (req, res) => {
  try {
    const category = req.params.category;
    
    // 验证分类是否有效
    if (!PHOTO_CATEGORIES[category]) {
      return res.status(404).json({ error: '分类不存在' });
    }

    const categoryDir = path.join(PHOTO_PATH, category);
    
    if (!fs.existsSync(categoryDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(categoryDir);
    const photoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
    });

    const photos = photoFiles.map(file => ({
      id: `${category}_${Date.now()}_${Math.random()}`,
      name: file,
      url: `/assets/photo/${category}/${file}`,
      size: fs.statSync(path.join(categoryDir, file)).size,
      type: 'image',
      category: category,
      categoryName: PHOTO_CATEGORIES[category]
    }));

    res.json(photos);
  } catch (error) {
    console.error('获取分类图片失败:', error);
    res.status(500).json({ error: '获取分类图片失败' });
  }
});

// 获取某个分类下的所有视频
app.get('/api/videos/:category', (req, res) => {
  try {
    const category = req.params.category;
    
    // 验证分类是否有效
    if (!VIDEO_CATEGORIES[category]) {
      return res.status(404).json({ error: '视频分类不存在' });
    }

    const categoryDir = path.join(VIDEO_PATH, category);
    
    if (!fs.existsSync(categoryDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(categoryDir);
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
    });

    const videos = videoFiles.map(file => {
      const filePath = path.join(categoryDir, file);
      const fileName = path.parse(file).name;
      
      // 检查是否有优化版本
      const optimizedVersions = [];
      const optimizedDir = `/data/media/optimized/${category}`;
      if (fs.existsSync(optimizedDir)) {
        const qualities = ['480p', '720p', '1080p'];
        for (const quality of qualities) {
          const optimizedFile = `${fileName}_${quality}${path.extname(file)}`;
          const optimizedPath = path.join(optimizedDir, optimizedFile);
          if (fs.existsSync(optimizedPath)) {
            optimizedVersions.push({
              quality: quality,
              url: `/assets/optimized/${category}/${optimizedFile}`,
              size: fs.statSync(optimizedPath).size
            });
          }
        }
      }
      
      // 检查缩略图
      let thumbnail = null;
      const thumbnailPath = `/data/media/thumbnails/${category}/${fileName}.jpg`;
      if (fs.existsSync(thumbnailPath)) {
        thumbnail = `/assets/thumbnails/${category}/${fileName}.jpg`;
      }

      return {
        id: `${category}_${Date.now()}_${Math.random()}`,
        name: file,
        url: `/assets/video/${category}/${file}`,
        size: fs.statSync(filePath).size,
        type: 'video',
        category: category,
        categoryName: VIDEO_CATEGORIES[category],
        optimizedVersions: optimizedVersions,
        thumbnail: thumbnail,
        // 添加流媒体URL和视频信息URL
        streamUrl: `/api/stream/${category}/${file}`,
        infoUrl: `/api/video-info/${category}/${file}`
      };
    });

    res.json(videos);
  } catch (error) {
    console.error('获取分类视频失败:', error);
    res.status(500).json({ error: '获取分类视频失败' });
  }
});

// 获取所有照片列表（保持向后兼容，现在从所有分类中获取）
app.get('/api/photos', (req, res) => {
  try {
    if (!fs.existsSync(PHOTO_PATH)) {
      return res.json([]);
    }

    const allPhotos = [];

    // 遍历所有分类目录
    for (const [categoryKey, categoryName] of Object.entries(PHOTO_CATEGORIES)) {
      const categoryPath = path.join(PHOTO_PATH, categoryKey);
      
      if (fs.existsSync(categoryPath) && fs.statSync(categoryPath).isDirectory()) {
        const files = fs.readdirSync(categoryPath);
        const photoFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
        });

        const categoryPhotos = photoFiles.map(file => ({
          id: `${categoryKey}_${Date.now()}_${Math.random()}`,
          name: file,
          url: `/assets/photo/${categoryKey}/${file}`,
          size: fs.statSync(path.join(categoryPath, file)).size,
          type: 'image',
          category: categoryKey,
          categoryName: categoryName
        }));

        allPhotos.push(...categoryPhotos);
      }
    }

    res.json(allPhotos);
  } catch (error) {
    console.error('获取照片列表失败:', error);
    res.status(500).json({ error: '获取照片列表失败' });
  }
});

// 获取所有视频列表（修改为支持分类）
app.get('/api/videos', (req, res) => {
  try {
    if (!fs.existsSync(VIDEO_PATH)) {
      return res.json([]);
    }

    const allVideos = [];

    // 遍历所有视频分类目录
    for (const [categoryKey, categoryName] of Object.entries(VIDEO_CATEGORIES)) {
      const categoryPath = path.join(VIDEO_PATH, categoryKey);
      
      if (fs.existsSync(categoryPath) && fs.statSync(categoryPath).isDirectory()) {
        const files = fs.readdirSync(categoryPath);
        const videoFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
        });

        const categoryVideos = videoFiles.map(file => ({
          id: `${categoryKey}_${Date.now()}_${Math.random()}`,
          name: file,
          url: `/assets/video/${categoryKey}/${file}`,
          size: fs.statSync(path.join(categoryPath, file)).size,
          type: 'video',
          category: categoryKey,
          categoryName: categoryName
        }));

        allVideos.push(...categoryVideos);
      }
    }

    // 如果没有分类视频，检查根目录下的视频（向后兼容）
    if (allVideos.length === 0) {
      const files = fs.readdirSync(VIDEO_PATH);
      const videoFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
      });

      const rootVideos = videoFiles.map(file => ({
        id: Date.now() + Math.random(),
        name: file,
        url: `/assets/video/${file}`,
        size: fs.statSync(path.join(VIDEO_PATH, file)).size,
        type: 'video',
        category: 'uncategorized',
        categoryName: '未分类'
      }));

      allVideos.push(...rootVideos);
    }

    res.json(allVideos);
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({ error: '获取视频列表失败' });
  }
});

// 获取所有媒体文件（照片+视频）
app.get('/api/media', async (req, res) => {
  try {
    // 并行获取照片和视频
    const [photosResponse, videosResponse] = await Promise.all([
      new Promise((resolve) => {
        const allPhotos = [];

        if (fs.existsSync(PHOTO_PATH)) {
          // 遍历所有分类目录
          for (const [categoryKey, categoryName] of Object.entries(PHOTO_CATEGORIES)) {
            const categoryPath = path.join(PHOTO_PATH, categoryKey);
            
            if (fs.existsSync(categoryPath) && fs.statSync(categoryPath).isDirectory()) {
              const files = fs.readdirSync(categoryPath);
              const photoFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
              });

              const categoryPhotos = photoFiles.map(file => ({
                id: `photo_${categoryKey}_${Date.now()}_${Math.random()}`,
                name: file,
                url: `/assets/photo/${categoryKey}/${file}`,
                size: fs.statSync(path.join(categoryPath, file)).size,
                type: 'image',
                category: categoryKey,
                categoryName: categoryName
              }));

              allPhotos.push(...categoryPhotos);
            }
          }
        }
        resolve(allPhotos);
      }),
      new Promise((resolve) => {
        if (!fs.existsSync(VIDEO_PATH)) {
          resolve([]);
          return;
        }
        
        const allVideos = [];

        // 遍历所有视频分类目录
        for (const [categoryKey, categoryName] of Object.entries(VIDEO_CATEGORIES)) {
          const categoryPath = path.join(VIDEO_PATH, categoryKey);
          
          if (fs.existsSync(categoryPath) && fs.statSync(categoryPath).isDirectory()) {
            const files = fs.readdirSync(categoryPath);
            const videoFiles = files.filter(file => {
              const ext = path.extname(file).toLowerCase();
              return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
            });

            const categoryVideos = videoFiles.map(file => ({
              id: `video_${categoryKey}_${Date.now()}_${Math.random()}`,
              name: file,
              url: `/assets/video/${categoryKey}/${file}`,
              size: fs.statSync(path.join(categoryPath, file)).size,
              type: 'video',
              category: categoryKey,
              categoryName: categoryName
            }));

            allVideos.push(...categoryVideos);
          }
        }

        // 如果没有分类视频，检查根目录（向后兼容）
        if (allVideos.length === 0) {
          const files = fs.readdirSync(VIDEO_PATH);
          const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
          });
          
          const rootVideos = videoFiles.map(file => ({
            id: `video_${Date.now()}_${Math.random()}`,
            name: file,
            url: `/assets/video/${file}`,
            size: fs.statSync(path.join(VIDEO_PATH, file)).size,
            type: 'video',
            category: 'uncategorized',
            categoryName: '未分类'
          }));
          
          allVideos.push(...rootVideos);
        }

        resolve(allVideos);
      })
    ]);

    const allMedia = [...photosResponse, ...videosResponse];
    res.json(allMedia);
  } catch (error) {
    console.error('获取媒体文件失败:', error);
    res.status(500).json({ error: '获取媒体文件失败' });
  }
});

// 视频流媒体播放接口 - 优化版本
app.get('/api/stream/:category/:filename', (req, res) => {
  try {
    const { category, filename } = req.params;
    const videoPath = path.join(VIDEO_PATH, category, filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: '视频文件不存在' });
    }
    
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    console.log(`🎬 请求视频流: ${filename}, 文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    
    if (range) {
      // 支持范围请求，实现视频流播放
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024, fileSize - 1); // 1MB chunks
      const chunksize = (end - start) + 1;
      
      console.log(`📦 发送视频块: ${start}-${end}/${fileSize} (${(chunksize / 1024).toFixed(2)}KB)`);
      
      const file = fs.createReadStream(videoPath, { start, end, highWaterMark: 64 * 1024 }); // 64KB buffer
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=3600', // 1小时缓存
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      };
      
      res.writeHead(206, head);
      
      // 错误处理
      file.on('error', (err) => {
        console.error('视频流读取错误:', err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      
      file.pipe(res);
    } else {
      // 普通请求 - 也使用流式传输
      console.log(`📺 发送完整视频: ${filename}`);
      
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Connection': 'keep-alive'
      };
      
      res.writeHead(200, head);
      
      const stream = fs.createReadStream(videoPath, { highWaterMark: 64 * 1024 });
      
      stream.on('error', (err) => {
        console.error('视频流读取错误:', err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      
      stream.pipe(res);
    }
  } catch (error) {
    console.error('视频流播放失败:', error);
    res.status(500).json({ error: '视频流播放失败' });
  }
});

// 获取视频缩略图接口
app.get('/api/thumbnail/:category/:filename', (req, res) => {
  try {
    const { category, filename } = req.params;
    const videoName = path.basename(filename, path.extname(filename));
    const thumbnailPath = path.join(THUMBNAIL_PATH, category, `${videoName}.jpg`);
    
    if (fs.existsSync(thumbnailPath)) {
      // 返回缩略图
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7天缓存
      fs.createReadStream(thumbnailPath).pipe(res);
    } else {
      // 返回默认占位符或404
      res.status(404).json({ error: '缩略图不存在' });
    }
  } catch (error) {
    console.error('获取视频缩略图失败:', error);
    res.status(500).json({ error: '获取视频缩略图失败' });
  }
});

// 获取优化后的视频接口
app.get('/api/optimized/:category/:filename', (req, res) => {
  try {
    const { category, filename } = req.params;
    const quality = req.query.quality || '480p'; // 默认480p
    
    console.log(`🎯 请求优化视频: category=${category}, filename=${filename}, quality=${quality}`);
    
    const videoName = path.basename(filename, path.extname(filename));
    const videoExt = path.extname(filename);
    const optimizedFileName = `${videoName}_${quality}${videoExt}`;
    const optimizedPath = path.join('/data/media/optimized', category, optimizedFileName);
    
    console.log(`📁 查找优化文件: ${optimizedPath}`);
    
    if (fs.existsSync(optimizedPath)) {
      // 返回优化后的视频（使用与原始流媒体相同的逻辑）
      const stat = fs.statSync(optimizedPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      console.log(`🎬 请求优化视频: ${optimizedFileName}, 文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 512 * 1024, fileSize - 1); // 512KB chunks for optimized videos
        const chunksize = (end - start) + 1;
        
        const file = fs.createReadStream(optimizedPath, { start, end, highWaterMark: 32 * 1024 }); // 32KB buffer
        
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=7200', // 2小时缓存
          'Connection': 'keep-alive'
        };
        
        res.writeHead(206, head);
        file.on('error', (err) => {
          console.error('优化视频流读取错误:', err);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=7200'
        };
        
        res.writeHead(200, head);
        const stream = fs.createReadStream(optimizedPath, { highWaterMark: 32 * 1024 });
        stream.on('error', (err) => {
          console.error('优化视频流读取错误:', err);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });
        stream.pipe(res);
      }
    } else {
      // 如果优化版本不存在，回退到原始视频
      res.redirect(`/api/stream/${category}/${filename}`);
    }
  } catch (error) {
    console.error('获取优化视频失败:', error);
    res.status(500).json({ error: '获取优化视频失败' });
  }
});

// 获取视频信息接口
app.get('/api/video-info/:category/:filename', (req, res) => {
  try {
    const { category, filename } = req.params;
    const videoPath = path.join(VIDEO_PATH, category, filename);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: '视频文件不存在' });
    }
    
    const stat = fs.statSync(videoPath);
    const videoName = path.basename(filename, path.extname(filename));
    
    // 检查可用的优化版本
    const availableQualities = [];
    const qualities = ['240p', '360p', '480p', '720p'];
    
    for (const quality of qualities) {
      const optimizedFileName = `${videoName}_${quality}${path.extname(filename)}`;
      const optimizedPath = path.join('/data/media/optimized', category, optimizedFileName);
      if (fs.existsSync(optimizedPath)) {
        availableQualities.push(quality);
      }
    }
    
    // 检查缩略图
    const thumbnailPath = path.join('/data/media/thumbnails', category, `${videoName}.jpg`);
    const hasThumbnail = fs.existsSync(thumbnailPath);
    
    const videoInfo = {
      filename: filename,
      size: stat.size,
      mtime: stat.mtime,
      category: category,
      categoryName: VIDEO_CATEGORIES[category] || category,
      streamUrl: `/api/stream/${category}/${filename}`,
      directUrl: `/assets/video/${category}/${filename}`,
      thumbnailUrl: hasThumbnail ? `/api/thumbnail/${category}/${filename}` : null,
      availableQualities: availableQualities,
      optimizedUrls: availableQualities.reduce((urls, quality) => {
        urls[quality] = `/api/optimized/${category}/${filename}?quality=${quality}`;
        return urls;
      }, {})
    };
    
    res.json(videoInfo);
  } catch (error) {
    console.error('获取视频信息失败:', error);
    res.status(500).json({ error: '获取视频信息失败' });
  }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '视频照片服务运行正常',
    timestamp: new Date().toISOString(),
    mediaPath: MEDIA_BASE_PATH,
    photoCategories: Object.keys(PHOTO_CATEGORIES),
    videoCategories: Object.keys(VIDEO_CATEGORIES)
  });
});

// 启动服务器 - 绑定到所有网络接口
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 视频照片后端服务启动成功！`);
  console.log(`📍 本地地址: http://localhost:${PORT}`);
  console.log(`📍 外网地址: http://0.0.0.0:${PORT}`);
  console.log(`📁 媒体文件目录: ${MEDIA_BASE_PATH}`);
  console.log(`📷 图片目录: ${PHOTO_PATH}`);
  console.log(`🎬 视频目录: ${VIDEO_PATH}`);
  console.log(`📊 API端点:`);
  console.log(`   - GET /api/health - 健康检查`);
  console.log(`   - GET /api/photo-categories - 获取图片分类`);
  console.log(`   - GET /api/video-categories - 获取视频分类`);
  console.log(`   - GET /api/photos/:category - 获取分类图片`);
  console.log(`   - GET /api/videos/:category - 获取分类视频`);
  console.log(`   - GET /api/photos - 获取所有照片`);
  console.log(`   - GET /api/videos - 获取所有视频`);
  console.log(`   - GET /api/media - 获取所有媒体文件`);
  console.log(`   - GET /assets/* - 静态文件访问`);
  console.log(`🌐 服务器已绑定到所有网络接口，可以接受外部连接`);
}); 