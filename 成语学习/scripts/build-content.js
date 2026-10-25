// 合并 ../content 下的篇章与内容 JSON -> src/assets/content.json（前端打包用）
// 成语：groups.json + idioms/<key>.json；古诗（三期）：poem-groups.json + poems/<key>.json
const fs = require('fs');
const path = require('path');

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

const idiom = merge('idioms', 'groups.json', 'group');
const poem = merge('poems', 'poem-groups.json', 'group');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify({ groups: idiom.groups, idioms: idiom.items, poemGroups: poem.groups, poems: poem.items }, null, 0),
  'utf8'
);
console.log(`合计成语 ${idiom.items.length} 条 + 古诗 ${poem.items.length} 首 -> ${path.relative(process.cwd(), OUT)}`);
