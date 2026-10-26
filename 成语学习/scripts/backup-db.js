// 部署前给数据库留一份一致性快照：VACUUM INTO 会把 WAL 里已提交的内容一起落盘，
// 直接 cp app.db 会丢掉这部分（生产库 WAL 常态几百 KB）。
// 用法：
//   node --experimental-sqlite scripts/backup-db.js [tag]    备份到 <data>/backup/pre-deploy-<tag>.db
//   node --experimental-sqlite scripts/backup-db.js --check  只读打印当前库各表行数（部署后对账用）
// 默认数据目录 ../data，可用 CYLY_DATA_DIR 覆盖。只读源库、不停服务，可以在服务运行中执行。
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.CYLY_DATA_DIR || path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const src = path.join(DATA_DIR, 'app.db');

const TABLES = ['parents', 'kids', 'learned', 'daily', 'daily_board', 'badges', 'star_events', 'outfits', 'chain_plays', 'sessions'];

function countsOf(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const counts = {};
  for (const t of TABLES) {
    try { counts[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n; } catch { counts[t] = null; }
  }
  db.close();
  return counts;
}

if (!fs.existsSync(src)) {
  console.error(`找不到数据库：${src}`);
  process.exit(1);
}

if (process.argv[2] === '--check') {
  console.log(JSON.stringify(countsOf(src)));
  process.exit(0);
}

const ts = new Date()
  .toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }) // sv-SE 即 YYYY-MM-DD HH:mm:ss
  .replace(/[-: ]/g, '')
  .slice(0, 14);
const tag = process.argv[2] || ts;
const dest = path.join(BACKUP_DIR, `pre-deploy-${tag}.db`);

if (fs.existsSync(dest)) {
  console.error(`备份已存在，拒绝覆盖：${dest}`);
  process.exit(1);
}
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const db = new DatabaseSync(src);
db.exec(`VACUUM INTO '${dest}'`);
db.close();

// 顺手打一份行数快照：部署后回来对一把，确认数据没被碰过
console.log(JSON.stringify({ dest, size: fs.statSync(dest).size, counts: countsOf(dest) }, null, 1));
