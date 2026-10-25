// 全部 API 路由
const express = require('express');
const db = require('./db');
const { newSalt, hashPin, verifyPin, createSession, requireKid, requireParent } = require('./auth');
const { calcStreak, grantNewBadges, localDate } = require('./badges');
const { boardOfGroups, boardGroupKeys, boardOfItem, groupIndex, unlockThreshold } = require('./content');
const { OUTFITS, wallet, addEvent, ownedOutfits, equippedOf } = require('./stars');
const { DAILY_LENGTH, getDailyChain, getFreeChain, getChainById } = require('./chain');

const router = express.Router();
const AVATARS = ['panda', 'rabbit', 'fox', 'tiger', 'owl', 'chick', 'frog', 'lion'];
// 复习轮间隔：学会后按 1/3/7/14/30 天到期；第 n 轮完成后的下一个间隔
const REVIEW_GAPS = [1, 3, 7, 14, 30];

const now = () => new Date().toISOString();

// ---------- 公开 ----------

router.get('/bootstrap', (req, res) => {
  const parent = db.prepare('SELECT id FROM parents WHERE id = 1').get();
  res.json({ needsSetup: !parent, appName: '成语学习乐园' });
});

router.get('/kids', (req, res) => {
  res.json(db.prepare('SELECT id, name, avatar, equipped FROM kids ORDER BY id').all());
});

// ---------- 首次设置向导 ----------

router.post('/setup', (req, res) => {
  const parent = db.prepare('SELECT id FROM parents WHERE id = 1').get();
  if (parent) return res.status(400).json({ error: '已经初始化过了' });
  const { parentPin, kid } = req.body || {};
  if (!/^\d{4,12}$/.test(String(parentPin || ''))) {
    return res.status(400).json({ error: '家长口令要 4-12 位数字' });
  }
  const err = validateKid(kid);
  if (err) return res.status(400).json({ error: err });
  const ps = newSalt();
  db.prepare('INSERT INTO parents (id, pin_hash, salt, created_at) VALUES (1, ?, ?, ?)')
    .run(hashPin(parentPin, ps), ps, now());
  const kidId = insertKid(kid);
  res.json({ token: createSession('kid', kidId), kid: kidRow(kidId) });
});

// ---------- 登录 ----------

router.post('/login/kid', (req, res) => {
  const { kidId, pin } = req.body || {};
  const kid = db.prepare('SELECT * FROM kids WHERE id = ?').get(kidId);
  if (!kid || !verifyPin(pin, kid.pin_hash, kid.salt)) {
    return res.status(401).json({ error: '口令不对，再试试' });
  }
  res.json({ token: createSession('kid', kid.id), kid: kidRow(kid.id) });
});

router.post('/login/parent', (req, res) => {
  const { pin } = req.body || {};
  const parent = db.prepare('SELECT * FROM parents WHERE id = 1').get();
  if (!parent || !verifyPin(pin, parent.pin_hash, parent.salt)) {
    return res.status(401).json({ error: '家长口令不对' });
  }
  res.json({ token: createSession('parent') });
});

router.post('/logout', (req, res) => {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ ok: true });
});

// ---------- 孩子 ----------

router.get('/me', requireKid, (req, res) => {
  res.json(kidRow(req.kidId));
});

router.put('/me', requireKid, (req, res) => {
  const { pinyinAll } = req.body || {};
  if (typeof pinyinAll === 'boolean') {
    db.prepare('UPDATE kids SET pinyin_all = ? WHERE id = ?').run(pinyinAll ? 1 : 0, req.kidId);
  }
  res.json(kidRow(req.kidId));
});

// 学习进度总览
router.get('/progress', requireKid, (req, res) => {
  res.json(buildProgress(req.kidId));
});

