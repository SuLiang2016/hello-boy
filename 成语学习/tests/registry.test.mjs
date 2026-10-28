import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// stars.js 会连带打开 sqlite；把数据目录指到临时目录，测试绝不碰 成语学习/data/
const sandbox = join(tmpdir(), `cyly-registry-test-${process.pid}`);
process.env.CYLY_DATA_DIR = sandbox;

const require = createRequire(import.meta.url);
const { BOARDS: SERVER_BOARDS } = require('../server/board-rules.js');
const { OUTFITS: SERVER_OUTFITS } = require('../server/stars.js');

// 前端那份是纯数据模块，不碰 pinia / content.json，所以能在 node 里直接 import
const { BOARDS: CLIENT_BOARDS, OUTFITS: CLIENT_OUTFITS } = await import('../src/catalog.mjs');

// 两个字段集合：必须逐字相同的（服务端按它记账、前端按它找内容），和各自独有的
const SHARED = ['board', 'groupsKey', 'itemsKey', 'unit', 'title'];
const SERVER_ONLY = ['dir', 'groupsFile'];
const CLIENT_ONLY = ['name', 'again', 'routes'];

test('板块注册表前后端两份的 board 顺序一致', () => {
  assert.deepEqual(CLIENT_BOARDS.map((b) => b.board), SERVER_BOARDS.map((b) => b.board));
  assert.deepEqual(SERVER_BOARDS.map((b) => b.board), ['idiom', 'poem', 'shizi']);
});

test('板块注册表前后端共有字段逐项相同（groupsKey/itemsKey/unit/title）', () => {
  for (const s of SERVER_BOARDS) {
    const c = CLIENT_BOARDS.find((b) => b.board === s.board);
    assert.ok(c, `前端缺板块 ${s.board}`);
    for (const f of SHARED) {
      if (f === 'board') continue;
      assert.deepEqual(c[f], s[f], `${s.board}.${f} 前后端不一致：前端「${JSON.stringify(c[f])}」/ 服务端「${JSON.stringify(s[f])}」`);
    }
  }
});

test('板块注册表各自独有的字段没被顺手删掉', () => {
  for (const s of SERVER_BOARDS) for (const f of SERVER_ONLY) assert.notEqual(s[f], undefined, `服务端 ${s.board} 缺 ${f}`);
  for (const c of CLIENT_BOARDS) {
    for (const f of CLIENT_ONLY) assert.notEqual(c[f], undefined, `前端 ${c.board} 缺 ${f}`);
    for (const r of ['groups', 'group', 'learn', 'quiz']) assert.ok(c.routes[r], `前端 ${c.board} 缺路由段 ${r}`);
  }
});

test('装扮目录前后端两份完全一致（id/槽位/名称/价格）', () => {
  assert.deepEqual(CLIENT_OUTFITS, SERVER_OUTFITS);
});

test('装扮目录 id 不重复、槽位与价格是合法值', () => {
  for (const [where, list] of [['前端', CLIENT_OUTFITS], ['服务端', SERVER_OUTFITS]]) {
    const ids = list.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${where}装扮 id 有重复`);
    for (const o of list) {
      assert.ok(o.slot && o.name, `${where}装扮 ${o.id} 缺槽位或名称`);
      assert.ok(Number.isInteger(o.price) && o.price > 0, `${where}装扮 ${o.id} 价格异常：${o.price}`);
    }
  }
});
