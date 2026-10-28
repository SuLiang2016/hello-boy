// 前端侧的板块注册表与装扮目录：纯数据，不引 pinia / content.json，
// 所以 tests/registry.test.mjs 能直接 import 它，和服务端那两份对照。
// 服务端副本：server/board-rules.js 的 BOARDS、server/stars.js 的 OUTFITS。

// name、title、again、routes 是视图侧字段，服务端不需要；
// board / groupsKey / itemsKey / unit / title 必须与服务端逐字相同。
export const BOARDS = [
  {
    board: 'idiom', groupsKey: 'groups', itemsKey: 'idioms',
    name: '成语', unit: '个', title: '成语篇章', again: '故事',
    routes: { groups: 'groups', group: 'group', learn: 'learn', quiz: 'quiz' },
  },
  {
    board: 'poem', groupsKey: 'poemGroups', itemsKey: 'poems',
    name: '古诗', unit: '首', title: '古诗篇章', again: '诗',
    routes: { groups: 'poem-groups', group: 'poem-group', learn: 'poem-learn', quiz: 'poem-quiz' },
  },
  {
    board: 'shizi', groupsKey: 'shiziGroups', itemsKey: 'shiziItems',
    name: '识字', unit: '张', title: '识字篇章', again: '这组字',
    routes: { groups: 'shizi-groups', group: 'shizi-group', learn: 'shizi-learn', quiz: 'shizi-quiz' },
  },
]

// 装扮目录（与服务端 stars.js 保持一致）
export const OUTFITS = [
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
  { id: 'scene-starry', slot: 'scene', name: '星空', price: 12 },
  { id: 'scene-meadow', slot: 'scene', name: '草地', price: 12 },
  { id: 'scene-undersea', slot: 'scene', name: '海底', price: 15 },
  { id: 'scene-forest', slot: 'scene', name: '森林', price: 15 },
  { id: 'scene-castle', slot: 'scene', name: '彩虹城堡', price: 50 },
]