// 提交一次测验结果：3 题对 2 题及以上算学会（成语、古诗通用，板块按内容 id 判断）
router.post('/quiz-result', requireKid, (req, res) => {
  const body = req.body || {};
  const itemId = body.idiomId || body.id;
  const board = boardOfItem(itemId);
  if (!board) return res.status(400).json({ error: '没有这个内容' });
  const c = Math.max(0, Math.min(3, Number(body.correct) | 0));
  const passed = c >= 2;
  const stars = c === 3 ? 2 : 1;
  const today = localDate();

  const prev = db.prepare('SELECT * FROM learned WHERE kid_id = ? AND idiom_id = ?').get(req.kidId, itemId);
  const prevStars = prev ? prev.stars : 0;
  db.prepare(`
    INSERT INTO learned (kid_id, idiom_id, board, stars, best_correct, attempts, learned_at, updated_at,
                         review_stage, next_review_date)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0, ?)
    ON CONFLICT(kid_id, idiom_id) DO UPDATE SET
      stars = MAX(stars, excluded.stars),
      best_correct = MAX(best_correct, excluded.best_correct),
      attempts = attempts + 1,
      updated_at = excluded.updated_at,
      next_review_date = COALESCE(learned.next_review_date, excluded.next_review_date)
  `).run(req.kidId, itemId, board, passed ? stars : 0, c, now(), now(),
         passed && prevStars === 0 ? localDate(REVIEW_GAPS[0]) : null);

  let starsDelta = 0;
  if (passed) {
    if (stars > prevStars) {
      starsDelta = stars - prevStars;
      addEvent(req.kidId, 'learn', starsDelta, itemId);
    }
    // 首次学会：计入当日打卡 + 安排第一轮复习（上面的 INSERT 已写 next_review_date）
    if (prevStars === 0) {
      db.prepare(`
        INSERT INTO daily (kid_id, date, new_learned) VALUES (?, ?, 1)
        ON CONFLICT(kid_id, date) DO UPDATE SET new_learned = new_learned + 1
      `).run(req.kidId, today);
      db.prepare(`
        INSERT INTO daily_board (kid_id, date, board, new_learned) VALUES (?, ?, ?, 1)
        ON CONFLICT(kid_id, date, board) DO UPDATE SET new_learned = new_learned + 1
      `).run(req.kidId, today, board);
    }
  }

  grantNewBadges(req.kidId, buildProgress(req.kidId).stats);
  const after = buildProgress(req.kidId);

  res.json({
    passed,
    starsDelta,
    totalStars: after.totalStars,
    streak: after.streak,
    todayDone: after.todayDone,
    newBadges: freshBadgesOf(req.kidId),
  });
});

// 复习一个到期内容（成语或古诗）：随机一题，答错不惩罚，做完即该轮完成
router.post('/review-result', requireKid, (req, res) => {
  const { idiomId } = req.body || {};
  const row = db.prepare('SELECT * FROM learned WHERE kid_id = ? AND idiom_id = ?').get(req.kidId, idiomId);
  const today = localDate();
  if (!row || row.stars === 0) return res.status(400).json({ error: '这个内容还没学会' });
  if (row.review_stage >= 5 || !row.next_review_date || row.next_review_date > today) {
    return res.status(400).json({ error: '这个内容今天不用复习' });
  }

  const stage = row.review_stage + 1;
  const remembered = stage >= 5;
  const next = remembered ? null : localDate(REVIEW_GAPS[stage]);
  db.prepare('UPDATE learned SET review_stage = ?, next_review_date = ?, updated_at = ? WHERE kid_id = ? AND idiom_id = ?')
    .run(stage, next, now(), req.kidId, idiomId);

  // 任何一次复习都算当天的学习动作（打卡）
  db.prepare(`
    INSERT INTO daily (kid_id, date, reviews) VALUES (?, ?, 1)
    ON CONFLICT(kid_id, date) DO UPDATE SET reviews = reviews + 1
  `).run(req.kidId, today);
  db.prepare(`
    INSERT INTO daily_board (kid_id, date, board, reviews) VALUES (?, ?, ?, 1)
    ON CONFLICT(kid_id, date, board) DO UPDATE SET reviews = reviews + 1
  `).run(req.kidId, today, row.board === 'poem' ? 'poem' : 'idiom');

  // 当天全部到期复习完成 -> 补 1 颗复习星（每天最多一次）
  let bonusStar = false;
  const remain = db.prepare(`
    SELECT COUNT(*) AS n FROM learned
    WHERE kid_id = ? AND stars > 0 AND review_stage < 5
      AND next_review_date IS NOT NULL AND next_review_date <= ?
  `).get(req.kidId, today).n;
  const day = db.prepare('SELECT review_star FROM daily WHERE kid_id = ? AND date = ?').get(req.kidId, today);
  if (remain === 0 && (!day || day.review_star === 0)) {
    addEvent(req.kidId, 'review', 1, today);
    db.prepare('UPDATE daily SET review_star = 1 WHERE kid_id = ? AND date = ?').run(req.kidId, today);
    bonusStar = true;
  }

  const after = buildProgress(req.kidId);
  res.json({
    stage,
    remembered,
    bonusStar,
    remain,
    wallet: after.totalStars,
    streak: after.streak,
  });
});

