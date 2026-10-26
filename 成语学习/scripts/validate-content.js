// 内容质量校验：结构、禁词、题目正确性、SVG 规则（成语 + 古诗三期 + 接龙四期）
const fs = require('fs');
const path = require('path');
const { polyphonic, pinyin } = require('pinyin-pro');
const { edgeKeys, pinyinParts, hasToneMark } = require('../server/chain-utils');
const { BOARDS } = require('../server/board-rules');
const { typesOfGroup, checkDuoyinCard, duoyinReadingHints } = require('../server/shizi-rules');

const SRC = path.join(__dirname, '..', '..', 'content');

const GROUPS = ['dongwu', 'shuzi', 'ziran', 'renwu', 'jizhi', 'shenhua'];
const POEM_GROUPS = ['siji', 'shanshui', 'huaren', 'yongwu', 'jiaguo'];
const PALETTE = new Set([
  '#FFF7E6', '#3D3A36', '#E8604C', '#F5B841', '#F09A4A', '#7CA982', '#C8E6A0',
  '#5E8C61', '#6FA8DC', '#BDD9F2', '#4A7FB5', '#A9744F', '#8B5A3C', '#F8D8B8',
  '#FFFFFF', '#9E9C9A', '#7A7876', '#F5B8B8', '#A67AB5',
]);
const BANNED = ['首先', '其次', '总而言之', '综上所述', '众所周知', '由此可见', '让我们',
  '我们应该', '我们要', '小朋友们', '告诉我们', '形容'];

let errors = 0;
const fail = (msg) => { errors++; console.error('  ✗ ' + msg); };

