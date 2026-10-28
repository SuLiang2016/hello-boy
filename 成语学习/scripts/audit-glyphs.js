// 识字卡「部首 / 笔画 / 拼音」机器核对：cnchar + hanzi-writer-data 两套独立数据对笔画，
// 部首取 cnchar 的新华口径，拼音以仓库自带的 pinyin-pro 为准。
//
// 这三个包不是项目依赖（内容生产工具，不进 app 包），交稿前临时装一次、不写进 package.json：
//   npm i --no-save cnchar cnchar-radical hanzi-writer-data
// 然后：npm run audit:glyphs   （有分歧就非零退出）
const fs = require('fs');
const path = require('path');

const DEPS = ['cnchar', 'cnchar-radical', 'hanzi-writer-data'];
const missing = DEPS.filter((d) => {
  try { require.resolve(d); return false; } catch { return true; }
});
if (missing.length) {
  console.error(`缺核对用的包：${missing.join('、')}`);
  console.error('先跑：npm i --no-save cnchar cnchar-radical hanzi-writer-data');
  process.exit(1);
}

const cnchar = require('cnchar');
cnchar.use(require('cnchar-radical'));
const { pinyin, polyphonic } = require('pinyin-pro');

const SRC = path.join(__dirname, '..', '..', 'content', 'shizi');
const GROUPS = JSON.parse(fs.readFileSync(path.join(SRC, '..', 'shizi-groups.json'), 'utf8')).map((g) => g.key);

// cnchar 给不出部首的个别字（新华口径也没收录），这里记人工核定的取值，卡上必须与之一致
const RADICAL_FALLBACK = { 剑: '刂', 箭: '竹' };

let errors = 0;
let chars = 0;
const info = [];

for (const key of GROUPS) {
  const fp = path.join(SRC, `${key}.json`);
  if (!fs.existsSync(fp)) { console.warn(`[识字·${key}] 篇章文件不存在，跳过`); continue; }
  const cards = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const seen = new Map();
  for (const c of cards) for (const ch of c.chars) {
    // 多音字篇同一个字出现多条读音，部首笔画必须一致——抄卡时最容易漏改
    const prev = seen.get(ch.zi);
    if (prev && (prev.radical !== ch.radical || prev.strokes !== ch.strokes)) {
      errors++;
      console.error(`  ✗ [${key}] ${c.id}「${ch.zi}」同一张卡里部首/笔画自相矛盾：${prev.radical}/${prev.strokes} vs ${ch.radical}/${ch.strokes}`);
    }
    seen.set(ch.zi, ch);
    chars++;

    const cnStrokes = cnchar.stroke(ch.zi);
    let hwStrokes = null;
    try {
      hwStrokes = JSON.parse(fs.readFileSync(require.resolve(`hanzi-writer-data/${ch.zi}.json`), 'utf8')).strokes.length;
    } catch { /* 库里没这个字（如 曈），下面按单源处理 */ }
    if (hwStrokes === null) info.push(`hanzi-writer 库里没有「${ch.zi}」（${key} ${c.id}），只有 cnchar 单源：${cnStrokes} 画`);
    if (cnStrokes !== ch.strokes || (hwStrokes !== null && hwStrokes !== ch.strokes)) {
      errors++;
      console.error(`  ✗ [${key}] ${c.id}「${ch.zi}」笔画：卡上 ${ch.strokes} | cnchar ${cnStrokes} | hanzi-writer ${hwStrokes}`);
    }

    const r = cnchar.radical(ch.zi);
    const cnRadical = r && r[0] ? r[0].radical : '';
    if (!cnRadical) {
      const manual = RADICAL_FALLBACK[ch.zi];
      if (manual) { if (manual !== ch.radical) { errors++; console.error(`  ✗ [${key}] ${c.id}「${ch.zi}」部首应为人工核定的「${manual}」，卡上是「${ch.radical}」`); } }
      else info.push(`cnchar 给不出「${ch.zi}」的部首（${key} ${c.id}），卡上「${ch.radical}」是人工值，未纳入对照`);
    } else if (cnRadical !== ch.radical) {
      errors++;
      console.error(`  ✗ [${key}] ${c.id}「${ch.zi}」部首：卡上「${ch.radical}」| cnchar 新华口径「${cnRadical}」`);
    }

    const one = pinyin(ch.zi, { toneType: 'diacritic' });
    const readings = String(polyphonic(ch.zi) || '').split(/\s+/).filter(Boolean);
    if (one !== ch.pinyin && !readings.includes(ch.pinyin)) {
      errors++;
      console.error(`  ✗ [${key}] ${c.id}「${ch.zi}」拼音：卡上 ${ch.pinyin} | pinyin-pro ${one}${readings.length ? ` | 多音 ${readings.join('/')}` : ''}`);
    }
  }
  console.log(`[识字·${key}] ${cards.length} 张核完`);
}

for (const line of info) console.log(`  · ${line}`);
console.log(errors ? `\n✗ ${chars} 个字里有 ${errors} 处与机器数据不一致` : `\n✓ ${chars} 个字的部首/笔画/拼音与两套机器数据一致`);
process.exit(errors ? 1 : 0);