// ---------- 接龙 ----------

router.get('/chain/daily', requireKid, (req, res) => {
  const today = localDate();
  const unlocked = idiomLearnedCount(req.kidId) > 0;
  const playStats = chainPlayStats(req.kidId, today);
  if (!unlocked) return res.json({ unlocked: false, completed: false, totalPlays: playStats.total });
  const chain = getDailyChain(today);
  if (!chain) return res.status(500).json({ error: '接龙链库还没准备好' });
  res.json({
    unlocked: true, completed: playStats.dailyDone > 0, chain,
    targetLength: DAILY_LENGTH,
    totalPlays: playStats.total,
  });
});

router.get('/chain/free', requireKid, (req, res) => {
  if (idiomLearnedCount(req.kidId) === 0) {
    return res.status(403).json({ error: '先学会一个成语，再来玩接龙' });
  }
  const chain = getFreeChain();
  if (!chain) return res.status(500).json({ error: '接龙链库还没准备好' });
  res.json({
    chain,
    targetLength: chain.words.length,
    totalPlays: chainPlayStats(req.kidId, localDate()).total,
  });
});

// 只记录「接龙局」：不写 learned / daily / star_events，不算学习、复习、打卡
router.post('/chain/complete', requireKid, (req, res) => {
  const body = req.body || {};
  const mode = body.mode;
  if (mode !== 'daily' && mode !== 'free') return res.status(400).json({ error: '接龙模式不对' });
  if (idiomLearnedCount(req.kidId) === 0) {
    return res.status(403).json({ error: '先学会一个成语，再来玩接龙' });
  }
  const chain = getChainById(String(body.chainId || ''));
  if (!chain) return res.status(400).json({ error: '没有这条接龙链' });
  const today = localDate();
  if (mode === 'daily') {
    const daily = getDailyChain(today);
    if (!daily || daily.id !== chain.id) return res.status(400).json({ error: '今天不是这条每日链' });
  }
  const length = mode === 'daily' ? DAILY_LENGTH : chain.words.length;
  if (length > chain.words.length) return res.status(500).json({ error: '接龙链长度不对' });
  const stepsCompleted = Number(body.stepsCompleted);
  if (!Number.isInteger(stepsCompleted) || stepsCompleted !== length - 1) {
    return res.status(400).json({ error: '接龙步数不对，这一局还没走完' });
  }

  // 每日链由唯一索引兜底，同一天重复提交只算一局；自由练习可反复玩
  let already = false;
  if (mode === 'daily') {
    const r = db.prepare(`
      INSERT OR IGNORE INTO chain_plays (kid_id, date, mode, length, completed_at) VALUES (?, ?, ?, ?, ?)
    `).run(req.kidId, today, mode, length, now());
    already = r.changes === 0;
  } else {
    db.prepare(`
      INSERT INTO chain_plays (kid_id, date, mode, length, completed_at) VALUES (?, ?, ?, ?, ?)
    `).run(req.kidId, today, mode, length, now());
  }

  const progress = buildProgress(req.kidId);
  const newBadges = already ? [] : grantNewBadges(req.kidId, progress.stats).map((b) => b.id);
  res.json({
    ok: true,
    already,
    mode,
    length,
    totalPlays: progress.chainPlayCount,
    chainDailyDone: progress.chainDailyDone,
    newBadges,
  });
});

