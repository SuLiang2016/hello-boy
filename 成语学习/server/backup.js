// 启动时自动备份：app.db 检查点后按日复制，保留最近 7 份
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.CYLY_DATA_DIR || path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const KEEP = 7;

function backupDaily(db) {
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const src = path.join(DATA_DIR, 'app.db');
  const today = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${today.getFullYear()}${p(today.getMonth() + 1)}${p(today.getDate())}`;
  const dest = path.join(BACKUP_DIR, `app-${stamp}.db`);
  if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);

  // 只保留最近 KEEP 份
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^app-\d{8}\.db$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) {
    fs.unlinkSync(path.join(BACKUP_DIR, f));
  }
  return dest;
}

module.exports = { backupDaily };
