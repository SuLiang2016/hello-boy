// 徽章定义与颁发判定
const db = require('./db');

const BADGES = [
  { id: 'learn-10', name: '成语小书生', hint: '学会 10 个成语', kind: 'learn', board: 'idiom', threshold: 10 },
  { id: 'learn-30', name: '成语小达人', hint: '学会 30 个成语', kind: 'learn', board: 'idiom', threshold: 30 },
  { id: 'learn-60', name: '成语大王', hint: '学会全部 60 个成语', kind: 'learn', board: 'idiom', threshold: 60 },
  { id: 'streak-3', name: '三天小火苗', hint: '连续打卡 3 天', kind: 'streak', threshold: 3 },
  { id: 'streak-7', name: '一鼓作气', hint: '连续打卡 7 天', kind: 'streak', threshold: 7 },
  { id: 'streak-14', name: '锲而不舍', hint: '连续打卡 14 天', kind: 'streak', threshold: 14 },
  { id: 'streak-30', name: '恒心传奇', hint: '连续打卡 30 天', kind: 'streak', threshold: 30 },
  { id: 'group-dongwu', name: '动物大师', hint: '学完「动物伙伴」篇章', kind: 'group', group: 'dongwu' },
  { id: 'group-shuzi', name: '数字大师', hint: '学完「神奇的数字」篇章', kind: 'group', group: 'shuzi' },
  { id: 'group-ziran', name: '自然大师', hint: '学完「大自然」篇章', kind: 'group', group: 'ziran' },
  { id: 'group-renwu', name: '人物大师', hint: '学完「了不起的人」篇章', kind: 'group', group: 'renwu' },
  { id: 'group-jizhi', name: '智慧大师', hint: '学完「聪明办法」篇章', kind: 'group', group: 'jizhi' },
  { id: 'group-shenhua', name: '神话大师', hint: '学完「神话传说」篇章', kind: 'group', group: 'shenhua' },
  // 三期：古诗板块 8 枚
  { id: 'poem-10', name: '古诗小书生', hint: '学会 10 首古诗', kind: 'learn', board: 'poem', threshold: 10 },
  { id: 'poem-30', name: '古诗小达人', hint: '学会 30 首古诗', kind: 'learn', board: 'poem', threshold: 30 },
  { id: 'poem-75', name: '古诗大王', hint: '学会全部 75 首古诗', kind: 'learn', board: 'poem', threshold: 75 },
  { id: 'group-siji', name: '四季大师', hint: '学完「四季风光」篇章', kind: 'group', group: 'siji' },
  { id: 'group-shanshui', name: '山水大师', hint: '学完「山水田园」篇章', kind: 'group', group: 'shanshui' },
  { id: 'group-huaren', name: '情谊大师', hint: '学完「思念与送别」篇章', kind: 'group', group: 'huaren' },
  { id: 'group-yongwu', name: '明理大师', hint: '学完「咏物明理」篇章', kind: 'group', group: 'yongwu' },
  { id: 'group-jiaguo', name: '家国大师', hint: '学完「家国与童年」篇章', kind: 'group', group: 'jiaguo' },
];

// 计算连续打卡天数：从今天（或昨天）往前数连续有学习动作（新学或复习）的天数
function calcStreak(kidId) {
  const rows = db.prepare(
    'SELECT date FROM daily WHERE kid_id = ? AND (new_learned > 0 OR reviews > 0) ORDER BY date DESC'
  ).all(kidId);
  if (rows.length === 0) return 0;
  const today = localDate();
  const yesterday = localDate(-1);
  if (rows[0].date !== today && rows[0].date !== yesterday) return 0;
  let streak = 0;
  let cursor = rows[0].date === today ? 0 : -1; // 用日期差值逐日核对
  for (let i = 0; i < rows.length; i++) {
    const expect = localDate(cursor - i);
    if (rows[i].date === expect) streak++;
    else break;
  }
  return streak;
}

function localDate(dayOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 学会/升级之后调用：把新够格的徽章写入库，返回新拿到的徽章数组
function grantNewBadges(kidId, stats) {
  const now = new Date().toISOString();
  const earned = new Set(
    db.prepare('SELECT badge_id FROM badges WHERE kid_id = ?').all(kidId).map((r) => r.badge_id)
  );
  const fresh = [];
  for (const b of BADGES) {
    if (earned.has(b.id)) continue;
    const ok =
      (b.kind === 'learn' && (stats.boardCounts?.[b.board] || 0) >= b.threshold) ||
      (b.kind === 'streak' && stats.streak >= b.threshold) ||
      // 篇章徽章：篇章必须有内容（总数>0）且全部学会，防止空篇章 0>=0 误发
      (b.kind === 'group' && (stats.groupTotals[b.group] || 0) > 0 &&
        (stats.groupCounts[b.group] || 0) >= stats.groupTotals[b.group]);
    if (ok) {
      db.prepare('INSERT INTO badges (kid_id, badge_id, earned_at) VALUES (?, ?, ?)').run(kidId, b.id, now);
      fresh.push(b);
    }
  }
  return fresh;
}

module.exports = { BADGES, calcStreak, grantNewBadges, localDate };
