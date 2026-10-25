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

  log('内容含 60 成语 + 75 古诗', content.idioms.length === 60 && content.poems.length === 75 && content.poemGroups.length === 5);

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

  r = await fetch(base + '/login/parent', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: '123456' }),
  }).then(j);
  const PH = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + r.token };
  const ov = await fetch(base + '/parent/overview', { headers: PH }).then(j);
  log('家长总览可读', Array.isArray(ov) && ov.length > 0);
  const kidOv = ov.find((k) => k.id === me.id) || ov[0];
  log('周报分列古诗', kidOv.poemCount >= 1 && kidOv.week.newPoem >= 1 && kidOv.week.poemReviews >= 1);

  const res2 = await fetch(base + '/parent/overview', { headers: H });
  log('孩子 token 进家长接口被拒', res2.status === 401);

  console.log(results.join('\n'));
})().catch((e) => { console.error('测试脚本异常:', e.message); process.exit(1); });
