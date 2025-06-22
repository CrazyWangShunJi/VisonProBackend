#!/usr/bin/env node

/**
 * CORS域名管理工具
 * 用于安全地管理允许访问API的域名列表
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverFile = path.join(__dirname, 'server.js');

// 当前允许的域名列表
const getCurrentOrigins = () => {
  const content = fs.readFileSync(serverFile, 'utf8');
  const match = content.match(/const allowedOrigins = \[([\s\S]*?)\];/);
  if (match) {
    const originsText = match[1];
    const origins = originsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith("'") && line.includes('://'))
      .map(line => line.split("'")[1]);
    return origins;
  }
  return [];
};

// 添加新域名
const addOrigin = (newOrigin) => {
  const content = fs.readFileSync(serverFile, 'utf8');
  const currentOrigins = getCurrentOrigins();
  
  if (currentOrigins.includes(newOrigin)) {
    console.log(`❌ 域名 ${newOrigin} 已存在`);
    return false;
  }
  
  const newLine = `  '${newOrigin}',     // 添加于 ${new Date().toLocaleString()}`;
  const replacement = content.replace(
    /(const allowedOrigins = \[[\s\S]*?)(  'http[^']*'[^\n]*\n)/g,
    `$1$2${newLine}\n`
  );
  
  fs.writeFileSync(serverFile, replacement);
  console.log(`✅ 已添加域名: ${newOrigin}`);
  return true;
};

// 移除域名
const removeOrigin = (targetOrigin) => {
  const content = fs.readFileSync(serverFile, 'utf8');
  const currentOrigins = getCurrentOrigins();
  
  if (!currentOrigins.includes(targetOrigin)) {
    console.log(`❌ 域名 ${targetOrigin} 不存在`);
    return false;
  }
  
  const replacement = content.replace(
    new RegExp(`\\s*'${targetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^\\n]*\\n`, 'g'),
    ''
  );
  
  fs.writeFileSync(serverFile, replacement);
  console.log(`✅ 已移除域名: ${targetOrigin}`);
  return true;
};

// 列出所有域名
const listOrigins = () => {
  const origins = getCurrentOrigins();
  console.log('\n📋 当前允许的域名列表:');
  console.log('================================');
  if (origins.length === 0) {
    console.log('❌ 没有配置任何域名');
  } else {
    origins.forEach((origin, index) => {
      console.log(`${index + 1}. ${origin}`);
    });
  }
  console.log('================================\n');
};

// 命令行参数处理
const args = process.argv.slice(2);
const command = args[0];
const domain = args[1];

switch (command) {
  case 'list':
  case 'ls':
    listOrigins();
    break;
    
  case 'add':
    if (!domain) {
      console.log('❌ 请提供要添加的域名');
      console.log('用法: node manage-cors.js add https://example.com');
    } else {
      addOrigin(domain);
      listOrigins();
    }
    break;
    
  case 'remove':
  case 'rm':
    if (!domain) {
      console.log('❌ 请提供要移除的域名');
      console.log('用法: node manage-cors.js remove https://example.com');
    } else {
      removeOrigin(domain);
      listOrigins();
    }
    break;
    
  case 'help':
  case '--help':
  case '-h':
  default:
    console.log(`
🔒 CORS域名管理工具

用法:
  node manage-cors.js <command> [domain]

命令:
  list, ls              列出所有允许的域名
  add <domain>          添加新域名到允许列表
  remove, rm <domain>   从允许列表中移除域名
  help                  显示此帮助信息

示例:
  node manage-cors.js list
  node manage-cors.js add https://mysite.com
  node manage-cors.js add http://localhost:8080
  node manage-cors.js remove https://old-site.com

注意:
  - 域名必须包含协议 (http:// 或 https://)
  - 修改后需要重启服务器才能生效
  - 建议只添加您信任的域名
`);
    break;
} 