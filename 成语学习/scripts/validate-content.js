// 内容质量校验：结构、禁词、题目正确性、SVG 规则（成语 + 古诗三期）
const fs = require('fs');
const path = require('path');

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

console.log('\n========================================');
if (errors) { console.error(`共 ${errors} 个问题`); process.exit(1); }
console.log('全部通过 ✓');