// 去掉标点（上下句题用无标点的句子）
const stripPunct = (s) => String(s || '').replace(/[，。？！；：、」「'\s]/g, '');
const isHan = (ch) => /\p{Script=Han}/u.test(ch);

// polyphonic 返回的是 ['cháng zhǎng'] 这种「一个字符串装全部读音」的形状，拆开才好比对
const polyphonicReadings = (ch) => {
  try {
    const r = polyphonic(ch);
    return (Array.isArray(r) ? r.join(' ') : String(r || '')).split(/\s+/).filter(Boolean);
  } catch { return []; }
};

// 整句转拼音后按下标取那个字的读音。实测下标与字符一一对齐（标点原样占位）。
// ⚠️ 只对实词可靠：「小树长得很快」它给 cháng/dé、「慢慢地走」给 dì，
// 所以这个函数只用来给人提示分歧，绝不当判分依据（见 server/shizi-rules.js 的 duoyinReadingHints）。
const readingInContext = (sentence, zi) => {
  const chars = Array.from(String(sentence || ''));
  const i = chars.indexOf(zi);
  if (i < 0) return '';
  try { return pinyin(String(sentence), { type: 'array' })[i] || ''; } catch { return ''; }
};

function checkSvg(tag, svg) {
  if (!/^<svg\s+viewBox=['"]0 0 400 300['"]/.test(svg)) fail(`${tag} SVG 根元素不符合规范`);
  if (!svg.endsWith('</svg>')) fail(`${tag} SVG 结尾异常`);
  for (const bad of ['<text', 'gradient', 'filter', 'xlink', 'href=', '<image', '<script', '<animate']) {
    if (svg.includes(bad)) fail(`${tag} SVG 含禁用元素 ${bad}`);
  }
  for (const hex of svg.match(/#[0-9a-fA-F]{6}/g) || []) {
    if (!PALETTE.has(hex.toUpperCase())) fail(`${tag} SVG 用了调色板外的颜色 ${hex}`);
  }
}

function checkBanned(tag, field, text) {
  for (const w of BANNED) if ((text || '').includes(w)) fail(`${tag} ${field} 出现禁词「${w}」`);
}

// ---------- 成语（一期） ----------

const idiomIds = new Set();
const idiomByWord = new Map();
const idiomWordsSeen = new Set();

for (const g of GROUPS) {
  const fp = path.join(SRC, 'idioms', `${g}.json`);
  if (!fs.existsSync(fp)) { fail(`缺少文件 ${g}.json`); continue; }
  let arr;
  try { arr = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) { fail(`${g}.json 不是合法 JSON: ${e.message}`); continue; }

  console.log(`\n[成语·${g}] ${arr.length} 条`);
  if (arr.length !== 10) fail(`应有 10 条，实际 ${arr.length} 条`);

  const seen = new Set();
  let usageRight = 0;

  for (const it of arr) {
    const tag = it.word || '(?)';
    if (seen.has(it.id)) fail(`${tag} id 重复`);
    seen.add(it.id);
    if (idiomIds.has(it.id)) fail(`${tag} id 与其他篇章重复`);
    idiomIds.add(it.id);
    if (idiomWordsSeen.has(it.word)) fail(`${tag} 成语文字与其他条目重复`);
    idiomWordsSeen.add(it.word);
    idiomByWord.set(it.word, it);
    if (it.group !== g) fail(`${tag} group 应为 ${g}`);
    if (!/^[a-z-]+$/.test(it.id)) fail(`${tag} id 格式不对`);
    if (!it.word || it.word.length < 4 || it.word.length > 6) fail(`${tag} word 长度异常`);
    if (!it.pinyin || !/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(it.pinyin)) fail(`${tag} pinyin 缺声调`);
    if (!it.origin || it.origin.length > 12) fail(`${tag} origin 异常`);

    const storyLen = (it.story || '').length;
    if (storyLen < 60 || storyLen > 260) fail(`${tag} 故事 ${storyLen} 字，超出 60-260`);
    if ((it.summary || '').length > 90) fail(`${tag} 总结超过 90 字`);
    checkBanned(tag, 'story', it.story);
    checkBanned(tag, 'summary', it.summary);

    // 测验
    const q = it.quiz || [];
    if (q.length !== 3) { fail(`${tag} 测验应有 3 题`); continue; }
    if (q[0].type !== 'meaning' || q[1].type !== 'fill' || q[2].type !== 'usage') fail(`${tag} 三题类型/顺序不对`);
    if (!q[0].options || q[0].options.length !== 4) fail(`${tag} 第1题应 4 个选项`);
    else if (new Set(q[0].options).size !== 4) fail(`${tag} 第1题选项重复`);
    if (!(q[0].answer >= 0 && q[0].answer <= 3)) fail(`${tag} 第1题答案下标异常`);
    if (!q[1].question || !q[1].question.includes('（　）')) fail(`${tag} 第2题缺「（　）」`);
    if (!q[1].options || q[1].options.length !== 4) fail(`${tag} 第2题应 4 个选项`);
    else {
      const ans = q[1].options[q[1].answer];
      if (!ans || ans.length !== 1 || !it.word.includes(ans)) fail(`${tag} 第2题正确项「${ans}」不是成语原字`);
      if (new Set(q[1].options).size !== 4) fail(`${tag} 第2题选项重复`);
    }
    if (!q[2].question || !q[2].question.includes(it.word)) fail(`${tag} 第3题情境句里没有这个成语`);
    if (JSON.stringify(q[2].options) !== JSON.stringify(['用对了', '用错了'])) fail(`${tag} 第3题选项应固定`);
    if (q[2].answer === 0) usageRight++;
    for (const item of q) checkBanned(tag, '测验解释', item.explain);

    // 插图
    checkSvg(tag, it.illustration || '');
  }
  if (usageRight < 3 || usageRight > 7) fail(`${g} 「用对了」${usageRight} 条，占比失衡（应 3-7）`);
}

// ---------- 古诗（三期） ----------

const poemIds = new Set();

for (const g of POEM_GROUPS) {
  const fp = path.join(SRC, 'poems', `${g}.json`);
  if (!fs.existsSync(fp)) { fail(`缺少文件 poems/${g}.json`); continue; }
  let arr;
  try { arr = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) { fail(`poems/${g}.json 不是合法 JSON: ${e.message}`); continue; }

  console.log(`\n[古诗·${g}] ${arr.length} 首`);
  if (arr.length !== 15) fail(`应有 15 首，实际 ${arr.length} 首`);

  for (const it of arr) {
    const tag = it.title || '(?)';
    if (poemIds.has(it.id)) fail(`${tag} id 在古诗篇章间重复`);
    poemIds.add(it.id);
    if (idiomIds.has(it.id)) fail(`${tag} id 与成语重复`);
    if (it.group !== g) fail(`${tag} group 应为 ${g}`);
    if (!/^[a-z-]+$/.test(it.id)) fail(`${tag} id 格式不对`);
    if (!it.title || it.title.length > 20) fail(`${tag} title 异常`);
    if (!it.dynasty || it.dynasty.length > 3) fail(`${tag} dynasty 异常`);
    if (!it.author || it.author.length > 12) fail(`${tag} author 异常`);

    // 诗句
    const lines = it.lines || [];
    if (!Array.isArray(lines) || lines.length < 3 || lines.length > 12) fail(`${tag} 行数异常（${lines.length}）`);
    for (const line of lines) {
      if (typeof line !== 'string' || line.length < 2 || line.length > 24) fail(`${tag} 诗句「${line}」长度异常`);
      if (!Array.from(line).some(isHan)) fail(`${tag} 诗句「${line}」没有汉字`);
    }
    // 多音字修正表
    if (it.fixes) {
      for (const [ch, py] of Object.entries(it.fixes)) {
        if (!isHan(ch)) fail(`${tag} fixes 键「${ch}」不是汉字`);
        if (!/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/.test(py)) fail(`${tag} fixes「${ch}: ${py}」不是带调拼音`);
      }
    }

    const expLen = (it.explanation || '').length;
    if (expLen < 40 || expLen > 220) fail(`${tag} 诗意讲解 ${expLen} 字，超出 40-220`);
    const storyLen = (it.poetStory || '').length;
    if (storyLen < 40 || storyLen > 240) fail(`${tag} 诗人小故事 ${storyLen} 字，超出 40-240`);
    checkBanned(tag, 'explanation', it.explanation);
    checkBanned(tag, 'poetStory', it.poetStory);

    // 测验：meaning → fill → next
    const q = it.quiz || [];
    if (q.length !== 3) { fail(`${tag} 测验应有 3 题`); continue; }
    if (q[0].type !== 'meaning' || q[1].type !== 'fill' || q[2].type !== 'next') fail(`${tag} 三题类型/顺序不对`);

    for (let i = 0; i < 3; i++) {
      const item = q[i];
      if (!item.question) fail(`${tag} 第${i + 1}题缺 question`);
      if (!item.options || item.options.length !== 4) fail(`${tag} 第${i + 1}题应 4 个选项`);
      else if (new Set(item.options).size !== 4) fail(`${tag} 第${i + 1}题选项重复`);
      if (!(item.answer >= 0 && item.answer <= 3)) fail(`${tag} 第${i + 1}题答案下标异常`);
      if (!item.explain) fail(`${tag} 第${i + 1}题缺 explain`);
      checkBanned(tag, `第${i + 1}题解释`, item.explain);
    }
    if (q[0] && q[0].question && !q[0].question.includes(it.title)) fail(`${tag} 第1题（选诗意）没有点出诗题`);

    // fill：正确项是诗中原字，题目 = 某句把该字换成（　）
    if (q[1] && q[1].options) {
      const ans = q[1].options[q[1].answer];
      if (!ans || ans.length !== 1) fail(`${tag} 第2题正确项应是单个字`);
      else {
        const ok = lines.some((L) => stripPunct(L).includes(ans) &&
          L.replace(ans, '（　）') === q[1].question);
        if (!ok) fail(`${tag} 第2题题目与原句对不上（正确字「${ans}」）`);
      }
    }

    // next：question 是第 i 句（无标点），answer 是第 i+1 句（无标点）
    if (q[2] && q[2].question && q[2].options) {
      const bare = lines.map(stripPunct);
      const i = bare.indexOf(stripPunct(q[2].question));
      if (i < 0) fail(`${tag} 第3题上句不在诗里`);
      else if (i >= bare.length - 1) fail(`${tag} 第3题上句是最后一句，没有下一句`);
      else if (stripPunct(q[2].options[q[2].answer]) !== bare[i + 1]) fail(`${tag} 第3题正确项不是下一句`);
      else if (q[2].options.some((o) => o !== q[2].options[q[2].answer] && bare.includes(stripPunct(o)) && bare.indexOf(stripPunct(o)) === i + 1)) {
        fail(`${tag} 第3题出现重复的下一句选项`);
      }
    }

    checkSvg(tag, it.illustration || '');
  }
}

// ---------- 识字（五期） ----------

const SHIZI = BOARDS.find((b) => b.board === 'shizi');
const SHIZI_PER_GROUP = 25;
const shiziGroupsMeta = JSON.parse(fs.readFileSync(path.join(SRC, SHIZI.groupsFile), 'utf8'));
const shiziIds = new Set();
let shiziPending = 0;

for (const g of shiziGroupsMeta) {
  const fp = path.join(SRC, SHIZI.dir, `${g.key}.json`);
  if (!fs.existsSync(fp)) {
    console.warn(`\n[识字·${g.name}] 篇章还没产出内容，跳过（上线前必须补齐）`);
    shiziPending++;
    continue;
  }
  let arr;
  try { arr = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) { fail(`shizi/${g.key}.json 不是合法 JSON: ${e.message}`); continue; }

  console.log(`\n[识字·${g.name}] ${arr.length} 张`);
  if (!g.name || !g.motto) fail(`篇章 ${g.key} 缺 name 或 motto（name=术语、motto=孩子话）`);
  if (g.color && !PALETTE.has(g.color.toUpperCase())) fail(`篇章 ${g.key} 的颜色 ${g.color} 不在调色板内`);
  if (arr.length !== SHIZI_PER_GROUP) fail(`应有 ${SHIZI_PER_GROUP} 张，实际 ${arr.length} 张`);

  const posSeen = [new Set(), new Set(), new Set()];
  // 多音字篇的字族是「一个字 + 它的多个读音」，chars 一条一个读音：
  // 「族内字不重复」「word 是全体成员并列」「拼音必须带调」这三条对它都不成立（轻声 de 没有声调）
  const isDuoyin = typesOfGroup(g.key)[0] === 'sound';
  const readingHints = [];

  for (const it of arr) {
    const tag = it.word || '(?)';
    if (!/^zi-[a-z]+(-[a-z]+)?$/.test(it.id || '')) fail(`${tag} id 要形如 zi-ren / zi-ji-lv`);
    if (shiziIds.has(it.id)) fail(`${tag} id 在本板块内重复`);
    shiziIds.add(it.id);
    if (idiomIds.has(it.id) || poemIds.has(it.id)) fail(`${tag} id 与成语或古诗重复`);
    if (it.group !== g.key) fail(`${tag} group 应为 ${g.key}`);
    if (it.illustration !== undefined) fail(`${tag} 识字卡片不该带 illustration`);
    if (!it.tip || it.tip.length < 10 || it.tip.length > 90) fail(`${tag} 区分口诀要 10-90 字`);
    checkBanned(tag, 'tip', it.tip);

    const chars = it.chars || [];
    if (chars.length < 2) { fail(`${tag} ${isDuoyin ? '至少要教 2 个读音' : '字族至少 2 个字'}`); continue; }
    const family = chars.map((c) => c.zi);
    if (chars.map((c) => c.pinyin).join(' ') !== it.pinyin) fail(`${tag} pinyin 与 chars 不一致`);
    if (!isDuoyin) {
      if (new Set(family).size !== family.length) fail(`${tag} 字族内有重复的字`);
      if (Array.from((it.word || '').replace(/\s/g, '')).join('') !== family.join('')) fail(`${tag} word 与 chars 不一致`);
    }

    for (const c of chars) {
      const ct = `${tag}·${c.zi || '?'}`;
      for (const f of ['zi', 'pinyin', 'radical', 'strokes', 'word', 'sentence']) {
        if (c[f] === undefined || c[f] === '') fail(`${ct} 缺 ${f}`);
      }
      if (!isHan(c.zi)) fail(`${ct} 「zi」不是汉字`);
      // 多音字的读音以 pinyin-pro 的多音列表为准（下面那条规则），轻声本来就没有声调
      if (!isDuoyin && !hasToneMark(c.pinyin)) fail(`${ct} 拼音缺声调`);
      if (isDuoyin && !polyphonicReadings(c.zi).includes(c.pinyin)) {
        fail(`${ct} 读音 ${c.pinyin} 不在 pinyin-pro 的多音列表里（${polyphonicReadings(c.zi).join(' / ')}）`);
      }
      if (!Number.isInteger(c.strokes) || c.strokes < 1 || c.strokes > 40) fail(`${ct} 笔画数 ${c.strokes} 异常`);
      if (!String(c.word || '').includes(c.zi)) fail(`${ct} 组词「${c.word}」里没有这个字`);
      if (!String(c.sentence || '').includes(c.zi)) fail(`${ct} 例句里没有这个字`);
      checkBanned(ct, '组词例句', c.sentence);
    }

    const q = it.quiz || [];
    const types = typesOfGroup(g.key);
    if (q.length !== 3) { fail(`${tag} 测验应有 3 题`); continue; }
    if (q.map((x) => x.type).join() !== types.join()) fail(`${tag} 三题类型顺序应为 ${types.join(' → ')}`);

    q.forEach((qq, i) => {
      const qt = `${tag} 第${i + 1}题`;
      if (!qq.question) fail(`${qt} 缺 question`);
      if (!qq.options || qq.options.length !== 4) fail(`${qt} 应 4 个选项`);
      else if (new Set(qq.options).size !== 4) fail(`${qt} 选项有重复：${qq.options.join('/')}`);
      if (!(qq.answer >= 0 && qq.answer <= 3)) fail(`${qt} 答案下标越界`);
      if (!qq.explain) fail(`${qt} 缺 explain`);
      checkBanned(qt, 'explain', qq.explain);
      posSeen[i].add(qq.answer);
    });

    if (isDuoyin) {
      for (const e of checkDuoyinCard(it, { readingsOf: polyphonicReadings })) fail(`${tag} ${e}`);
      readingHints.push(...duoyinReadingHints(it, readingInContext));
      continue;
    }

    // 第 1 题 给词选字：正确项是族内单字，且题干必须由该字例句挖空得来（沿用古诗 fill 的严格口径）
    const a0 = q[0].options && q[0].options[q[0].answer];
    if (types[0] === 'fill') {
      if (q[0].question && !q[0].question.includes('（　）')) fail(`${tag} 给词选字题缺「（　）」`);
      const owner = chars.find((c) => c.zi === a0);
      if (!owner) {
        fail(`${tag} 给词选字正确项「${a0}」不在字族里`);
      } else {
        const derived = owner.sentence.split(a0).join('（　）');
        if (derived !== q[0].question) fail(`${tag} 给词选字题干与例句对不上：应为「${derived}」`);
        const alsoHere = family.filter((z) => z !== a0 && owner.sentence.includes(z));
        if (alsoHere.length) fail(`${tag} 例句里还混着同族字「${alsoHere.join('」「')}」，挖空会有第二个正确答案`);
      }
    }

    // 第 2 题 选写对的词：正确项要含族内某个字
    const a1 = q[1].options && q[1].options[q[1].answer];
    if (types[1] === 'word' && a1 && !family.some((z) => a1.includes(z))) {
      fail(`${tag} 选写对的词正确项「${a1}」不含字族里的字`);
    }

    // 第 3 题 辨字义/辨部件：正确项要么是族内单字，要么题干在问某个族字
    const a2 = q[2].options && q[2].options[q[2].answer];
    if (!family.includes(a2) && !family.some((z) => (q[2].question || '').includes(z))) {
      fail(`${tag} 辨字义正确项「${a2}」既不是字族里的单字，题干也没在问这个字族的字`);
    }
  }

  // 答案位置：运行时会打乱选项，所以只要求别全挤在同一格
  posSeen.forEach((s, i) => {
    if (s.size < 2) fail(`${g.key} 第${i + 1}题答案全落在同一个下标，出题偷懒`);
  });

  if (readingHints.length) {
    console.log(`  ⚠ pinyin-pro 整句定音与卡上读音不一致 ${readingHints.length} 处（不算错，人工过一眼句子是不是真有歧义）：`);
    for (const h of readingHints) console.log(`    ${h.zi} ${h.where}「${h.text}」卡上 ${h.declared} / 机器 ${h.machine}`);
  }
}
if (shiziPending) console.log(`\n（识字还有 ${shiziPending} 个篇章待产出）`);

// ---------- 接龙（四期） ----------

console.log('\n[接龙]');

const chainWordsFile = path.join(SRC, 'chain', 'words.json');
const chainsFile = path.join(SRC, 'chain', 'chains.json');
let extraWords = [];
let chains = [];

if (!fs.existsSync(chainWordsFile)) fail('缺少 content/chain/words.json');
else {
  try { extraWords = JSON.parse(fs.readFileSync(chainWordsFile, 'utf8')); }
  catch (e) { fail(`words.json 不是合法 JSON: ${e.message}`); }
}
if (!fs.existsSync(chainsFile)) fail('缺少 content/chain/chains.json');
else {
  try { chains = JSON.parse(fs.readFileSync(chainsFile, 'utf8')); }
  catch (e) { fail(`chains.json 不是合法 JSON: ${e.message}`); }
}

if (!Array.isArray(extraWords)) { fail('接龙词库应为数组'); extraWords = []; }
if (!Array.isArray(chains)) { fail('接龙链库应为数组'); chains = []; }

// 学习成语自动作为锚点，只收四字（「千里送鹅毛」五字，按规则不进接龙）
const anchorWords = new Map();
for (const [word, it] of idiomByWord) {
  if (Array.from(word).length !== 4) continue;
  const parts = pinyinParts(it.pinyin);
  if (parts.length !== 4) {
    fail(`学习成语「${word}」拼音应为 4 个音节`);
    continue;
  }
  if (!hasToneMark(parts[0]) || !hasToneMark(parts[3])) fail(`学习成语「${word}」首尾拼音缺声调`);
  const keys = edgeKeys(it.pinyin);
  anchorWords.set(word, {
    word, pinyin: it.pinyin, meaning: it.summary, cardId: it.id,
    firstKey: keys.firstKey, lastKey: keys.lastKey,
  });
}
console.log(`  学习成语锚点 ${anchorWords.size} 个（五字成语不参与）`);

const allChainWords = new Map();
for (const w of anchorWords.values()) allChainWords.set(w.word, w);

const extraSeen = new Set();
for (const w of extraWords) {
  if (!w || typeof w.word !== 'string' || typeof w.pinyin !== 'string') {
    fail('接龙专属词缺少 word 或 pinyin');
    continue;
  }
  const tag = w.word;
  const chars = Array.from(w.word);
  if (chars.length !== 4 || !chars.every(isHan)) fail(`${tag} 不是四字成语`);
  if (extraSeen.has(w.word)) fail(`${tag} 接龙词重复`);
  extraSeen.add(w.word);
  if (anchorWords.has(w.word)) fail(`${tag} 是学习成语，不用重复收录`);
  if (allChainWords.has(w.word)) fail(`${tag} 与已有接龙词重复`);

  const parts = pinyinParts(w.pinyin);
  if (parts.length !== 4) fail(`${tag} 拼音应为 4 个音节（${parts.length}）`);
  else if (!hasToneMark(parts[0]) || !hasToneMark(parts[3])) fail(`${tag} 首尾拼音缺声调，读音不稳定`);
  if (!w.meaning || w.meaning.length < 4 || w.meaning.length > 80) fail(`${tag} 一句意思长度异常`);
  checkBanned(tag, '接龙意思', w.meaning);
  const keys = edgeKeys(w.pinyin);
  if (!keys.firstKey || !keys.lastKey) fail(`${tag} 首尾拼音为空`);
  allChainWords.set(w.word, { ...w, firstKey: keys.firstKey, lastKey: keys.lastKey });
}

console.log(`  接龙词库 ${allChainWords.size} 个（专属 ${extraSeen.size}）`);
if (allChainWords.size !== 300) fail(`接龙词库应有 300 个，实际 ${allChainWords.size}`);
if (chains.length !== 90) fail(`接龙链库应有 90 条，实际 ${chains.length} 条`);

// 首尾是多音字的词必须有稳定读音审核记录，新增词不补审核会在这里拦下
const stableFile = path.join(SRC, 'chain', 'stable-edges.json');
let stableEdges = [];
if (!fs.existsSync(stableFile)) fail('缺少 content/chain/stable-edges.json');
else {
  try { stableEdges = JSON.parse(fs.readFileSync(stableFile, 'utf8')); }
  catch (e) { fail(`stable-edges.json 不是合法 JSON: ${e.message}`); }
}
if (!Array.isArray(stableEdges)) { fail('stable-edges.json 应为数组'); stableEdges = []; }
const stableMap = new Map();
for (const e of stableEdges) {
  if (!e || typeof e.word !== 'string') { fail('stable-edges 条目缺 word'); continue; }
  if (stableMap.has(e.word)) fail(`stable-edges 中「${e.word}」重复`);
  stableMap.set(e.word, e);
  const w = allChainWords.get(e.word);
  if (!w) { fail(`stable-edges 含词库外成语「${e.word}」`); continue; }
  const chars = Array.from(e.word);
  if (e.first !== chars[0] || e.last !== chars[3]) fail(`${e.word} 稳定读音记录的边字不对`);
  if (e.firstKey !== w.firstKey || e.lastKey !== w.lastKey) fail(`${e.word} 稳定读音与词库拼音不一致`);
}
for (const w of allChainWords.values()) {
  const chars = Array.from(w.word);
  const hasPolyEdge = polyphonicReadings(chars[0]).length > 1 || polyphonicReadings(chars[3]).length > 1;
  if (hasPolyEdge && !stableMap.has(w.word)) {
    fail(`${w.word} 首尾是多音字，需人工确认后写入 content/chain/stable-edges.json`);
  }
}
console.log(`  稳定读音审核 ${stableMap.size} 个多音字边`);

const chainIds = new Set();
const dailyPrefixes = new Map();
const chainStarts = new Set();
const wordPool = [...allChainWords.values()];

for (const c of chains) {
  const tag = c.id || '(?)';
  if (!/^chain-\d{2}$/.test(tag)) fail(`${tag} id 格式不对`);
  if (chainIds.has(tag)) fail(`${tag} 链 id 重复`);
  chainIds.add(tag);
  if (!Array.isArray(c.words) || c.words.length < 6 || c.words.length > 8) {
    fail(`${tag} 链长应为 6-8，实际 ${Array.isArray(c.words) ? c.words.length : '不是数组'}`);
    continue;
  }
  if (new Set(c.words).size !== c.words.length) fail(`${tag} 链内成语重复`);

  const entries = [];
  for (const word of c.words) {
    const w = allChainWords.get(word);
    if (!w) { fail(`${tag} 含词库外的成语「${word}」`); continue; }
    entries.push(w);
  }
  if (entries.length !== c.words.length) continue;

  if (!anchorWords.has(c.words[0])) fail(`${tag} 不是从学习成语起步`);
  else chainStarts.add(c.words[0]);

  const chainSet = new Set(c.words);
  for (let i = 0; i < entries.length - 1; i++) {
    const cur = entries[i];
    const next = entries[i + 1];
    if (cur.lastKey !== next.firstKey) {
      fail(`${tag} 第 ${i + 1} 步不接：${cur.word}(${cur.lastKey}) → ${next.word}(${next.firstKey})`);
    }
    // 死胡同：非末尾的每个成语，词库里都要有能接下去的词
    const out = wordPool.filter((w) => w.word !== cur.word && w.firstKey === cur.lastKey);
    if (!out.length) fail(`${tag} 第 ${i + 1} 个成语「${cur.word}」没有能接下去的词`);

    // 每步必须能凑出 3 个不匹配的干扰项，且 4 个选项里只有 1 个能接
    const distractors = wordPool.filter((w) => !chainSet.has(w.word) && w.firstKey !== cur.lastKey);
    if (distractors.length < 3) fail(`${tag} 第 ${i + 1} 步凑不够 3 个干扰项`);
    else {
      const options = [next, ...distractors.slice(0, 3)];
      const matches = options.filter((w) => w.firstKey === cur.lastKey);
      if (matches.length !== 1 || matches[0].word !== next.word) {
        fail(`${tag} 第 ${i + 1} 步正确项不唯一`);
      }
      if (new Set(options.map((w) => w.word)).size !== 4) fail(`${tag} 第 ${i + 1} 步选项重复`);
    }
  }

  // 每日链取链首 6 个：前缀不能和别的链完全一样，否则两条每日链内容重复
  const prefix = c.words.slice(0, 6).join('>');
  if (dailyPrefixes.has(prefix)) fail(`${tag} 每日链前缀与 ${dailyPrefixes.get(prefix)} 重复`);
  dailyPrefixes.set(prefix, tag);
}

for (const word of anchorWords.keys()) {
  if (!chainStarts.has(word)) fail(`学习成语「${word}」没有作为任何一条链的起点`);
}
console.log(`  链库 ${chains.length} 条，覆盖起点 ${chainStarts.size} 个，每日链前缀 ${dailyPrefixes.size} 条`);

console.log('\n========================================');
if (errors) { console.error(`共 ${errors} 个问题`); process.exit(1); }
console.log('全部通过 ✓');