// ---------- 装扮 ----------

router.get('/outfits', requireKid, (req, res) => {
  res.json({
    items: OUTFITS,
    owned: ownedOutfits(req.kidId),
    equipped: equippedOf(req.kidId),
    wallet: wallet(req.kidId),
  });
});

router.post('/outfits/buy', requireKid, (req, res) => {
  const item = OUTFITS.find((i) => i.id === (req.body || {}).itemId);
  if (!item) return res.status(400).json({ error: '没有这件装扮' });
  if (ownedOutfits(req.kidId).includes(item.id)) {
    return res.status(400).json({ error: '已经买过啦' });
  }
  const w = wallet(req.kidId);
  if (w < item.price) return res.status(400).json({ error: '星星还不够，先去挣一点吧' });

  addEvent(req.kidId, 'spend', -item.price, item.id);
  db.prepare('INSERT INTO outfits (kid_id, item_id, purchased_at) VALUES (?, ?, ?)')
    .run(req.kidId, item.id, now());
  res.json({ ok: true, wallet: wallet(req.kidId) });
});

router.put('/outfits/equip', requireKid, (req, res) => {
  const { equipped } = req.body || {};
  if (!equipped || typeof equipped !== 'object') return res.status(400).json({ error: '参数不对' });
  const owned = new Set(ownedOutfits(req.kidId));
  const clean = {};
  for (const item of OUTFITS) {
    const picked = equipped[item.slot];
    if (picked && picked === item.id && owned.has(item.id)) clean[item.slot] = item.id;
  }
  db.prepare('UPDATE kids SET equipped = ? WHERE id = ?').run(JSON.stringify(clean), req.kidId);
  res.json({ ok: true, equipped: clean });
});

// ---------- 家长 ----------

router.get('/parent/overview', requireParent, (req, res) => {
  const kids = db.prepare('SELECT * FROM kids ORDER BY id').all();
  const today = localDate();
  // 本周一
  const monday = (() => {
    const d = new Date();
    const dow = (d.getDay() + 6) % 7; // 周一=0
    return localDate(-dow);
  })();

  const result = kids.map((k) => {
    const p = buildProgress(k.id);
    const recent = db.prepare(`
      SELECT l.idiom_id, l.board, l.learned_at FROM learned l
      WHERE kid_id = ? AND l.stars > 0
      ORDER BY l.learned_at DESC LIMIT 6
    `).all(k.id);
    const week = db.prepare(`
      SELECT COALESCE(SUM(new_learned), 0) AS newLearned, COALESCE(SUM(reviews), 0) AS reviews
      FROM daily WHERE kid_id = ? AND date >= ?
    `).get(k.id, monday);
    // 本周新学按板块拆分（三期起周报分列成语/古诗）
    const weekPoem = db.prepare(`
      SELECT COALESCE(SUM(new_learned), 0) AS newPoem, COALESCE(SUM(reviews), 0) AS poemReviews
      FROM daily_board WHERE kid_id = ? AND board = 'poem' AND date >= ?
    `).get(k.id, monday);
    const weekChain = db.prepare(`
      SELECT COUNT(*) AS plays, COALESCE(MAX(length), 0) AS maxLength
      FROM chain_plays WHERE kid_id = ? AND date >= ?
    `).get(k.id, monday);
    return {
      id: k.id, name: k.name, avatar: k.avatar, equipped: equippedOf(k.id),
      learnedCount: p.boardCounts.idiom, poemCount: p.boardCounts.poem,
      totalStars: p.totalStars,
      streak: p.streak, groupCounts: p.stats.groupCounts,
      rememberedCount: p.rememberedCount,
      week: {
        ...week, newPoem: weekPoem.newPoem, poemReviews: weekPoem.poemReviews,
        chainPlays: weekChain.plays, chainMaxLength: weekChain.maxLength,
      },
      recent: recent.map((r) => ({ idiomId: r.idiom_id, learnedAt: r.learned_at })),
    };
  });
  res.json(result);
});

