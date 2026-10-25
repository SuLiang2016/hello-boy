// 服务端加载内容清单（构建产物 src/assets/content.json）
const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(__dirname, '..', 'src', 'assets', 'content.json');

let cache = null;

function loadContent() {
  if (cache) return cache;
  if (!fs.existsSync(CONTENT_PATH)) {
    throw new Error('内容文件不存在：请先运行 npm run build:content（或 npm run build）');
  }
  cache = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  return cache;
}

// 篇章索引：groupKey -> 该篇章下的内容 id 列表（成语、古诗都在里面，key 全局唯一）
function groupIndex() {
  const c = loadContent();
  const idx = {};
  for (const g of c.groups) idx[g.key] = c.idioms.filter((i) => i.group === g.key).map((i) => i.id);
  for (const g of c.poemGroups || []) idx[g.key] = (c.poems || []).filter((i) => i.group === g.key).map((i) => i.id);
  return idx;
}

// groupKey -> 所属板块（idiom | poem）
function boardOfGroups() {
  const c = loadContent();
  const map = {};
  for (const g of c.groups) map[g.key] = 'idiom';
  for (const g of c.poemGroups || []) map[g.key] = 'poem';
  return map;
}

// 板块顺序与篇章 key 列表（解锁按板块内篇章顺序推进）
function boardGroupKeys() {
  const c = loadContent();
  return {
    idiom: c.groups.map((g) => g.key),
    poem: (c.poemGroups || []).map((g) => g.key),
  };
}

// 内容 id 属于哪个板块；不存在返回 null
function boardOfItem(id) {
  const c = loadContent();
  if (c.idioms.some((i) => i.id === id)) return 'idiom';
  if ((c.poems || []).some((p) => p.id === id)) return 'poem';
  return null;
}

// 解锁下一篇章需要学会的数量：成语 8/10、古诗 12/15，统一按 80% 向上取整
function unlockThreshold(total) {
  return Math.ceil(total * 0.8);
}

module.exports = { loadContent, groupIndex, boardOfGroups, boardGroupKeys, boardOfItem, unlockThreshold };
