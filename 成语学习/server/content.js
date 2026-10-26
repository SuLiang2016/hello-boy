// 服务端加载内容清单（构建产物 src/assets/content.json）
// 板块清单只认 server/board-rules.js 的 BOARDS：加一个板块不用再改这个文件
const fs = require('fs');
const path = require('path');
const { BOARDS } = require('./board-rules');

// 内容清单路径：默认构建产物 src/assets/content.json，部署时可用 CYLY_CONTENT_PATH 指定
const CONTENT_PATH =
  process.env.CYLY_CONTENT_PATH || path.join(__dirname, '..', 'src', 'assets', 'content.json');

let cache = null;

function loadContent() {
  if (cache) return cache;
  if (!fs.existsSync(CONTENT_PATH)) {
    throw new Error(`内容文件不存在：${CONTENT_PATH}（请先运行 npm run build:content，或部署时一并上传该文件）`);
  }
  cache = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  return cache;
}

// 篇章索引：groupKey -> 该篇章下的内容 id 列表（key 全局唯一）
function groupIndex() {
  const c = loadContent();
  const idx = {};
  for (const b of BOARDS) {
    for (const g of c[b.groupsKey] || []) {
      idx[g.key] = (c[b.itemsKey] || []).filter((i) => i.group === g.key).map((i) => i.id);
    }
  }
  return idx;
}

// groupKey -> 所属板块
function boardOfGroups() {
  const c = loadContent();
  const map = {};
  for (const b of BOARDS) for (const g of c[b.groupsKey] || []) map[g.key] = b.board;
  return map;
}

// 板块 -> 篇章 key 列表（解锁按板块内篇章顺序推进）
function boardGroupKeys() {
  const c = loadContent();
  const out = {};
  for (const b of BOARDS) out[b.board] = (c[b.groupsKey] || []).map((g) => g.key);
  return out;
}

// 内容 id 属于哪个板块；不存在返回 null
function boardOfItem(id) {
  const c = loadContent();
  for (const b of BOARDS) {
    if ((c[b.itemsKey] || []).some((i) => i.id === id)) return b.board;
  }
  return null;
}

module.exports = { loadContent, groupIndex, boardOfGroups, boardGroupKeys, boardOfItem };
