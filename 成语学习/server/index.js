// 入口：托管 API 与前端构建产物，打印局域网访问地址
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const routes = require('./routes');
const { backupDaily } = require('./backup');
const db = require('./db');

// 每次启动自动备份一份（WAL 先做检查点，保证备份文件完整）
try { backupDaily(db); } catch (e) { console.warn('自动备份失败：', e.message); }

const app = express();
app.use(express.json());
app.use('/api', routes);
// API 出错时统一回 JSON（比如请求体不是合法 JSON）
app.use('/api', (err, req, res, next) => {
  res.status(err.status || 500).json({ error: '请求内容有误' });
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
const cfgPath = path.join(__dirname, 'config.json');
if (fs.existsSync(cfgPath)) {
  try { port = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).port || port; } catch {}
}

app.listen(port, '0.0.0.0', () => {
  console.log('========================================');
  console.log('  成语学习乐园 已启动');
  console.log(`  本机访问:  http://localhost:${port}`);
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  平板访问:  http://${net.address}:${port}`);
      }
    }
  }
  console.log('  （平板和电脑连同一个 WiFi，用浏览器打开上面的地址）');
  console.log('========================================');
});
