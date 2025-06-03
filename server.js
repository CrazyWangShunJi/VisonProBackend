import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 图片分类配置
const PHOTO_CATEGORIES = {
  'Documentary': '纪实',
  'landscapes': '风景', 
  'Meeting': '会议',
  'people': '人物',
  'wedding': '婚礼'
};

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - 提供PublicAssets中的文件访问
app.use('/assets', express.static(path.join(__dirname, 'PublicAssets')));

// 获取图片分类列表
app.get('/api/photo-categories', (req, res) => {
  try {
    const photoDir = path.join(__dirname, 'PublicAssets', 'photo');
    
    if (!fs.existsSync(photoDir)) {
      return res.json([]);
    }

    const categories = [];
    
    for (const [categoryKey, categoryName] of Object.entries(PHOTO_CATEGORIES)) {
      const categoryPath = path.join(photoDir, categoryKey);
      
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

// 获取某个分类下的所有图片
app.get('/api/photos/:category', (req, res) => {
  try {
    const category = req.params.category;
    
    // 验证分类是否有效
    if (!PHOTO_CATEGORIES[category]) {
      return res.status(404).json({ error: '分类不存在' });
    }

    const categoryDir = path.join(__dirname, 'PublicAssets', 'photo', category);
    
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

// 获取所有照片列表（保持向后兼容，现在从所有分类中获取）
app.get('/api/photos', (req, res) => {
  try {
    const photoDir = path.join(__dirname, 'PublicAssets', 'photo');
    
    if (!fs.existsSync(photoDir)) {
      return res.json([]);
    }

    const allPhotos = [];

    // 遍历所有分类目录
    for (const [categoryKey, categoryName] of Object.entries(PHOTO_CATEGORIES)) {
      const categoryPath = path.join(photoDir, categoryKey);
      
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

// 获取所有视频列表
app.get('/api/videos', (req, res) => {
  try {
    const videoDir = path.join(__dirname, 'PublicAssets', 'video');
    
    if (!fs.existsSync(videoDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(videoDir);
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
    });

    const videos = videoFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file,
      url: `/assets/video/${file}`,
      size: fs.statSync(path.join(videoDir, file)).size,
      type: 'video'
    }));

    res.json(videos);
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
        const photoDir = path.join(__dirname, 'PublicAssets', 'photo');
        const allPhotos = [];

        if (fs.existsSync(photoDir)) {
          // 遍历所有分类目录
          for (const [categoryKey, categoryName] of Object.entries(PHOTO_CATEGORIES)) {
            const categoryPath = path.join(photoDir, categoryKey);
            
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
        const videoDir = path.join(__dirname, 'PublicAssets', 'video');
        if (!fs.existsSync(videoDir)) {
          resolve([]);
          return;
        }
        const files = fs.readdirSync(videoDir);
        const videoFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext);
        });
        const videos = videoFiles.map(file => ({
          id: `video_${Date.now()}_${Math.random()}`,
          name: file,
          url: `/assets/video/${file}`,
          size: fs.statSync(path.join(videoDir, file)).size,
          type: 'video'
        }));
        resolve(videos);
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
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 视频照片后端服务启动成功！`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📁 静态文件目录: ${path.join(__dirname, 'PublicAssets')}`);
  console.log(`📊 API端点:`);
  console.log(`   - GET /api/health - 健康检查`);
  console.log(`   - GET /api/photo-categories - 获取图片分类`);
  console.log(`   - GET /api/photos/:category - 获取分类图片`);
  console.log(`   - GET /api/photos - 获取所有照片`);
  console.log(`   - GET /api/videos - 获取视频列表`);
  console.log(`   - GET /api/media - 获取所有媒体文件`);
  console.log(`   - GET /assets/* - 静态文件访问`);
}); 