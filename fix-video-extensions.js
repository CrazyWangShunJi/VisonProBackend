import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 修复视频扩展名检测脚本
 * 将所有文件中的视频扩展名检测改为支持大写扩展名
 */

console.log('🔧 开始修复视频扩展名检测...');

// 需要修复的文件列表
const filesToFix = [
  'server.js',
  'generate-thumbnails.js',
  'performance-optimizer.js',
  'ultra-performance-optimizer.js'
];

// 旧的扩展名检测模式
const oldPatterns = [
  /\[['"][.]mp4['"],\s*['"][.]avi['"],\s*['"][.]mov['"],\s*['"][.]wmv['"],\s*['"][.]flv['"],\s*['"][.]webm['"],\s*['"][.]mkv['"]\]/g,
  /\[['"][.]mp4['"],\s*['"][.]avi['"],\s*['"][.]mov['"],\s*['"][.]wmv['"],\s*['"][.]flv['"],\s*['"][.]webm['"],\s*['"][.]mkv['"],\s*['"][.]m4v['"]\]/g,
  /const\s+ext\s*=\s*path\.extname\([^)]+\)\.toLowerCase\(\)/g
];

// 新的扩展名检测模式
const newExtensionArray = `['.mp4', '.MP4', '.avi', '.AVI', '.mov', '.MOV', '.wmv', '.WMV', '.flv', '.FLV', '.webm', '.WEBM', '.mkv', '.MKV', '.m4v', '.M4V']`;

// 修复函数
function fixVideoExtensions() {
  let totalFixed = 0;
  
  for (const filename of filesToFix) {
    const filePath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️ 跳过不存在的文件: ${filename}`);
      continue;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let hasChanges = false;
      
      // 修复扩展名数组
      const oldArrayPattern = /\[['"][.]mp4['"][^[\]]*\]/g;
      if (oldArrayPattern.test(content)) {
        content = content.replace(oldArrayPattern, newExtensionArray);
        hasChanges = true;
      }
      
      // 修复扩展名检测逻辑，移除toLowerCase()
      const lowercasePattern = /const\s+ext\s*=\s*path\.extname\([^)]+\)\.toLowerCase\(\)/g;
      content = content.replace(lowercasePattern, (match) => {
        const varMatch = match.match(/path\.extname\(([^)]+)\)/);
        if (varMatch) {
          hasChanges = true;
          return `const ext = path.extname(${varMatch[1]})`;
        }
        return match;
      });
      
      // 修复includes检测，确保直接比较而不转换大小写
      const includesPattern = /return\s+\[['"][.]mp4['"][^[\]]*\]\.includes\(ext\)/g;
      if (includesPattern.test(content)) {
        content = content.replace(includesPattern, `return ${newExtensionArray}.includes(ext)`);
        hasChanges = true;
      }
      
      if (hasChanges) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ 已修复: ${filename}`);
        totalFixed++;
      } else {
        console.log(`📋 无需修复: ${filename}`);
      }
      
    } catch (error) {
      console.error(`❌ 修复失败 ${filename}:`, error.message);
    }
  }
  
  console.log(`\n🎉 修复完成！共修复了 ${totalFixed} 个文件`);
  
  // 生成修复报告
  generateFixReport();
}

function generateFixReport() {
  const report = {
    timestamp: new Date().toISOString(),
    description: '视频扩展名检测修复',
    changes: [
      '支持大写视频扩展名 (.MP4, .AVI, .MOV等)',
      '移除toLowerCase()强制转换',
      '统一使用完整扩展名列表',
      '修复文件检测逻辑'
    ],
    supportedExtensions: [
      '.mp4', '.MP4',
      '.avi', '.AVI', 
      '.mov', '.MOV',
      '.wmv', '.WMV',
      '.flv', '.FLV',
      '.webm', '.WEBM',
      '.mkv', '.MKV',
      '.m4v', '.M4V'
    ],
    nextSteps: [
      '重启后端服务',
      '测试大写扩展名视频文件',
      '验证缩略图生成功能',
      '检查视频播放功能'
    ]
  };
  
  const reportPath = path.join(__dirname, 'fix-extensions-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📄 修复报告已生成:', reportPath);
  console.log('\n💡 下一步操作:');
  console.log('  1. 重启后端服务');
  console.log('  2. 测试大写扩展名的视频文件');
  console.log('  3. 检查视频缩略图显示');
  console.log('  4. 验证视频播放功能');
}

// 运行修复
fixVideoExtensions(); 