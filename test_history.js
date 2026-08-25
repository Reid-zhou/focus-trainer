// 验证：完成一局后 store.history 记录带完成时间，且成就页 #stats-history 渲染带时间条目
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) errors.push(e.message); });

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://example.com/',
  virtualConsole: vc,
  beforeParse(window) {
    window.HTMLMediaElement && (window.HTMLMediaElement.prototype.play = () => Promise.resolve());
    window.HTMLMediaElement && (window.HTMLMediaElement.prototype.pause = () => {});
    window.requestAnimationFrame = window.requestAnimationFrame || (cb => setTimeout(cb, 16));
  }
});

const win = dom.window;
const doc = win.document;
let failed = 0;
function assert(name, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ' :: ' + extra : ''));
  if (!cond) failed++;
}

setTimeout(run, 250);
function run() {
  try {
    // 1. 进入舒尔特
    const goSchulte = doc.querySelector('[data-action="go-schulte"]');
    assert('A0 入口 go-schulte 存在', !!goSchulte);
    if (!goSchulte) return;
    goSchulte.dispatchEvent(new win.Event('click', { bubbles: true }));

    // 2. 生成 9 个格子
    const cells = Array.from(doc.querySelectorAll('#page-schulte .grid .cell'));
    assert('A1 生成 9 个格子', cells.length === 9, 'cells=' + cells.length);

    // 3. 按 1..9 顺序点击通关
    const byVal = {};
    cells.forEach(c => { byVal[c.textContent] = c; });
    for (let n = 1; n <= 9; n++) {
      const el = byVal[String(n)];
      if (el) el.dispatchEvent(new win.Event('click', { bubbles: true }));
    }

    // 4. 检查 localStorage 战绩记录
    const raw = win.localStorage.getItem('focus_trainer_data');
    assert('A2 localStorage 已写入', !!raw);
    let data = null;
    try { data = JSON.parse(raw); } catch (e) {}
    assert('A3 history 数组存在', !!(data && Array.isArray(data.history)));
    assert('A4 history 含 1 条记录', !!(data && data.history && data.history.length === 1), 'len=' + (data && data.history ? data.history.length : 'n/a'));
    const rec = data && data.history && data.history[0];
    assert('A5 记录 type=schulte', !!(rec && rec.type === 'schulte'));
    assert('A6 记录含 time 时间戳', !!(rec && typeof rec.time === 'number' && rec.time > Date.UTC(2026, 0, 1)), rec && String(rec.time));
    assert('A7 记录 name=舒尔特·入门', !!(rec && /舒尔特·入门/.test(rec.name)), rec && rec.name);
    assert('A8 记录 value 含 秒', !!(rec && /秒/.test(rec.value)), rec && rec.value);

    // 5. 进入成就页，渲染最近战绩
    const goStats = doc.querySelector('[data-action="go-stats"]');
    assert('A9 入口 go-stats 存在', !!goStats);
    if (goStats) goStats.dispatchEvent(new win.Event('click', { bubbles: true }));
    const histBox = doc.querySelector('#stats-history');
    assert('A10 #stats-history 容器存在', !!histBox);
    const histItems = histBox ? histBox.querySelectorAll('.item') : [];
    assert('A11 #stats-history 渲染 1 条', histItems.length === 1, 'items=' + histItems.length);
    const txt = histBox ? histBox.textContent : '';
    assert('A12 含时间格式 YYYY-MM-DD HH:MM', /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 80));

    // 6. 无致命异常
    assert('A13 无致命 JS 异常', errors.length === 0, errors.join(' | '));

    console.log('\n=== 验证结束，失败项: ' + failed + ' ===');
    process.exit(failed > 0 ? 1 : 0);
  } catch (e) {
    console.log('FAIL - 测试脚本异常: ' + e.message + '\n' + e.stack);
    process.exit(1);
  }
}
