import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const content = require('../src/assets/content.json');
const { polyphonic } = require('pinyin-pro');
const {
  BOARDS, boardOf, unlockThreshold, dailyCap,
  canLearnNew, pickDueToday, earnedReviewStar, REVIEW_DAILY_LIMIT,
} = require('../server/board-rules.js');

function readings(ch) {
  const r = polyphonic(ch);
  return (Array.isArray(r) ? r.join(' ') : String(r || '')).split(/\s+/).filter(Boolean);
}

// ---------- 板块注册表 ----------

test('板块注册表有成语、古诗、识字三块，识字量词是「张」', () => {
  assert.deepEqual(BOARDS.map((b) => b.board), ['idiom', 'poem', 'shizi']);
  assert.equal(boardOf('shizi').unit, '张');
  assert.equal(boardOf('idiom').unit, '个');
  assert.equal(boardOf('poem').unit, '首');
});

test('板块注册表能按篇章 key 反查板块', () => {
  assert.equal(content.groups.some((g) => boardOfGroupIs(g.key, 'idiom')), true);
  assert.equal(content.shiziGroups.every((g) => boardOfGroupIs(g.key, 'shizi')), true);
  for (const g of content.shiziGroups) {
    assert.ok(g.name, `${g.key} 缺 name（术语主标题）`);
    assert.ok(g.motto, `${g.key} 缺 motto（孩子话副标题）`);
  }
});

function boardOfGroupIs(key, want) {
  if (content.groups.some((g) => g.key === key)) return want === 'idiom';
  if ((content.poemGroups || []).some((g) => g.key === key)) return want === 'poem';
  if ((content.shiziGroups || []).some((g) => g.key === key)) return want === 'shizi';
  return false;
}

test('解锁阈值统一 80% 向上取整：25 张要学 20', () => {
  assert.equal(unlockThreshold(10), 8);
  assert.equal(unlockThreshold(15), 12);
  assert.equal(unlockThreshold(25), 20);
});

// ---------- 识字内容 ----------

test('形近字篇 25 张，id 全局唯一且不与成语古诗冲突', () => {
  const items = content.shiziItems || [];
  assert.equal(items.length, 25);
  const all = [...content.idioms, ...(content.poems || []), ...items].map((i) => i.id);
  assert.equal(new Set(all).size, all.length, '有重复 id');
  for (const it of items) assert.match(it.id, /^zi-[a-z]+(-[a-z]+)?$/);
});

test('识字卡片不带插图', () => {
  for (const it of content.shiziItems) {
    assert.equal(it.illustration, undefined, `${it.id} 不该有 illustration`);
  }
});

test('每张卡的字都有拼音、部首、笔画、组词、例句，且组词例句里真的含这个字', () => {
  for (const it of content.shiziItems) {
    assert.ok(Array.isArray(it.chars) && it.chars.length >= 2, `${it.id} chars 少于 2 个字`);
    assert.equal(Array.from(it.word).filter((c) => c !== ' ').length, it.chars.length, `${it.id} word 字数与 chars 对不上`);
    for (const c of it.chars) {
      for (const f of ['zi', 'pinyin', 'radical', 'strokes', 'word', 'sentence']) {
        assert.ok(c[f] !== undefined && c[f] !== '', `${it.id} 的「${c.zi || '?'}」缺 ${f}`);
      }
      assert.ok(Number.isInteger(c.strokes) && c.strokes >= 1 && c.strokes <= 40, `${it.id} ${c.zi} 笔画数异常`);
      assert.ok(c.word.includes(c.zi), `${it.id} 组词「${c.word}」里没有「${c.zi}」`);
      assert.ok(c.sentence.includes(c.zi), `${it.id} 例句里没有「${c.zi}」`);
    }
    assert.equal(it.chars.map((c) => c.pinyin).join(' '), it.pinyin, `${it.id} 顶层 pinyin 与 chars 不一致`);
  }
});

test('卡片拼音能被 pinyin-pro 的多音列表覆盖', () => {
  for (const it of content.shiziItems) {
    for (const c of it.chars) {
      assert.ok(readings(c.zi).includes(c.pinyin), `${it.id} ${c.zi}: 声明 ${c.pinyin}，pinyin-pro 给 ${readings(c.zi).join('/')}`);
    }
  }
});

