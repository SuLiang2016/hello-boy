// API 冒烟测试：node scripts/smoke-test.js [baseUrl]
// 注意：会在数据库里创建/使用「测试娃」账号并写入学习记录，别在生产数据上跑
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
  const idB = content.idioms[1].id;

  let p = await fetch(base + '/progress', { headers: H }).then(j);
  log('进度可读，第一篇章解锁', p.unlocked.includes(content.groups[0].key));

  await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: idA, correct: 1 }) });
  let q = await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: idA, correct: 2 }) }).then(j);
  log('先错后对：学会+1星+打卡', q.passed === true && q.starsDelta >= 1 && q.todayDone === true);

  q = await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: idA, correct: 3 }) }).then(j);
  log('重测全对可升2星', q.passed === true && q.totalStars >= 2);

  const res = await fetch(base + '/quiz-result', { method: 'POST', headers: H, body: JSON.stringify({ idiomId: 'bu-cun-zai', correct: 3 }) });
  log('不存在的成语被拒', res.status === 400);

  r = await fetch(base + '/login/parent', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: '123456' }),
  }).then(j);
  const PH = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + r.token };
  const ov = await fetch(base + '/parent/overview', { headers: PH }).then(j);
  log('家长总览可读', Array.isArray(ov) && ov.length > 0);

  const res2 = await fetch(base + '/parent/overview', { headers: H });
  log('孩子 token 进家长接口被拒', res2.status === 401);

  console.log(results.join('\n'));
})().catch((e) => { console.error('测试脚本异常:', e.message); process.exit(1); });
