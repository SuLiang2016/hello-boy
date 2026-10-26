// 入口：托管 API 与前端构建产物，打印局域网访问地址
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const routes = require('./routes');
const { backupDaily } = require('./backup');
const content = require('./content');
const db = require('./db');

// 每次启动自动备份一份（WAL 先做检查点，保证备份文件完整）
try { backupDaily(db); } catch (e) { console.warn('自动备份失败：', e.message); }

// 启动自检：内容清单缺失会让所有读内容的接口 500，早点喊出来
try {
  content.loadContent();
} catch (e) {
  console.error('[启动自检] 内容清单加载失败：', e.message);
}

const app = express();
app.use(express.json());
app.use('/api', routes);
// API 出错时统一回 JSON（比如请求体不是合法 JSON）
app.use('/api', (err, req, res, next) => {
  const status = err.status || 500;
  // 5xx 记日志，否则线上出错时看 journalctl 一片空白
  if (status >= 500) {
    console.error(`[api] ${req.method} ${req.originalUrl} -> ${status} ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  }
  res.status(status).json({ error: status >= 500 ? '服务出错了，请稍后再试' : '请求内容有误' });
});

const DIST = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  // 前端是单页应用，其余路径都回 index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.send('还没有构建前端：请先运行 npm run build'));
}

let port = 4173;
// 监听地址：默认 0.0.0.0（家里局域网用）；云上放在 nginx 后面时用 127.0.0.1
let host = '0.0.0.0';
const cfgPath = path.join(__dirname, 'config.json');
if (fs.existsSync(cfgPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    port = cfg.port || port;
    host = cfg.host || host;
  } catch {}
}

app.listen(port, host, () => {
  console.log('========================================');
  console.log('  成语学习乐园 已启动');
  console.log(`  本机访问:  http://localhost:${port}`);
  if (host === '0.0.0.0') {
    const nets = os.networkInterfaces();
    for (const list of Object.values(nets)) {
      for (const net of list || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`  平板访问:  http://${net.address}:${port}`);
        }
      }
    }
    console.log('  （平板和电脑连同一个 WiFi，用浏览器打开上面的地址）');
  } else {
    console.log(`  监听地址:  ${host}（由反向代理对外提供服务）`);
  }
  console.log('========================================');
});
