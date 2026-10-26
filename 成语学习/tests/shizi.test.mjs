import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const content = require('../src/assets/content.json');
const { polyphonic } = require('pinyin-pro');
const {
  BOARDS, boardOf, unlockThreshold, dailyCap,
  canLearnNew, pickDueToday, earnedReviewStar, REVIEW_DAILY_LIMIT,
} = require('../server/board-rules.js');
const { typesOfGroup, checkDuoyinCard, duoyinReadingHints } = require('../server/shizi-rules.js');

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

// ---------- 题型按篇章分两套 ----------

test('多音字篇用读音三题，其余三篇用给词选字三题', () => {
  assert.deepEqual(typesOfGroup('duoyin'), ['sound', 'sound2', 'meaning']);
  for (const key of ['xingjin', 'tongyin', 'yicuo']) {
    assert.deepEqual(typesOfGroup(key), ['fill', 'word', 'meaning'], `${key} 题型不对`);
  }
});

// ---------- 多音字卡规则（纯函数，喂夹具） ----------
// 读音箱表抄 pinyin-pro 的实际返回值。句子读音不由 pinyin-pro 定——
// 实测「小树长得很快」它给 cháng/dé、「慢慢地走」给 dì，整句定音对虚词不可靠，
// 所以规则只认卡上人工声明的读音，pinyin-pro 的分歧另走 duoyinReadingHints 提示人工复核。

const READINGS = {
  长: ['cháng', 'zhǎng'],
  地: ['dì', 'de'],
  得: ['dé', 'děi', 'de'],
};
const readingsOf = (zi) => READINGS[zi] || readings(zi);

function changCard(patch = {}) {
  return {
    id: 'zi-chang',
    group: 'duoyin',
    word: '长',
    pinyin: 'cháng zhǎng',
    chars: [
      { zi: '长', pinyin: 'cháng', radical: '长', strokes: 4, word: '长短', sentence: '这根绳子长短正合适。' },
      { zi: '长', pinyin: 'zhǎng', radical: '长', strokes: 4, word: '长大', sentence: '我长大要当医生。' },
    ],
    tip: '说长短的时候读 cháng，说生长的时候读 zhǎng，读音一变意思就变了。',
    quiz: [
      { type: 'sound', question: '「长大」的「长」读什么？', options: ['zhǎng', 'cháng', 'zhàng', 'chǎng'], answer: 0, explain: '长个儿的长读 zhǎng。' },
      { type: 'sound2', question: '小树长得很快，这里的「长」读什么？', options: ['zhǎng', 'cháng', 'zhàng', 'chǎng'], answer: 0, explain: '小树在长个儿，读 zhǎng。' },
      { type: 'meaning', question: '哪个词说的是「生长、变大」？', options: ['长大', '长短', '细长', '长跑'], answer: 0, explain: '长大说的是长个儿。' },
    ],
    ...patch,
  };
}

const check = (card) => checkDuoyinCard(card, { readingsOf });
const has = (errs, frag) => assert.ok(errs.some((e) => e.includes(frag)), `没报出「${frag}」，实际：${errs.join(' | ')}`);

test('多音字卡写对了就没有报错', () => {
  assert.deepEqual(check(changCard()), []);
});

test('多音字卡整张只有一个字，字族是它的多个读音', () => {
  const card = changCard();
  card.chars[1] = { ...card.chars[1], zi: '常' };
  has(check(card), '只能有一个字');
});

test('少于两个读音不算多音字卡', () => {
  const card = changCard();
  card.chars = [card.chars[0]];
  has(check(card), '至少要教 2 个读音');
});

test('同一个字声明两个一样的读音要拦下', () => {
  const card = changCard();
  card.chars[1].pinyin = 'cháng';
  has(check(card), '读音有重复');
});

test('声明的读音必须真在这个字的多音列表里', () => {
  const card = changCard();
  card.chars[0].pinyin = 'chàng';
  card.pinyin = 'chàng zhǎng';
  has(check(card), '不在 pinyin-pro 的多音列表里');
});

test('轻声没有声调是合法的：地 de、得 de 不能被当成缺声调', () => {
  const di = changCard({
    id: 'zi-di', word: '地', pinyin: 'dì de',
    chars: [
      { zi: '地', pinyin: 'dì', radical: '土', strokes: 6, word: '土地', sentence: '春天的土地软软的。' },
      { zi: '地', pinyin: 'de', radical: '土', strokes: 6, word: '慢慢地', sentence: '他慢慢地走回家。' },
    ],
    tip: '说的是泥土就读 dì，跟在动词后面读轻声 de。',
    quiz: [
      { type: 'sound', question: '「土地」的「地」读什么？', options: ['dì', 'de', 'dí', 'dǐ'], answer: 0, explain: '泥土的地读 dì。' },
      { type: 'sound2', question: '他慢慢地走回家，这里的「地」读什么？', options: ['de', 'dì', 'dé', 'dǐ'], answer: 0, explain: '跟在动词后面读轻声 de。' },
      { type: 'meaning', question: '哪个词里的「地」读轻声？', options: ['慢慢地', '土地', '地方', '大地'], answer: 0, explain: '慢慢地里的「地」读 de。' },
    ],
  });
  assert.deepEqual(check(di), [], '轻声被误判了');
});

