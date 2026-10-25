import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildOptions, pickHintOption } from '../src/chain-logic.mjs';

const require = createRequire(import.meta.url);
const content = require('../src/assets/content.json');
const words = content.chain.words;
const chains = content.chain.chains;
const wordMap = new Map(words.map((w) => [w.word, w]));
const { polyphonic } = require('pinyin-pro');
const stableEdges = require('../../content/chain/stable-edges.json');

function readings(ch) {
  const r = polyphonic(ch);
  return (Array.isArray(r) ? r.join(' ') : String(r || '')).split(/\s+/).filter(Boolean);
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('词库 300、链库 90、学习锚点 59（五字成语不参与）', () => {
  assert.equal(words.length, 300);
  assert.equal(chains.length, 90);
  assert.equal(words.filter((w) => w.cardId).length, 59);
  assert.equal(words.filter((w) => !w.cardId).length, 241);
});

test('词条都是四字、四音节，带首尾匹配键和一句意思', () => {
  for (const w of words) {
    assert.equal(Array.from(w.word).length, 4, w.word);
    assert.equal(w.pinyinParts.length, 4, w.word);
    assert.ok(w.firstKey && w.lastKey, w.word);
    assert.ok(w.meaning, w.word);
  }
});

test('首尾多音字都有稳定读音审核记录', () => {
  const stableMap = new Map(stableEdges.map((e) => [e.word, e]));
  for (const w of words) {
    const chars = Array.from(w.word);
    const need = readings(chars[0]).length > 1 || readings(chars[3]).length > 1;
    if (!need) continue;
    const e = stableMap.get(w.word);
    assert.ok(e, `${w.word} 缺稳定读音审核`);
    assert.equal(e.firstKey, w.firstKey, w.word);
    assert.equal(e.lastKey, w.lastKey, w.word);
  }
});

test('每条链长度 6-8、不重复、从学习成语起步、首尾相接', () => {
  const prefixes = new Set();
  const starts = new Set();
  for (const c of chains) {
    assert.ok(c.words.length >= 6 && c.words.length <= 8, c.id);
    assert.equal(new Set(c.words).size, c.words.length, `${c.id} 链内重复`);
    const entries = c.words.map((word) => {
      const w = wordMap.get(word);
      assert.ok(w, `${c.id} 词库外成语 ${word}`);
      return w;
    });
    assert.ok(entries[0].cardId, `${c.id} 不是从学习成语起步`);
    starts.add(entries[0].word);
    for (let i = 0; i < entries.length - 1; i++) {
      assert.equal(
        entries[i].lastKey,
        entries[i + 1].firstKey,
        `${c.id} ${entries[i].word}(${entries[i].lastKey}) -> ${entries[i + 1].word}(${entries[i + 1].firstKey})`
      );
    }
    prefixes.add(c.words.slice(0, 6).join('>'));
  }
  assert.equal(prefixes.size, 90, '每日链前缀重复');
  const anchors = words.filter((w) => w.cardId).map((w) => w.word).sort();
  assert.deepEqual([...starts].sort(), anchors, '有学习成语没有作为链起点');
});

test('每个接龙步骤都能生成 4 个不重复、只有 1 个能接上的选项', () => {
  const rng = seeded(20261025);
  for (const c of chains) {
    const full = c.words.map((word) => wordMap.get(word));
    const daily = full.slice(0, 6);
    for (const chainWords of [full, daily]) {
      for (let i = 0; i < chainWords.length - 1; i++) {
        const { options, answerIndex } = buildOptions(chainWords, words, i, rng);
        assert.equal(options.length, 4, `${c.id} 第 ${i + 1} 步不是 4 个选项`);
        assert.equal(new Set(options.map((o) => o.word)).size, 4, `${c.id} 第 ${i + 1} 步选项重复`);
        assert.equal(options[answerIndex].word, chainWords[i + 1].word);
        const matches = options.filter((o) => o.firstKey === chainWords[i].lastKey);
        assert.equal(matches.length, 1, `${c.id} 第 ${i + 1} 步正确项不唯一`);
        assert.equal(matches[0].word, chainWords[i + 1].word);
      }
    }
  }
});

test('每局 3 次提示只排除错误选项，排完只剩正确项', () => {
  const rng = seeded(20261026);
  for (const c of chains) {
    const chainWords = c.words.map((w) => wordMap.get(w));
    for (let i = 0; i < chainWords.length - 1; i++) {
      const { options, answerIndex } = buildOptions(chainWords, words, i, rng);
      const correct = options[answerIndex];
      const removed = new Set();
      for (let h = 0; h < 3; h++) {
        const pick = pickHintOption(options, answerIndex, removed, rng);
        assert.ok(pick, `${c.id} 第 ${i + 1} 步提示没有可排除项`);
        assert.notEqual(pick.word, correct.word);
        assert.ok(!removed.has(pick.word));
        removed.add(pick.word);
      }
      assert.equal(removed.size, 3);
      assert.equal(pickHintOption(options, answerIndex, removed, rng), null);
    }
  }
});

test('服务端每日链只返回链首 6 个', () => {
  const { getDailyChain, dailyIndex } = require('../server/chain.js');
  const date = '2026-10-25';
  const daily = getDailyChain(date);
  const source = chains[dailyIndex(date, chains.length)];
  assert.equal(daily.words.length, 6);
  assert.deepEqual(daily.words.map((w) => w.word), source.words.slice(0, 6));
});

test('每日链索引按日期稳定轮换，90 天覆盖全部链', () => {
  const { dailyIndex } = require('../server/chain.js');
  assert.equal(dailyIndex('2026-10-25', 90), dailyIndex('2026-10-25', 90));
  assert.notEqual(dailyIndex('2026-10-25', 90), dailyIndex('2026-10-26', 90));
  const seen = new Set();
  for (let i = 0; i < 90; i++) {
    const date = new Date(Date.UTC(2026, 9, 25 + i)).toISOString().slice(0, 10);
    const idx = dailyIndex(date, 90);
    assert.ok(idx >= 0 && idx < 90, date);
    seen.add(idx);
  }
  assert.equal(seen.size, 90);
});
