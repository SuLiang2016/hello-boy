// 合并 ../content 下的篇章与内容 JSON -> src/assets/content.json（前端打包用）
// 成语：groups.json + idioms/<key>.json；古诗（三期）：poem-groups.json + poems/<key>.json
// 接龙（四期）：chain/words.json + chain/chains.json，60 个学习成语自动作为锚点词
const fs = require('fs');
const path = require('path');
const { edgeKeys, pinyinParts } = require('../server/chain-utils');

const SRC = path.join(__dirname, '..', '..', 'content');
const OUT = path.join(__dirname, '..', 'src', 'assets', 'content.json');

function merge(boardDir, groupsFile, groupField) {
  const groups = JSON.parse(fs.readFileSync(path.join(SRC, groupsFile), 'utf8'));
  const items = [];
  for (const g of groups) {
    const file = path.join(SRC, boardDir, `${g.key}.json`);
    if (!fs.existsSync(file)) {
      console.warn(`[警告] 缺少 ${boardDir}/${g.key}.json，先跳过（最后构建前必须补齐）`);
      continue;
    }
    const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const item of arr) {
      items.push({ ...item, group: g.key, [groupField]: g.key });
    }
    console.log(`${g.name}: ${arr.length} 条`);
  }
  return { groups, items };
}

function mergeChain(idioms) {
  const wordsFile = path.join(SRC, 'chain', 'words.json');
  const chainsFile = path.join(SRC, 'chain', 'chains.json');
  if (!fs.existsSync(wordsFile) || !fs.existsSync(chainsFile)) {
    throw new Error('缺少 content/chain/words.json 或 content/chain/chains.json');
  }
  const extraWords = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));
  const chains = JSON.parse(fs.readFileSync(chainsFile, 'utf8'));

  const words = [];
  const seen = new Set();
  const add = (word) => {
    if (seen.has(word.word)) throw new Error(`接龙词重复：${word.word}`);
    const parts = pinyinParts(word.pinyin);
    if (parts.length !== 4) throw new Error(`接龙词「${word.word}」应为四字并有 4 个音节`);
    seen.add(word.word);
    words.push({ ...word, pinyinParts: parts, ...edgeKeys(word.pinyin) });
  };
  // 学习成语是锚点，带卡片 id；五字成语不进入接龙（规则只用四字）
  for (const item of idioms) {
    if (Array.from(item.word).length !== 4) {
      console.warn(`[接龙] 跳过非四字学习成语：${item.word}`);
      continue;
    }
    add({ word: item.word, pinyin: item.pinyin, meaning: item.summary, cardId: item.id });
  }
  for (const word of extraWords) add(word);

  console.log(`接龙词库: ${words.length} 个（锚点 ${words.filter((w) => w.cardId).length}），链 ${chains.length} 条`);
  return { words, chains };
}

const idiom = merge('idioms', 'groups.json', 'group');
const poem = merge('poems', 'poem-groups.json', 'group');
const chain = mergeChain(idiom.items);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify({
    groups: idiom.groups,
    idioms: idiom.items,
    poemGroups: poem.groups,
    poems: poem.items,
    chain,
  }, null, 0),
  'utf8'
);
console.log(`合计成语 ${idiom.items.length} 条 + 古诗 ${poem.items.length} 首 -> ${path.relative(process.cwd(), OUT)}`);