test('同一个字的部首和笔画数必须一致（抄卡最容易漏改）', () => {
  const card = changCard();
  card.chars[1].strokes = 5;
  has(check(card), 'strokes 不一致');
});

test('顶层 word 是这个字本身，pinyin 是各读音空格相连', () => {
  has(check(changCard({ word: '长 长' })), '顶层 word');
  has(check(changCard({ pinyin: 'cháng/zhǎng' })), '顶层 pinyin');
});

test('每个读音都要有自己的组词和例句，且组词不能撞车', () => {
  const card = changCard();
  card.chars[1].word = '长短';
  const errs = check(card);
  has(errs, '组词重复');
});

test('第1题给词选读音：题干要问卡上教过的词，答案就是那个词的读音', () => {
  const q1 = (patch) => { const c = changCard(); c.quiz[0] = { ...c.quiz[0], ...patch }; return check(c); };
  has(q1({ question: '「长高」的「长」读什么？' }), '没有出现任何组词');
  has(q1({ question: '「长大」和「长短」的「长」读什么？' }), '答案不唯一');
  has(q1({ answer: 1 }), '应读 zhǎng');
});

test('第1题必须把同字的另一个读音当干扰项，且四个选项都像拼音', () => {
  const c = changCard();
  c.quiz[0].options = ['zhǎng', 'zhàng', 'chǎng', 'zháng'];
  has(check(c), '少了对照读音 cháng');
  const c2 = changCard();
  c2.quiz[0].options = ['zhǎng', 'cháng', '长', 'zhàng'];
  has(check(c2), '不像拼音');
});

test('第2题给句选读音：题干要用「字」点出考的是哪个字，句子里这个字只能出现一次', () => {
  const q2 = (patch) => { const c = changCard(); c.quiz[1] = { ...c.quiz[1], ...patch }; return check(c); };
  has(q2({ question: '小树长得很快，这里的长读什么？' }), '点出考的是哪个字');
  has(q2({ question: '长长的绳子，这里的「长」读什么？' }), '只出现一次');
});

test('第2题的句子里不能混进另一个读音的组词，否则答案自相矛盾', () => {
  const c = changCard();
  c.quiz[1].question = '这根绳子长短正合适，这里的「长」读什么？';
  has(check(c), '另一个读音的组词');
});

test('第2题的正确项必须是这张卡教过的读音，另一个读音要在选项里', () => {
  const q2 = (patch) => { const c = changCard(); c.quiz[1] = { ...c.quiz[1], ...patch }; return check(c); };
  has(q2({ options: ['zhàng', 'cháng', 'chǎng', 'zháng'], answer: 0 }), '不是这张卡教的读音');
  const c = changCard();
  c.quiz[1].options = ['zhǎng', 'zhàng', 'chǎng', 'zháng'];
  has(check(c), '少了对照读音 cháng');
});

test('第3题辨义选词：正确项是卡上教过的组词，四个选项都得含这个字', () => {
  const q3 = (patch) => { const c = changCard(); c.quiz[2] = { ...c.quiz[2], ...patch }; return check(c); };
  has(q3({ options: ['长大', '变大', '长高', '生长'], answer: 0 }), '没有「长」');
  assert.deepEqual(q3({ options: ['长高', '长大', '长跑', '细长'], answer: 0 }), ['辨义选词的正确项「长高」不是这张卡教的组词（长短 / 长大）']);
});

test('第3题的题干不能把答案写出来', () => {
  const c = changCard();
  c.quiz[2].question = '「长大」说的是哪个词的意思？';
  has(check(c), '题干已经把答案');
});

test('pinyin-pro 与卡上读音不一致时给出人工复核提示，但不算错', () => {
  const hints = duoyinReadingHints(changCard(), (sentence, zi) => {
    // 模拟 pinyin-pro 把「长得」「长大」都误判成 cháng 的情形
    return zi === '长' && sentence.includes('长') ? 'cháng' : '';
  });
  assert.equal(hints.length, 2, `应挑出例句与第2题各一条：${JSON.stringify(hints)}`);
  assert.deepEqual(hints.map((h) => h.where), ['例句', '第2题']);
  assert.deepEqual(hints.map((h) => h.declared), ['zhǎng', 'zhǎng']);
  assert.equal(hints[0].machine, 'cháng');
  assert.deepEqual(check(changCard()), [], '机器分歧不该变成报错');
});

// ---------- 识字内容 ----------

const shiziItems = content.shiziItems || [];
const ofGroup = (key) => shiziItems.filter((i) => i.group === key);

