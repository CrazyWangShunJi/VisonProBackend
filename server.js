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

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - 提供媒体文件访问
app.use('/assets', express.static(MEDIA_BASE_PATH));

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

    const videos = videoFiles.map(file => ({
      id: `${category}_${Date.now()}_${Math.random()}`,
      name: file,
      url: `/assets/video/${category}/${file}`,
      size: fs.statSync(path.join(categoryDir, file)).size,
      type: 'video',
      category: category,
      categoryName: VIDEO_CATEGORIES[category]
    }));

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

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 视频照片后端服务启动成功！`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
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
}); 