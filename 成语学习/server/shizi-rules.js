// 识字卡片的纯校验规则（五期）。
// 和 board-rules.js 一样只放纯函数：scripts/validate-content.js 与 tests/shizi.test.mjs 共用同一套口径。
// 拼音能力由调用方注入（readingsOf / readingIn），这样规则本身可以喂夹具测。

// 三题题型按篇章分两套（DESIGN.md 五期）：多音字卡上只有一个字，「给词选字」无从选起
const SHIZI_TYPES_BY_GROUP = { duoyin: ['sound', 'sound2', 'meaning'] };
const SHIZI_TYPES_DEFAULT = ['fill', 'word', 'meaning'];

function typesOfGroup(groupKey) {
  return SHIZI_TYPES_BY_GROUP[groupKey] || SHIZI_TYPES_DEFAULT;
}

const PINYIN_RE = /^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/;

// 数一下 str 里出现了几次 sub（不用正则，字里可能有正则元字符）
function countOf(str, sub) {
  if (!str || !sub) return 0;
  return str.split(sub).length - 1;
}

function without(str, sub) {
  return String(str || '').split(sub).join('');
}

// 读音选项：必须像拼音。轻声（地 de、得 de）没有声调是合法的，所以这里不要求带调，
// 读音本身对不对由「必须是这个字在 pinyin-pro 多音列表里的读音」那条规则把关。
function checkPinyinOptions(options, label) {
  const errs = [];
  for (const o of options) {
    if (!PINYIN_RE.test(String(o || ''))) errs.push(`${label}的选项「${o}」不像拼音`);
  }
  return errs;
}

// 第 1 题 给词选读音：题干问卡上教过的某个组词，答案就是那个词的读音
function checkSoundByWord(q, chars, zi) {
  const question = q.question || '';
  const options = q.options || [];
  const asked = chars.filter((c) => question.includes(c.word));
  if (asked.length === 0) {
    return [`给词选读音的题干里没有出现任何组词（应含其一：${chars.map((c) => c.word).join(' / ')}）`];
  }
  if (asked.length > 1) {
    return [`给词选读音的题干同时出现了 ${asked.map((c) => `「${c.word}」`).join('')}，答案不唯一`];
  }
  const target = asked[0];
  const right = options[q.answer];
  const errs = [];
  if (right !== target.pinyin) {
    errs.push(`「${target.word}」的「${zi}」应读 ${target.pinyin}，正确项却是 ${right}`);
  }
  for (const c of chars) {
    if (c !== target && !options.includes(c.pinyin)) {
      errs.push(`给词选读音少了对照读音 ${c.pinyin}（同字的另一个读音必须当干扰项，否则不用辨就能答对）`);
    }
  }
  return errs.concat(checkPinyinOptions(options, '给词选读音'));
}

// 第 2 题 给句选读音：题干用「字」点出考的是哪个字，句子里这个字只出现一次
function checkSoundBySentence(q, chars, zi) {
  const question = q.question || '';
  const options = q.options || [];
  const ask = `「${zi}」`;
  if (!question.includes(ask)) {
    return [`给句选读音的题干要用${ask}点出考的是哪个字`];
  }
  const errs = [];
  const sentence = without(question, ask);
  const hits = countOf(sentence, zi);
  if (hits !== 1) {
    errs.push(`给句选读音的句子里「${zi}」应只出现一次，实际 ${hits} 次（出现多次可能各读各的音）`);
  }
  const right = options[q.answer];
  if (!chars.some((c) => c.pinyin === right)) {
    errs.push(`给句选读音的正确项 ${right} 不是这张卡教的读音（${chars.map((c) => c.pinyin).join(' / ')}）`);
  }
  // 句子里混进另一个读音的组词，等于自己把答案说反了
  for (const c of chars) {
    if (c.pinyin !== right && sentence.includes(c.word)) {
      errs.push(`给句选读音的句子里出现了另一个读音的组词「${c.word}」，与答案 ${right} 矛盾`);
    }
  }
  for (const c of chars) {
    if (c.pinyin !== right && !options.includes(c.pinyin)) {
      errs.push(`给句选读音少了对照读音 ${c.pinyin}`);
    }
  }
  return errs.concat(checkPinyinOptions(options, '给句选读音'));
}

