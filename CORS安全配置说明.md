# CORS 安全配置说明

## 🔒 安全改进

我们已将您的后端从完全开放的CORS配置改为安全的白名单模式，只允许指定的域名访问您的API。

## 📋 当前允许的域名

默认配置包含以下域名：

```javascript
const allowedOrigins = [
  'http://localhost:5173',     // Vite开发服务器
  'http://localhost:4173',     // Vite预览服务器
  'http://127.0.0.1:5173',     // 本地IP
  'http://127.0.0.1:4173',     // 本地IP预览
  'https://your-domain.com',   // 您的生产域名（需要替换）
  'http://your-domain.com'     // 您的生产域名HTTP版本
];
```

## 🔧 域名管理

### 查看当前允许的域名
```bash
node manage-cors.js list
```

### 添加新域名
```bash
node manage-cors.js add https://example.com
node manage-cors.js add http://localhost:8080
```

### 移除域名
```bash
node manage-cors.js remove https://old-site.com
```

## 🚀 部署步骤

1. **使用安全部署脚本**：
   ```bash
   deploy-secure.bat
   ```

2. **替换示例域名**：
   在服务器上修改 `allowedOrigins` 数组中的 `your-domain.com` 为您的实际域名

3. **重启服务器**：
   ```bash
   pm2 restart video-backend
   ```

## 🔍 故障排查

### 如果出现CORS错误：

1. **检查域名是否在白名单中**：
   ```bash
   node manage-cors.js list
   ```

2. **查看服务器日志**：
   ```bash
   pm2 logs video-backend
   ```
   
   被阻止的请求会显示：`🚫 CORS blocked origin: https://unauthorized-site.com`

3. **添加缺失的域名**：
   ```bash
   node manage-cors.js add https://your-frontend-domain.com
   pm2 restart video-backend
   ```

## 📝 注意事项

### ✅ 安全最佳实践
- 只添加您信任的域名
- 使用HTTPS域名（生产环境）
- 定期检查和清理不需要的域名
- 监控服务器日志中的CORS阻止记录

### ⚠️ 常见问题
1. **域名格式要求**：必须包含协议（http:// 或 https://）
2. **大小写敏感**：域名必须完全匹配
3. **端口号**：如果使用非标准端口，必须包含端口号
4. **子域名**：每个子域名都需要单独添加

### 🔄 修改后必须重启
任何CORS配置修改后都需要重启服务器才能生效：
```bash
pm2 restart video-backend
```

## 🛡️ 安全级别对比

| 配置类型 | 安全性 | 便利性 | 适用场景 |
|---------|--------|--------|----------|
| 完全开放 (`origin: true`) | ❌ 低 | ✅ 高 | 仅开发测试 |
| 白名单模式 (当前配置) | ✅ 高 | ⚖️ 中等 | 生产环境推荐 |
| 单域名限制 | ✅ 最高 | ❌ 低 | 高安全要求 |

## 📞 技术支持

如果遇到问题，请：
1. 先查看服务器日志
2. 确认域名格式正确
3. 验证域名已添加到白名单
4. 确保服务器已重启

---

**当前配置**：安全白名单模式 ✅  
**最后更新**：$(date)  
**版本**：v1.0 