test('三题按篇章分支：形近/同音/易错用 给词选字 → 选写对的词 → 辨字义', () => {
  const EXPECT = ['fill', 'word', 'meaning'];
  for (const it of content.shiziItems) {
    assert.equal(it.quiz.length, 3, `${it.id} 不是三题`);
    assert.deepEqual(it.quiz.map((q) => q.type), EXPECT, `${it.id} 题型顺序不对`);
    it.quiz.forEach((q, i) => {
      assert.ok(q.question, `${it.id} 第${i + 1}题缺 question`);
      assert.equal(q.options.length, 4, `${it.id} 第${i + 1}题选项不是 4 个`);
      assert.equal(new Set(q.options).size, 4, `${it.id} 第${i + 1}题选项有重复`);
      assert.ok(q.answer >= 0 && q.answer <= 3, `${it.id} 第${i + 1}题 answer 越界`);
      assert.ok(q.explain, `${it.id} 第${i + 1}题缺 explain`);
    });
    assert.ok(it.quiz[0].question.includes('（　）'), `${it.id} 给词选字题缺全角空格（　）`);
  }
});

test('识字文案不踩禁词', () => {
  // 与 scripts/validate-content.js 的 BANNED 保持一致；STYLE-GUIDE 里的「比喻」对 explain 是「尽量不用」，不作硬拦
  const BANNED = ['首先', '其次', '总而言之', '综上所述', '众所周知', '由此可见', '让我们',
    '我们应该', '我们要', '小朋友们', '告诉我们', '形容'];
  for (const it of content.shiziItems) {
    const texts = [it.tip, ...it.chars.flatMap((c) => [c.sentence, c.word]), ...it.quiz.flatMap((q) => [q.question, q.explain, ...q.options])];
    for (const t of texts) {
      for (const b of BANNED) assert.ok(!String(t || '').includes(b), `${it.id} 含禁词「${b}」：${t}`);
    }
  }
});

test('三题的正确答案下标在整篇里分布均匀（防出题偷懒）', () => {
  for (let i = 0; i < 3; i++) {
    const counts = [0, 0, 0, 0];
    for (const it of content.shiziItems) counts[it.quiz[i].answer]++;
    const used = counts.filter((c) => c > 0).length;
    assert.ok(used >= 3, `第${i + 1}题答案只落在 ${used} 个位置：${counts.join('/')}`);
  }
});

// ---------- 每日新学上限 ----------

test('识字每天最多算学会 3 张，成语古诗不限', () => {
  assert.equal(dailyCap('shizi'), 3);
  assert.equal(dailyCap('idiom'), null);
  assert.equal(canLearnNew('shizi', 0), true);
  assert.equal(canLearnNew('shizi', 2), true);
  assert.equal(canLearnNew('shizi', 3), false);
  assert.equal(canLearnNew('shizi', 99), false);
  assert.equal(canLearnNew('idiom', 99), true);
  assert.equal(canLearnNew('poem', 99), true);
});

// ---------- 每日复习上限与给星判定 ----------

test('复习队列取「到期最久的 20 条」，同一天内按 id 稳定排序', () => {
  const rows = [];
  for (let i = 0; i < 25; i++) rows.push({ id: `d${String(i).padStart(2, '0')}`, due: `2026-10-0${(i % 5) + 1}` });
  rows.push({ id: 'a00', due: '2026-09-01' }); // 欠账最久
  const picked = pickDueToday(rows, '2026-10-12');
  assert.equal(picked.length, REVIEW_DAILY_LIMIT);
  assert.equal(picked[0].id, 'a00', '欠账最久的必须排在第一个');
});

test('到期不足 20 条时全做完才算完成，不给没做完的孩子发星', () => {
  assert.equal(earnedReviewStar({ remaining: 0, reviewsToday: 3 }), true);
  assert.equal(earnedReviewStar({ remaining: 2, reviewsToday: 3 }), false);
});

test('到期超过 20 条时做满 20 条就给星——剩余会随队列补位漂移，不能拿剩余判', () => {
  assert.equal(earnedReviewStar({ remaining: 5, reviewsToday: 20 }), true);
  assert.equal(earnedReviewStar({ remaining: 6, reviewsToday: 19 }), false);
});

test('复习上限是三个板块共用的一条队列', () => {
  const rows = [
    { id: 'zi-ren', due: '2026-10-01', board: 'shizi' },
    { id: 'shou-zhu-dai-tu', due: '2026-10-02', board: 'idiom' },
    { id: 'chun-xiao', due: '2026-10-03', board: 'poem' },
  ];
  const picked = pickDueToday(rows, '2026-10-12');
  assert.equal(picked.length, 3);
  assert.deepEqual(picked.map((r) => r.board), ['shizi', 'idiom', 'poem']);
});
