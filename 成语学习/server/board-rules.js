// 板块注册表 + 五期新机制的纯规则。
// 新增一个板块只改 BOARDS 一处；前端 src/store.js 里有对应的副本，改动要同步（同 OUTFITS 的约定）。
const BOARDS = [
  { board: 'idiom', dir: 'idioms', groupsFile: 'groups.json', groupsKey: 'groups', itemsKey: 'idioms', unit: '个', title: '成语篇章' },
  { board: 'poem', dir: 'poems', groupsFile: 'poem-groups.json', groupsKey: 'poemGroups', itemsKey: 'poems', unit: '首', title: '古诗篇章' },
  { board: 'shizi', dir: 'shizi', groupsFile: 'shizi-groups.json', groupsKey: 'shiziGroups', itemsKey: 'shiziItems', unit: '张', title: '识字篇章' },
];

// 每日新学上限：识字每天最多算学会 3 张，其余板块不限。
// 目的是锁住复习队列的日增量——每张卡会产生 5 个未来到期，不设上限一天学满 25 张就会堆出 125 条欠账。
const DAILY_CAPS = { shizi: 3 };

// 每日复习上限：三个板块共用一条队列，超出的顺延到第二天（到期最久的先做，天然就是顺延）
const REVIEW_DAILY_LIMIT = 20;

function boardOf(board) {
  return BOARDS.find((b) => b.board === board) || null;
}

// 解锁下一篇章：学会本篇的 80%（成语 8/10、古诗 12/15、识字 20/25）
function unlockThreshold(total) {
  return Math.ceil(total * 0.8);
}

function dailyCap(board) {
  const cap = DAILY_CAPS[board];
  return cap === undefined ? null : cap;
}

// 今天还能不能再把一张新卡记为「学会」
function canLearnNew(board, learnedToday) {
  const cap = dailyCap(board);
  return cap === null || learnedToday < cap;
}

// 今日复习队列：到期最久的排前面，截到上限。
// 排序必须稳定（同到期日按 id），否则翻页或重进会看到队列抖动。
function pickDueToday(rows, today, limit = REVIEW_DAILY_LIMIT) {
  return rows
    .filter((r) => r.due && r.due <= today)
    .sort((a, b) => {
      if (a.due !== b.due) return a.due < b.due ? -1 : 1;
      if (a.id === b.id) return 0;
      return a.id < b.id ? -1 : 1;
    })
    .slice(0, limit);
}

// 当天的复习奖励星判定。
// 不能用「剩余到期 == 0」单独判：做完上限内的 20 条后，队列会自动补进第 21 条，剩余永远不为 0，
// 那颗星就再也拿不到。所以两条路并列——做满上限，或到期本来就不足上限时全部做完。
function earnedReviewStar({ remaining, reviewsToday, limit = REVIEW_DAILY_LIMIT }) {
  return remaining <= 0 || reviewsToday >= limit;
}

module.exports = {
  BOARDS, boardOf, unlockThreshold, dailyCap, canLearnNew,
  pickDueToday, earnedReviewStar, REVIEW_DAILY_LIMIT,
};