router.post('/parent/kids', requireParent, (req, res) => {
  const kid = req.body || {};
  const err = validateKid(kid);
  if (err) return res.status(400).json({ error: err });
  const id = insertKid(kid);
  res.json(kidRow(id));
});

router.put('/parent/kids/:id', requireParent, (req, res) => {
  const kid = db.prepare('SELECT * FROM kids WHERE id = ?').get(req.params.id);
  if (!kid) return res.status(404).json({ error: '没有这个孩子账号' });
  const { name, avatar, pin } = req.body || {};
  if (name !== undefined) {
    if (!isValidName(name)) return res.status(400).json({ error: '名字要 1-8 个字' });
    db.prepare('UPDATE kids SET name = ? WHERE id = ?').run(String(name).trim(), kid.id);
  }
  if (avatar !== undefined) {
    if (!AVATARS.includes(avatar)) return res.status(400).json({ error: '头像不对' });
    db.prepare('UPDATE kids SET avatar = ? WHERE id = ?').run(avatar, kid.id);
  }
  if (pin !== undefined) {
    if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: '口令要 4 位数字' });
    const s = newSalt();
    db.prepare('UPDATE kids SET pin_hash = ?, salt = ? WHERE id = ?').run(hashPin(pin, s), s, kid.id);
    db.prepare('DELETE FROM sessions WHERE kind = ? AND kid_id = ?').run('kid', kid.id);
  }
  res.json(kidRow(kid.id));
});

router.put('/parent/pin', requireParent, (req, res) => {
  const { oldPin, newPin } = req.body || {};
  const parent = db.prepare('SELECT * FROM parents WHERE id = 1').get();
  if (!verifyPin(oldPin, parent.pin_hash, parent.salt)) {
    return res.status(401).json({ error: '原来的家长口令不对' });
  }
  if (!/^\d{4,12}$/.test(String(newPin || ''))) {
    return res.status(400).json({ error: '新口令要 4-12 位数字' });
  }
  const s = newSalt();
  db.prepare('UPDATE parents SET pin_hash = ?, salt = ? WHERE id = 1').run(hashPin(newPin, s), s);
  res.json({ ok: true });
});

