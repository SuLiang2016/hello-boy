// 接龙链库读取与每日链轮换（内容是构建产物，服务端只读）
const { loadContent } = require('./content');

const DAILY_LENGTH = 6;

function chainData() {
  const c = loadContent();
  if (!c.chain || !Array.isArray(c.chain.words) || !Array.isArray(c.chain.chains)) {
    throw new Error('接龙内容未构建：请先运行 npm run build:content');
  }
  return c.chain;
}

function resolveChain(chain) {
  const map = new Map(chainData().words.map((w) => [w.word, w]));
  const words = chain.words.map((word) => map.get(word));
  if (words.some((w) => !w)) throw new Error(`接龙链 ${chain.id} 含词库外成语`);
  return { id: chain.id, words };
}

function dayNumber(date) {
  const [y, m, d] = String(date).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function dailyIndex(date, total) {
  return ((dayNumber(date) % total) + total) % total;
}

function getDailyChain(date) {
  const chains = chainData().chains;
  if (!chains.length) return null;
  const chain = resolveChain(chains[dailyIndex(date, chains.length)]);
  return { id: chain.id, words: chain.words.slice(0, DAILY_LENGTH) };
}

function getFreeChain(random = Math.random) {
  const chains = chainData().chains;
  if (!chains.length) return null;
  return resolveChain(chains[Math.floor(random() * chains.length)]);
}

function getChainById(id) {
  const chain = chainData().chains.find((c) => c.id === id);
  return chain ? resolveChain(chain) : null;
}

module.exports = { DAILY_LENGTH, dailyIndex, getDailyChain, getFreeChain, getChainById };