test('识字卡片不带插图', () => {
  for (const it of shiziItems) {
    assert.equal(it.illustration, undefined, `${it.id} 不该有 illustration`);
  }
});

test('识字篇章：一旦建档就必须 25 张，id 全局唯一且不与成语古诗冲突', () => {
  // 对照源清单而不是 content.shiziGroups：build-content.js 会把还没产出内容的篇章过滤掉，
  // 只看构建结果的话「少一整篇」会变成假绿。整篇没建档算待办（validate:content 会提示），
  // 但只要文件在了就必须是完整的 25 张。
  const source = JSON.parse(readFileSync(new URL('../../content/shizi-groups.json', import.meta.url), 'utf8'));
  for (const g of source) {
    let filed = true;
    try { readFileSync(new URL(`../../content/shizi/${g.key}.json`, import.meta.url)); } catch { filed = false; }
    if (!filed) continue;
    assert.equal(ofGroup(g.key).length, 25, `${g.key} 篇已建档却只有 ${ofGroup(g.key).length} 张，应为 25 张`);
  }
  const all = [...content.idioms, ...(content.poems || []), ...shiziItems].map((i) => i.id);
  assert.equal(new Set(all).size, all.length, '有重复 id');
  for (const it of shiziItems) assert.match(it.id, /^zi-[a-z]+(-[a-z]+)?$/);
});

test('每张卡的每个字都有拼音、部首、笔画、组词、例句，且组词例句里真的含这个字', () => {
  for (const it of shiziItems) {
    assert.ok(Array.isArray(it.chars) && it.chars.length >= 2, `${it.id} chars 少于 2 条`);
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

test('形近/同音/易错篇：word 是全体成员并列，字数与 chars 对得上', () => {
  for (const it of shiziItems) {
    if (it.group === 'duoyin') continue;
    assert.equal(Array.from(it.word).filter((c) => c !== ' ').length, it.chars.length, `${it.id} word 字数与 chars 对不上`);
  }
});

test('卡片拼音能被 pinyin-pro 的多音列表覆盖', () => {
  for (const it of shiziItems) {
    for (const c of it.chars) {
      assert.ok(readings(c.zi).includes(c.pinyin), `${it.id} ${c.zi}: 声明 ${c.pinyin}，pinyin-pro 给 ${readings(c.zi).join('/')}`);
    }
  }
});

test('三题的题型、选项、答案下标都合规，且按篇章走对应那套规则', () => {
  for (const it of shiziItems) {
    assert.equal(it.quiz.length, 3, `${it.id} 不是三题`);
    assert.deepEqual(it.quiz.map((q) => q.type), typesOfGroup(it.group), `${it.id} 题型顺序不对`);
    it.quiz.forEach((q, i) => {
      assert.ok(q.question, `${it.id} 第${i + 1}题缺 question`);
      assert.equal(q.options.length, 4, `${it.id} 第${i + 1}题选项不是 4 个`);
      assert.equal(new Set(q.options).size, 4, `${it.id} 第${i + 1}题选项有重复`);
      assert.ok(q.answer >= 0 && q.answer <= 3, `${it.id} 第${i + 1}题 answer 越界`);
      assert.ok(q.explain, `${it.id} 第${i + 1}题缺 explain`);
    });
    if (it.group === 'duoyin') {
      assert.deepEqual(checkDuoyinCard(it, { readingsOf: readings }), [], `${it.id} 多音字卡不合规`);
    } else {
      assert.ok(it.quiz[0].question.includes('（　）'), `${it.id} 给词选字题缺全角空格（　）`);
    }
  }
});

test('识字文案不踩禁词', () => {
  // 与 scripts/validate-content.js 的 BANNED 保持一致；STYLE-GUIDE 里的「比喻」对 explain 是「尽量不用」，不作硬拦
  const BANNED = ['首先', '其次', '总而言之', '综上所述', '众所周知', '由此可见', '让我们',
    '我们应该', '我们要', '小朋友们', '告诉我们', '形容'];
  for (const it of shiziItems) {
    const texts = [it.tip, ...it.chars.flatMap((c) => [c.sentence, c.word]), ...it.quiz.flatMap((q) => [q.question, q.explain, ...q.options])];
    for (const t of texts) {
      for (const b of BANNED) assert.ok(!String(t || '').includes(b), `${it.id} 含禁词「${b}」：${t}`);
    }
  }
});

test('三题的正确答案下标在整篇里分布均匀（防出题偷懒）', () => {
  for (const g of content.shiziGroups) {
    const items = ofGroup(g.key);
    for (let i = 0; i < 3; i++) {
      const counts = [0, 0, 0, 0];
      for (const it of items) counts[it.quiz[i].answer]++;
      const used = counts.filter((c) => c > 0).length;
      assert.ok(used >= 3, `${g.key} 第${i + 1}题答案只落在 ${used} 个位置：${counts.join('/')}`);
    }
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