// 备份：全量 JSON 导出（不含会话）
router.get('/parent/export', requireParent, (req, res) => {
  const dump = {};
  for (const t of ['parents', 'kids', 'learned', 'daily', 'daily_board', 'badges', 'star_events', 'outfits', 'chain_plays']) {
    dump[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }
  res.setHeader('Content-Disposition', `attachment; filename="chengyu-backup-${localDate()}.json"`);
  res.json({ app: '成语学习乐园', version: 4, exportedAt: now(), data: dump });
});

// 恢复：上传同一格式的 JSON，清空后原样写回（保留当前家长会话）
router.post('/parent/restore', requireParent, async (req, res) => {
  const dump = (req.body || {}).data;
  if (!dump || !Array.isArray(dump.kids) || !Array.isArray(dump.learned)) {
    return res.status(400).json({ error: '备份文件内容不对' });
  }
  if (dump.kids.length === 0) {
    return res.status(400).json({ error: '这份备份里没有孩子账号，多半是选错文件了' });
  }
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const current = token ? db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) : null;

  // 旧版备份没有 board 列，按成语回填
  const learnedRows = dump.learned.map((r) => ({ board: 'idiom', ...r }));
  const dailyBoardRows = Array.isArray(dump.daily_board)
    ? dump.daily_board
    : (dump.daily || []).map((r) => ({ ...r, board: 'idiom' }));

  db.exec('BEGIN');
  try {
    for (const t of ['learned', 'daily', 'daily_board', 'badges', 'star_events', 'outfits', 'chain_plays', 'kids', 'parents', 'sessions']) {
      db.exec(`DELETE FROM ${t}`);
    }
    const put = (table, rows, cols) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
      const stmt = db.prepare(sql);
      for (const r of rows) stmt.run(...cols.map((c) => r[c]));
    };
    put('parents', dump.parents, ['id', 'pin_hash', 'salt', 'created_at']);
    put('kids', dump.kids, ['id', 'name', 'avatar', 'pin_hash', 'salt', 'pinyin_all', 'equipped', 'created_at']);
    put('learned', learnedRows, ['kid_id', 'idiom_id', 'board', 'stars', 'best_correct', 'attempts', 'learned_at', 'updated_at', 'review_stage', 'next_review_date']);
    put('daily', dump.daily, ['kid_id', 'date', 'new_learned', 'reviews', 'review_star']);
    put('daily_board', dailyBoardRows, ['kid_id', 'date', 'board', 'new_learned', 'reviews']);
    put('badges', dump.badges, ['kid_id', 'badge_id', 'earned_at']);
    put('star_events', dump.star_events, ['id', 'kid_id', 'kind', 'delta', 'ref', 'created_at']);
    put('outfits', dump.outfits, ['kid_id', 'item_id', 'purchased_at']);
    // 四期前的旧备份没有 chain_plays，按空表恢复
    put('chain_plays', dump.chain_plays, ['id', 'kid_id', 'date', 'mode', 'length', 'completed_at']);
    if (current) {
      db.prepare('INSERT INTO sessions (token, kind, kid_id, created_at) VALUES (?, ?, ?, ?)')
        .run(current.token, current.kind, current.kid_id, current.created_at);
    }
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: '恢复失败：' + e.message });
  }
});

// ---------- 内部工具 ----------

function isValidName(name) {
  const n = String(name || '').trim();
  return n.length >= 1 && n.length <= 8;
}

function validateKid(kid) {
  if (!kid) return '缺少孩子信息';
  if (!isValidName(kid.name)) return '名字要 1-8 个字';
  if (!AVATARS.includes(kid.avatar)) return '选一个头像';
  if (!/^\d{4}$/.test(String(kid.pin || ''))) return '口令要 4 位数字';
  return null;
}

function insertKid(kid) {
  const s = newSalt();
  const r = db.prepare(
    "INSERT INTO kids (name, avatar, pin_hash, salt, pinyin_all, equipped, created_at) VALUES (?, ?, ?, ?, 0, '{}', ?)"
  ).run(String(kid.name).trim(), kid.avatar, hashPin(kid.pin, s), s, now());
  return Number(r.lastInsertRowid);
}

function idiomLearnedCount(kidId) {
  return db.prepare(
    "SELECT COUNT(*) AS n FROM learned WHERE kid_id = ? AND board = 'idiom' AND stars > 0"
  ).get(kidId).n;
}

function chainPlayStats(kidId, date) {
  return db.prepare(`
    SELECT COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN mode = 'daily' AND date = ? THEN 1 ELSE 0 END), 0) AS dailyDone
    FROM chain_plays WHERE kid_id = ?
  `).get(date, kidId);
}

function kidRow(id) {
  const k = db.prepare('SELECT id, name, avatar, pinyin_all AS pinyinAll, equipped FROM kids WHERE id = ?').get(id);
  if (k) {
    try { k.equipped = JSON.parse(k.equipped || '{}'); } catch { k.equipped = {}; }
  }
  return k;
}

