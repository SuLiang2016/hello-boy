// 数据库：node:sqlite（Node 24 内置，无原生编译依赖）
const fs = require('fs');
const path = require('path');

// 数据目录：默认 成语学习/data，可用 CYLY_DATA_DIR 覆盖（冒烟测试用）
const DATA_DIR = process.env.CYLY_DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'app.db');
const isNewDb = !fs.existsSync(DB_PATH);

const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(DB_PATH);

db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS parents (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  pinyin_all INTEGER NOT NULL DEFAULT 0,
  equipped TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  kind TEXT NOT NULL,            -- 'kid' | 'parent'
  kid_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learned (
  kid_id INTEGER NOT NULL,
  idiom_id TEXT NOT NULL,
  board TEXT NOT NULL DEFAULT 'idiom',      -- 板块：idiom | poem（三期起区分成语/古诗）
  stars INTEGER NOT NULL,        -- 1 或 2（该内容的掌握星）
  best_correct INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  learned_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  review_stage INTEGER NOT NULL DEFAULT 0,  -- 已完成的复习轮数 0-5
  next_review_date TEXT,                    -- 下一轮到期日；牢记后为 NULL
  PRIMARY KEY (kid_id, idiom_id)
);

CREATE TABLE IF NOT EXISTS daily (
  kid_id INTEGER NOT NULL,
  date TEXT NOT NULL,            -- 本地日期 YYYY-MM-DD
  new_learned INTEGER NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  review_star INTEGER NOT NULL DEFAULT 0,   -- 当天复习奖励星是否已发
  PRIMARY KEY (kid_id, date)
);

CREATE TABLE IF NOT EXISTS daily_board (
  kid_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  board TEXT NOT NULL,           -- 板块：idiom | poem
  new_learned INTEGER NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kid_id, date, board)
);

CREATE TABLE IF NOT EXISTS badges (
  kid_id INTEGER NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  PRIMARY KEY (kid_id, badge_id)
);

CREATE TABLE IF NOT EXISTS star_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kid_id INTEGER NOT NULL,
  kind TEXT NOT NULL,            -- 'learn' | 'review' | 'spend'
  delta INTEGER NOT NULL,        -- 正数挣、负数花
  ref TEXT,                      -- 成语 id / 装扮 id
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outfits (
  kid_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  purchased_at TEXT NOT NULL,
  PRIMARY KEY (kid_id, item_id)
);

CREATE TABLE IF NOT EXISTS chain_plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kid_id INTEGER NOT NULL,
  date TEXT NOT NULL,            -- 本地日期 YYYY-MM-DD
  mode TEXT NOT NULL CHECK (mode IN ('daily', 'free')),
  length INTEGER NOT NULL,       -- 本局接龙链长（每日链固定 6，自由练习取整条）
  completed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chain_plays_kid_date ON chain_plays (kid_id, date);
-- 每日链每个孩子每天只记一局；自由练习可反复记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_chain_plays_daily_once ON chain_plays (kid_id, date) WHERE mode = 'daily';
`);

// 一期数据库的平滑迁移：补列、按存量补记星星流水（仅一次）
function migrate() {
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);

  if (!cols('learned').includes('review_stage')) {
    db.exec('ALTER TABLE learned ADD COLUMN review_stage INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols('learned').includes('next_review_date')) {
    db.exec('ALTER TABLE learned ADD COLUMN next_review_date TEXT');
  }
  if (!cols('daily').includes('reviews')) {
    db.exec('ALTER TABLE daily ADD COLUMN reviews INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols('daily').includes('review_star')) {
    db.exec('ALTER TABLE daily ADD COLUMN review_star INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols('kids').includes('equipped')) {
    db.exec("ALTER TABLE kids ADD COLUMN equipped TEXT NOT NULL DEFAULT '{}'");
  }
  // 三期：learned 表加板块维度，存量都是成语
  if (!cols('learned').includes('board')) {
    db.exec("ALTER TABLE learned ADD COLUMN board TEXT NOT NULL DEFAULT 'idiom'");
  }

  // 三期：按板块拆日统计；存量 daily 都是成语，回填一次
  const hasBoardDaily = db.prepare('SELECT COUNT(*) AS n FROM daily_board').get().n > 0;
  if (!hasBoardDaily) {
    const rows = db.prepare('SELECT kid_id, date, new_learned, reviews FROM daily').all();
    const ins = db.prepare(
      "INSERT INTO daily_board (kid_id, date, board, new_learned, reviews) VALUES (?, ?, 'idiom', ?, ?)"
    );
    for (const r of rows) ins.run(r.kid_id, r.date, r.new_learned, r.reviews);
  }

  // 星星流水回填：只在没有流水记录时执行（全新或一期库）
  const hasEvents = db.prepare('SELECT COUNT(*) AS n FROM star_events').get().n > 0;
  if (!hasEvents) {
    const rows = db.prepare('SELECT kid_id, idiom_id, stars FROM learned WHERE stars > 0').all();
    const ins = db.prepare(
      "INSERT INTO star_events (kid_id, kind, delta, ref, created_at) VALUES (?, 'learn', ?, ?, ?)"
    );
    for (const r of rows) ins.run(r.kid_id, r.stars, r.idiom_id, new Date().toISOString());
  }
}
migrate();

module.exports = db;
