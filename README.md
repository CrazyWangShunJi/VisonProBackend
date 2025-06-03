# VideoPro 后端服务

这是VideoPro项目的后端服务，基于Node.js + Express构建，主要用于提供图片和视频的展示服务。

## 🚀 功能特性

- **静态文件服务**: 提供PublicAssets文件夹中的图片和视频访问
- **RESTful API**: 提供获取媒体文件列表的接口
- **CORS支持**: 支持跨域请求，方便前端调用
- **文件类型过滤**: 自动识别和过滤支持的图片、视频格式

## 📁 项目结构

```
VisonProBackend/
├── PublicAssets/          # 媒体文件存储目录
│   ├── photo/            # 照片存储目录
│   └── video/            # 视频存储目录
├── server.js             # Express服务器主文件
├── package.json          # 项目依赖配置
└── README.md            # 项目说明文档
```

## 🛠️ 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 启动生产服务器

```bash
npm start
```

服务器默认运行在 `http://localhost:3001`

## 📊 API 接口

### 获取图片分类列表
- **GET** `/api/photo-categories`
- **描述**: 获取所有图片分类及其基本信息
- **返回**: 图片分类信息数组，包含分类名称、图片数量、封面图片等

### 获取分类下的图片
- **GET** `/api/photos/:category`
- **描述**: 获取指定分类下的所有图片文件
- **参数**: `category` - 分类英文名称（Documentary, landscapes, Meeting, people, wedding）
- **返回**: 该分类下的图片文件信息数组

### 获取所有照片
- **GET** `/api/photos`
- **描述**: 获取所有分类下的照片文件（向后兼容）
- **返回**: 所有照片文件信息数组

### 获取所有视频
- **GET** `/api/videos`  
- **描述**: 获取PublicAssets/video目录下的所有视频文件
- **返回**: 视频文件信息数组

### 获取所有媒体文件
- **GET** `/api/media`
- **描述**: 获取所有照片和视频文件
- **返回**: 所有媒体文件信息数组

### 健康检查
- **GET** `/api/health`
- **描述**: 检查服务器运行状态

### 静态文件访问
- **GET** `/assets/photo/{category}/{filename}`
- **GET** `/assets/video/{filename}`
- **描述**: 直接访问媒体文件

## 📝 响应格式

### 图片分类对象
```json
{
  "id": "Documentary",
  "name": "纪实",
  "englishName": "Documentary",
  "photoCount": 10,
  "coverImage": {
    "name": "photo1.jpg",
    "url": "/assets/photo/Documentary/photo1.jpg"
  }
}
```

### 媒体文件对象
```json
{
  "id": "unique_id",
  "name": "filename.jpg",
  "url": "/assets/photo/Documentary/filename.jpg",
  "size": 1024000,
  "type": "image",
  "category": "Documentary",
  "categoryName": "纪实"
}
```

## 🎯 支持的文件格式

### 图片格式
- JPG/JPEG
- PNG
- GIF
- WebP
- BMP

### 视频格式
- MP4
- AVI
- MOV
- WMV
- FLV
- WebM
- MKV

## 📚 使用说明

1. 将您的照片文件放入 `PublicAssets/photo/` 目录
2. 将您的视频文件放入 `PublicAssets/video/` 目录  
3. 启动服务器
4. 通过API获取文件列表或直接访问文件URL

## 🔧 开发说明

- 使用ES6模块语法
- 支持CORS跨域请求
- 自动文件类型识别
- 错误处理和日志记录
- 支持热重载开发（使用nodemon）

## 📁 目录结构

### 图片分类目录
```
PublicAssets/photo/
├── Documentary/     # 纪实类图片
├── landscapes/      # 风景类图片
├── Meeting/         # 会议类图片
├── people/          # 人物类图片
└── wedding/         # 婚礼类图片
```

### 支持的分类
- **Documentary** (纪实)
- **landscapes** (风景)
- **Meeting** (会议)
- **people** (人物)
- **wedding** (婚礼)