// 组装一份孩子的完整进度（也供徽章判定用）
function buildProgress(kidId) {
  const idx = groupIndex();
  const boards = boardGroupKeys();
  const groupTotals = {};
  for (const [k, ids] of Object.entries(idx)) groupTotals[k] = ids.length;

  const rows = db.prepare('SELECT idiom_id, board, stars, review_stage, next_review_date FROM learned WHERE kid_id = ? AND stars > 0').all(kidId);
  const learned = {};
  const groupCounts = {};
  for (const g of Object.keys(idx)) groupCounts[g] = 0;
  const boardCounts = { idiom: 0, poem: 0 };
  const today = localDate();
  const due = [];
  let rememberedCount = 0;
  for (const r of rows) {
    learned[r.idiom_id] = { stars: r.stars, stage: r.review_stage, board: r.board };
    if (r.review_stage >= 5) rememberedCount++;
    else if (r.next_review_date && r.next_review_date <= today) due.push(r.idiom_id);
    boardCounts[r.board === 'poem' ? 'poem' : 'idiom']++;
  }
  for (const [g, ids] of Object.entries(idx)) {
    groupCounts[g] = ids.filter((id) => learned[id]).length;
  }

  const streak = calcStreak(kidId);
  const dayRow = db.prepare('SELECT new_learned, reviews FROM daily WHERE kid_id = ? AND date = ?').get(kidId, today);
  const badgeRows = db.prepare('SELECT badge_id FROM badges WHERE kid_id = ?').all(kidId);
  const totalStars = wallet(kidId);
  const chainStats = chainPlayStats(kidId, today);
  const chainPlayCount = chainStats.total;
  const chainDailyDone = chainStats.dailyDone > 0;

  // 最近 14 天打卡日历
  const recent14 = [];
  for (let i = 13; i >= 0; i--) {
    const date = localDate(-i);
    const row = db.prepare('SELECT new_learned, reviews FROM daily WHERE kid_id = ? AND date = ?').get(kidId, date);
    recent14.push({ date, newLearned: row?.new_learned || 0, reviews: row?.reviews || 0 });
  }

  // 解锁：每个板块内推进——第一篇章直接开，学会上一篇章 80%（成语 8/10、古诗 12/15）解锁下一篇
  const unlocked = [];
  for (const keys of [boards.idiom, boards.poem]) {
    for (let i = 0; i < keys.length; i++) {
      if (i === 0 || groupCounts[keys[i - 1]] >= unlockThreshold(groupTotals[keys[i - 1]])) unlocked.push(keys[i]);
      else break;
    }
  }

  return {
    learned,
    totalStars,
    streak,
    todayDone: (dayRow?.new_learned || 0) > 0 || (dayRow?.reviews || 0) > 0,
    badges: badgeRows.map((b) => b.badge_id),
    unlocked,
    due,
    rememberedCount,
    groupCounts,
    groupTotals,
    learnedCount: rows.length,
    boardCounts,
    recent14,
    chainPlayCount,
    chainDailyDone,
    chainUnlocked: boardCounts.idiom > 0,
    stats: { learnedCount: boardCounts.idiom, boardCounts, streak, groupCounts, groupTotals, chainPlayCount },
  };
}

// 本次请求里刚拿到的徽章（时间倒序取最新的一批简化实现：比较 quiz 前后）
function freshBadgesOf(kidId) {
  // grantNewBadges 已把新徽章写库；这里把「获得时间在 5 秒内」的视为新
  const rows = db.prepare(
    "SELECT badge_id FROM badges WHERE kid_id = ? AND earned_at >= ?"
  ).all(kidId, new Date(Date.now() - 5000).toISOString());
  return rows.map((r) => r.badge_id);
}

module.exports = router;