// 第 3 题 辨义选词：题干说意思，四个选项都是含这个字的词，只有一个是卡上教过的正确组词
function checkMeaningWord(q, chars, zi) {
  const question = q.question || '';
  const options = q.options || [];
  const right = options[q.answer];
  const errs = [];
  if (!chars.some((c) => c.word === right)) {
    errs.push(`辨义选词的正确项「${right}」不是这张卡教的组词（${chars.map((c) => c.word).join(' / ')}）`);
  }
  for (const o of options) {
    if (!String(o).includes(zi)) errs.push(`辨义选词的选项「${o}」里没有「${zi}」，这一题考的是同一个字的不同意思`);
    if (question.includes(o)) errs.push(`辨义选词的题干已经把答案「${o}」写出来了`);
  }
  return errs;
}

// 多音字卡：一个字族 = 同一个字的多个读音，chars 一条一个读音。
// 因此「族内字不重复」「word 是全体成员并列」「fill 题干由例句挖空」这些规则对它都不成立，单独走这一套。
// deps.readingsOf(zi) -> 这个字的全部读音（pinyin-pro 的 polyphonic，已拆成数组）
function checkDuoyinCard(card, { readingsOf }) {
  const chars = Array.isArray(card.chars) ? card.chars : [];
  if (chars.length < 2) return [`多音字卡至少要教 2 个读音，实际 ${chars.length} 个`];
  const zi = chars[0].zi;
  const errs = [];

  for (const c of chars) {
    if (c.zi !== zi) errs.push(`多音字卡只能有一个字，出现了「${zi}」和「${c.zi}」`);
  }
  // 同一个字形，部首与笔画数必须一致——抄上一张卡时最容易漏改
  for (const f of ['radical', 'strokes']) {
    const vals = [...new Set(chars.map((c) => c[f]))];
    if (vals.length > 1) errs.push(`同一个字的 ${f} 不一致：${vals.join(' / ')}`);
  }

  const pys = chars.map((c) => c.pinyin);
  if (new Set(pys).size !== pys.length) errs.push(`读音有重复：${pys.join(' / ')}`);
  const known = readingsOf(zi) || [];
  for (const p of pys) {
    if (!known.includes(p)) errs.push(`「${zi}」声明的读音 ${p} 不在 pinyin-pro 的多音列表里（${known.join(' / ')}）`);
  }

  if (card.word !== zi) errs.push(`顶层 word 应是这个字本身「${zi}」，实际「${card.word}」`);
  if (card.pinyin !== pys.join(' ')) errs.push(`顶层 pinyin 应是各读音空格相连「${pys.join(' ')}」，实际「${card.pinyin}」`);

  const words = chars.map((c) => c.word);
  if (new Set(words).size !== words.length) errs.push(`各读音的组词重复了：${words.join(' / ')}`);
  for (const c of chars) {
    if (!String(c.word || '').includes(zi)) errs.push(`读音 ${c.pinyin} 的组词「${c.word}」里没有「${zi}」`);
    if (!String(c.sentence || '').includes(zi)) errs.push(`读音 ${c.pinyin} 的例句里没有「${zi}」`);
  }

  const q = Array.isArray(card.quiz) ? card.quiz : [];
  if (q.length !== 3) return errs; // 题数不对由通用规则报，这里不重复
  if (q[0]) errs.push(...checkSoundByWord(q[0], chars, zi));
  if (q[1]) errs.push(...checkSoundBySentence(q[1], chars, zi));
  if (q[2]) errs.push(...checkMeaningWord(q[2], chars, zi));
  return errs;
}

// pinyin-pro 的整句定音对虚词不可靠（实测「小树长得很快」给 cháng/dé、「慢慢地走」给 dì），
// 所以它不能当判分权威，只能在这里把分歧挑出来给人复核：机器都读错的句子，孩子多半也判不准。
// deps.readingIn(sentence, zi) -> 这个字在这句话里的读音
function duoyinReadingHints(card, readingIn) {
  const chars = Array.isArray(card.chars) ? card.chars : [];
  if (chars.length < 2) return [];
  const zi = chars[0].zi;
  const hints = [];
  const push = (text, declared, where) => {
    const machine = readingIn(text, zi);
    if (machine && machine !== declared) hints.push({ zi, text, declared, machine, where });
  };
  for (const c of chars) if (c.sentence) push(c.sentence, c.pinyin, '例句');
  const q2 = Array.isArray(card.quiz) ? card.quiz[1] : null;
  if (q2 && q2.type === 'sound2' && q2.question) {
    const sentence = without(q2.question, `「${zi}」`);
    if (countOf(sentence, zi) === 1) push(sentence, (q2.options || [])[q2.answer], '第2题');
  }
  return hints;
}

module.exports = {
  SHIZI_TYPES_BY_GROUP, SHIZI_TYPES_DEFAULT, typesOfGroup,
  checkDuoyinCard, duoyinReadingHints,
};
