// 星星流水账 + 装扮目录（服务端唯一事实源，前端副本在 src/catalog.mjs，由 tests/registry.test.mjs 对照）
const db = require('./db');

// 槽位：hat / glasses / scarf / head（蝴蝶结）/ scene（场景件，三期）
const OUTFITS = [
  { id: 'straw-hat', slot: 'hat', name: '草帽', price: 5 },
  { id: 'round-glasses', slot: 'glasses', name: '圆眼镜', price: 5 },
  { id: 'red-scarf', slot: 'scarf', name: '红围巾', price: 5 },
  { id: 'bow', slot: 'head', name: '蝴蝶结', price: 6 },
  { id: 'star-headband', slot: 'head', name: '星星发箍', price: 30 },
  { id: 'tiger-hat', slot: 'hat', name: '虎头帽', price: 8 },
  { id: 'sunglasses', slot: 'glasses', name: '墨镜', price: 8 },
  { id: 'rainbow-scarf', slot: 'scarf', name: '彩虹围巾', price: 8 },
  { id: 'magic-hat', slot: 'hat', name: '魔法帽', price: 10 },
  { id: 'dr-hat', slot: 'hat', name: '博士帽', price: 12 },
  { id: 'crown', slot: 'hat', name: '金皇冠', price: 15 },
  // 五期高价件：消化识字灌进来的星星（目录总价 216★ → 396★），竹斗笠与识字卡的「笠」互相强化
  { id: 'bamboo-hat', slot: 'hat', name: '竹斗笠', price: 40 },
  // 三期场景件：换首页「学习乐园」的背景画面，一次生效一件
  { id: 'scene-starry', slot: 'scene', name: '星空', price: 12 },
  { id: 'scene-meadow', slot: 'scene', name: '草地', price: 12 },
  { id: 'scene-undersea', slot: 'scene', name: '海底', price: 15 },
  { id: 'scene-forest', slot: 'scene', name: '森林', price: 15 },
  { id: 'scene-castle', slot: 'scene', name: '彩虹城堡', price: 50 },
  // 五期场景件：画面取自孩子刚学过的诗，识字卡和首页互相强化
  { id: 'scene-pond', slot: 'scene', name: '小池', price: 60 },
  { id: 'scene-fishing', slot: 'scene', name: '渔歌子', price: 80 },
];

function wallet(kidId) {
  const r = db.prepare('SELECT COALESCE(SUM(delta), 0) AS w FROM star_events WHERE kid_id = ?').get(kidId);
  return r.w;
}

function addEvent(kidId, kind, delta, ref) {
  db.prepare('INSERT INTO star_events (kid_id, kind, delta, ref, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(kidId, kind, delta, ref, new Date().toISOString());
}

function ownedOutfits(kidId) {
  return db.prepare('SELECT item_id FROM outfits WHERE kid_id = ?').all(kidId).map((r) => r.item_id);
}

function equippedOf(kidId) {
  const kid = db.prepare('SELECT equipped FROM kids WHERE id = ?').get(kidId);
  try { return JSON.parse(kid?.equipped || '{}'); } catch { return {}; }
}

module.exports = { OUTFITS, wallet, addEvent, ownedOutfits, equippedOf };
