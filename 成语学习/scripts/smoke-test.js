// API 冒烟测试：node scripts/smoke-test.js [baseUrl]
// 注意：会在数据库里创建/使用「测试娃」账号并写入学习记录，别在生产数据上跑
// 设置 CYLY_DATA_DIR 时会额外校验数据库里的复习排期，并模拟一条到期复习
const base = (process.argv[2] || 'http://localhost:4173') + '/api';
const j = (r) => r.json();

(async () => {
  const results = [];
  const log = (name, ok, extra = '') => {
    results.push((ok ? '✓' : '✗') + ' ' + name + (extra ? ' — ' + extra : ''));
    if (!ok) process.exitCode = 1;
  };

  let r = await fetch(base + '/bootstrap').then(j);

  let kidToken;
  if (r.needsSetup) {
    r = await fetch(base + '/setup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentPin: '123456', kid: { name: '测试娃', avatar: 'panda', pin: '1234' } }),
    }).then(j);
    kidToken = r.token;
    log('首次初始化 + 建号', !!kidToken);
  } else {
    const kids = await fetch(base + '/kids').then(j);
    if (!kids.length) return console.log('（已初始化但没有孩子账号，跳过）');
    r = await fetch(base + '/login/kid', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kidId: kids[0].id, pin: '1234' }),
    }).then(j);
    kidToken = r.token;
    log('已有账号登录', !!kidToken);
  }

  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + kidToken };
  const content = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'assets', 'content.json'), 'utf8'));
  const idA = content.idioms[0].id;
  const poem = content.poems[0];
  const poemGroup = content.poemGroups[0].key;
  const shiziGroup = content.shiziGroups[0].key;
  const shiziCards = content.shiziItems;

  log('内容含 60 成语 + 75 古诗 + 25 识字卡', content.idioms.length === 60 && content.poems.length === 75 && content.poemGroups.length === 5 && shiziCards.length === 25);

  const me = await fetch(base + '/me', { headers: H }).then(j);
  let p = await fetch(base + '/progress', { headers: H }).then(j);
  log('进度可读，成语/古诗第一篇章都解锁', p.unlocked.includes(content.groups[0].key) && p.unlocked.includes(poemGroup));

  await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: idA, correct: 1 }) });
  let q = await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: idA, correct: 2 }) }).then(j);
  log('先错后对：学会+1星+打卡', q.passed === true && q.starsDelta >= 1 && q.todayDone === true);

  q = await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: idA, correct: 3 }) }).then(j);
  log('重测全对可升2星', q.passed === true && q.totalStars >= 2);

  const res = await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: 'bu-cun-zai', correct: 3 }) });
  log('不存在的内容被拒', res.status === 400);

  // 古诗：先失败再通过，顺带覆盖「先失败后通过也要排复习」的修复
  await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: poem.id, correct: 1 }) });
  q = await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: poem.id, correct: 2 }) }).then(j);
  log('古诗先错后对：学会+星星', q.passed === true && q.starsDelta >= 1);

  p = await fetch(base + '/progress', { headers: H }).then(j);
  log('古诗计入诗板块', p.boardCounts.poem === 1 && p.learned[poem.id]?.board === 'poem');

  if (process.env.CYLY_DATA_DIR) {
    const { DatabaseSync } = require('node:sqlite');
    const path = require('path');
    const db = new DatabaseSync(path.join(process.env.CYLY_DATA_DIR, 'app.db'));
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const row = db.prepare('SELECT board, next_review_date FROM learned WHERE kid_id = ? AND idiom_id = ?').get(me.id, poem.id);
    log('古诗首次通过后写入复习日期', row?.board === 'poem' && !!row.next_review_date);

    const dayRow = db.prepare("SELECT new_learned FROM daily_board WHERE kid_id = ? AND board = 'poem' AND date = ?").get(me.id, today);
    log('古诗新学计入板块日统计', dayRow?.new_learned === 1);
    db.prepare('UPDATE learned SET next_review_date = ? WHERE kid_id = ? AND idiom_id = ?').run(today, me.id, poem.id);
    db.close();

    const p2 = await fetch(base + '/progress', { headers: H }).then(j);
    log('到期的古诗进入今日复习', p2.due.includes(poem.id));

    const rr = await fetch(base + '/review-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: poem.id }) }).then(j);
    log('古诗复习完成并拿到当天复习星', rr.stage === 1 && rr.bonusStar === true);

    const p3 = await fetch(base + '/progress', { headers: H }).then(j);
    log('复习后进度计入诗板块', p3.learned[poem.id]?.stage === 1 && p3.due.length === 0);

    const db2 = new DatabaseSync(path.join(process.env.CYLY_DATA_DIR, 'app.db'));
    const reviewDay = db2.prepare("SELECT reviews FROM daily_board WHERE kid_id = ? AND board = 'poem' AND date = ?").get(me.id, today);
    log('古诗复习计入板块日统计', reviewDay?.reviews === 1);
    db2.close();
  }

  // 识字板块：完整板块口径（计入学会/复习/星星/打卡）+ 每日新学上限 3 张
  p = await fetch(base + '/progress', { headers: H }).then(j);
  log('识字第一篇章解锁且不设锁', p.unlocked.includes(shiziGroup));

  const beforeShizi = await fetch(base + '/progress', { headers: H }).then(j);
  const szStarsBefore = beforeShizi.totalStars;
  const qz = [];
  for (let i = 0; i < 4; i++) {
    qz.push(await fetch(base + '/quiz-result', {
      method: 'POST', headers: H, body: JSON.stringify({ idiomId: shiziCards[i].id, correct: 3 }),
    }).then(j));
  }
  log('识字前 3 张按顺序学会并给星', qz.slice(0, 3).every((x) => x.passed === true && x.capped !== true && x.starsDelta === 2));
  log('第 4 张触发每日新学上限：不算学会、不给星', qz[3].passed === true && qz[3].capped === true && qz[3].starsDelta === 0 && qz[3].dailyCap === 3);

  p = await fetch(base + '/progress', { headers: H }).then(j);
  log('识字计入板块与进度，只记 3 张', p.boardCounts.shizi === 3 && !!p.learned[shiziCards[0].id] && !p.learned[shiziCards[3].id]);
  log('识字星星进同一个钱包', p.totalStars === szStarsBefore + 6);
  log('首页能读到今日识字上限情况', p.caps?.shizi?.cap === 3 && p.caps?.shizi?.learnedToday === 3 && p.caps?.shizi?.reached === true);

  // 上限只管新学：已经学会的识字卡重测仍可提星，不该被拦
  const reQuiz = await fetch(base + '/quiz-result', {
    method: 'POST', headers: H, body: JSON.stringify({ idiomId: shiziCards[0].id, correct: 3 }),
  }).then(j);
  log('已学会的识字卡重测不受上限影响', reQuiz.passed === true && reQuiz.capped !== true);

  // 识字不进接龙的解锁口径，也不该污染成语/古诗计数
  p = await fetch(base + '/progress', { headers: H }).then(j);
  log('识字不影响成语与古诗的计数', p.boardCounts.idiom === beforeShizi.boardCounts.idiom && p.boardCounts.poem === beforeShizi.boardCounts.poem);

  if (process.env.CYLY_DATA_DIR) {
    const { DatabaseSync } = require('node:sqlite');
    const path = require('path');
    const dbs = new DatabaseSync(path.join(process.env.CYLY_DATA_DIR, 'app.db'));
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const srow = dbs.prepare('SELECT board, next_review_date FROM learned WHERE kid_id = ? AND idiom_id = ?').get(me.id, shiziCards[0].id);
    log('识字首次学会写入 board=shizi 和复习日期', srow?.board === 'shizi' && !!srow.next_review_date);
    const sday = dbs.prepare("SELECT new_learned FROM daily_board WHERE kid_id = ? AND board = 'shizi' AND date = ?").get(me.id, today);
    log('识字新学计入板块日统计且被上限截在 3', sday?.new_learned === 3);
    dbs.prepare('UPDATE learned SET next_review_date = ? WHERE kid_id = ? AND idiom_id = ?').run(today, me.id, shiziCards[0].id);
    dbs.close();

    const ps = await fetch(base + '/progress', { headers: H }).then(j);
    log('到期的识字卡进入今日复习', ps.due.includes(shiziCards[0].id));
    const rrs = await fetch(base + '/review-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: shiziCards[0].id }) }).then(j);
    log('识字复习完成，日统计记在 shizi 板块', rrs.stage === 1);
    const dbt = new DatabaseSync(path.join(process.env.CYLY_DATA_DIR, 'app.db'));
    const srev = dbt.prepare("SELECT reviews FROM daily_board WHERE kid_id = ? AND board = 'shizi' AND date = ?").get(me.id, today);
    log('识字复习计入板块日统计（不再错记成成语）', srev?.reviews === 1);
    dbt.close();
  }

  // 接龙：每日链、记录、徽章、不污染学习口径
  const pBefore = await fetch(base + '/progress', { headers: H }).then(j);
  const dailyChain = await fetch(base + '/chain/daily', { headers: H }).then(j);
  log('每日链接龙可读', dailyChain.unlocked === true && dailyChain.chain?.words?.length === 6 && dailyChain.targetLength === 6);
  const dailyAgain = await fetch(base + '/chain/daily', { headers: H }).then(j);
  log('每日链同一天所有孩子共用一条', dailyAgain.chain?.id === dailyChain.chain?.id);

  const badChain = await fetch(base + '/chain/complete', {
    method: 'POST', headers: H, body: JSON.stringify({ mode: 'free', chainId: 'chain-不存在', stepsCompleted: 5 }),
  });
  log('不存在的接龙链被拒', badChain.status === 400);

  const earlyFinish = await fetch(base + '/chain/complete', {
    method: 'POST', headers: H,
    body: JSON.stringify({ mode: 'daily', chainId: dailyChain.chain.id, stepsCompleted: 0 }),
  });
  log('没走完步数不记录接龙局', earlyFinish.status === 400);

  let c = await fetch(base + '/chain/complete', {
    method: 'POST', headers: H,
    body: JSON.stringify({ mode: 'daily', chainId: dailyChain.chain.id, stepsCompleted: dailyChain.targetLength - 1 }),
  }).then(j);
  log('每日接龙记录成功', c.ok === true && c.length === 6 && c.totalPlays >= 1);

  const cAgain = await fetch(base + '/chain/complete', {
    method: 'POST', headers: H,
    body: JSON.stringify({ mode: 'daily', chainId: dailyChain.chain.id, stepsCompleted: dailyChain.targetLength - 1 }),
  }).then(j);
  log('每日链同一天只记一次', cAgain.already === true);

  const pAfter = await fetch(base + '/progress', { headers: H }).then(j);
  log('接龙不计星星/打卡/连续天数', pAfter.totalStars === pBefore.totalStars && pAfter.todayDone === pBefore.todayDone && pAfter.streak === pBefore.streak);
  log('首页可见今日接龙完成', pAfter.chainDailyDone === true);

  for (let i = 0; i < 9; i++) {
    const f = await fetch(base + '/chain/free', { headers: H }).then(j);
    log('自由练习链长 6-8', f.chain?.words?.length >= 6 && f.chain?.words?.length <= 8);
    c = await fetch(base + '/chain/complete', {
      method: 'POST', headers: H,
      body: JSON.stringify({ mode: 'free', chainId: f.chain.id, stepsCompleted: f.targetLength - 1 }),
    }).then(j);
    log('自由练习记录成功', c.ok === true && c.length >= 6 && c.length <= 8);
  }

  const pChain = await fetch(base + '/progress', { headers: H }).then(j);
  log('完成 10 局发接龙高手', pChain.badges.includes('chain-10'));
  log('自由练习计入接龙局数', pChain.chainPlayCount >= 10);
  log('自由练习也不给星星', pChain.totalStars === pBefore.totalStars);

  if (process.env.CYLY_DATA_DIR) {
    const { DatabaseSync } = require('node:sqlite');
    const path = require('path');
    const dbc = new DatabaseSync(path.join(process.env.CYLY_DATA_DIR, 'app.db'));
    const rows = dbc.prepare('SELECT mode, length FROM chain_plays WHERE kid_id = ?').all(me.id);
    log('chain_plays 写入每日链与自由练习',
      rows.some((r) => r.mode === 'daily' && r.length === 6) &&
      rows.some((r) => r.mode === 'free' && r.length >= 6 && r.length <= 8));
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const chainDaily = dbc.prepare(
      "SELECT COUNT(*) AS n FROM chain_plays WHERE kid_id = ? AND mode = 'daily' AND date = ?"
    ).get(me.id, today).n;
    log('每日链同一天只落一条记录', chainDaily === 1);
    dbc.close();
  }

  r = await fetch(base + '/login/parent', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: '123456' }),
  }).then(j);
  const PH = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + r.token };
  const ov = await fetch(base + '/parent/overview', { headers: PH }).then(j);
  log('家长总览可读', Array.isArray(ov) && ov.length > 0);
  const kidOv = ov.find((k) => k.id === me.id) || ov[0];
  log('周报按板块给出成语/古诗/识字', kidOv.boardCounts?.poem >= 1 && kidOv.boardCounts?.shizi >= 1 &&
    kidOv.week.byBoard.poem.newLearned >= 1 && kidOv.week.byBoard.shizi.newLearned >= 3);
  log('家长周报含接龙局数与最长链', kidOv.week.chainPlays >= 1 && kidOv.week.chainMaxLength >= 6);

  const exp = await fetch(base + '/parent/export', { headers: PH }).then(j);
  log('备份版本 5 含接龙记录与识字进度', exp.version === 5 &&
    Array.isArray(exp.data.chain_plays) && exp.data.chain_plays.length >= 1 &&
    exp.data.learned.some((r) => r.board === 'shizi'));

  const res2 = await fetch(base + '/parent/overview', { headers: H });
  log('孩子 token 进家长接口被拒', res2.status === 401);

  console.log(results.join('\n'));
})().catch((e) => { console.error('测试脚本异常:', e.message); process.exit(1); });
