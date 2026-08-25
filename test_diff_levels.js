/**
 * 独立实跑验证脚本 —— 找不同页 4 档难度选择按钮
 *
 * 运行方式（Windows / Git Bash）：
 *   NODE_PATH=/c/Users/reidzhou/.workbuddy/binaries/node/workspace/node_modules \
 *   /c/Users/reidzhou/.workbuddy/binaries/node/versions/22.22.2-1/node.exe test_diff_levels.js
 *
 * 该脚本用 jsdom 真正加载并运行 index.html，模拟用户进入「找不同」页、
 * 切换难度按钮，断言 4 个按钮渲染、默认/切换高亮、.diff-tip 文案、以及无致命异常。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const FILE = path.resolve(__dirname, 'index.html');
const html = fs.readFileSync(FILE, 'utf8');

// ---- 收集 jsdom 错误（区分真正的 JS 报错 与 "Not implemented" 类提示） ----
const vc = new VirtualConsole();
const jsdomErrors = [];
vc.on('jsdomError', (err) => {
  jsdomErrors.push(err);
});
// 转发页面内的 console.* 便于排错（不转发 jsdomError，避免重复）
vc.on('error', (...a) => console.error('[page-error]', ...a));
vc.on('warn', (...a) => console.warn('[page-warn]', ...a));
vc.on('log', (...a) => console.log('[page-log]', ...a));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://example.com/', // 让 localStorage 可用
  virtualConsole: vc,
  beforeParse(window) {
    // 避免 jsdom 未实现的原生 API 中断脚本
    if (window.HTMLMediaElement) {
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
    }
    window.requestAnimationFrame =
      window.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 16));
    window.cancelAnimationFrame = window.cancelAnimationFrame || ((id) => clearTimeout(id));
  },
});

const { window } = dom;
const doc = window.document;

function assert(name, cond, detail) {
  const pass = !!cond;
  console.log(
    (pass ? 'PASS' : 'FAIL') +
      ' - ' +
      name +
      (detail ? '  ::  ' + detail : '')
  );
  return { name, pass, detail: detail || '' };
}

function run() {
  const results = [];

  // ---------- 进入「找不同」页 ----------
  const entry = doc.querySelector('[data-action="go-diff"]');
  results.push(
    assert(
      'A0: 首页存在 [data-action="go-diff"] 入口',
      !!entry,
      entry ? 'found' : 'selector not found (需探查渲染逻辑)'
    )
  );
  if (entry) {
    entry.dispatchEvent(new window.Event('click', { bubbles: true }));
  }

  // ---------- 断言 1：初始渲染 ----------
  const lr = doc.querySelector('#diff-levels');
  results.push(
    assert(
      'A1: #diff-levels 渲染出 4 个难度按钮',
      !!lr && lr.children.length === 4,
      lr ? 'children.length=' + lr.children.length : 'element missing'
    )
  );
  const firstActive =
    !!lr &&
    lr.children.length >= 1 &&
    lr.children[0].classList.contains('active') === true;
  results.push(
    assert(
      'A1: 默认入门档(第1个按钮)高亮 active',
      firstActive,
      lr && lr.children[0]
        ? 'class="' + lr.children[0].className + '"'
        : 'no child'
    )
  );

  // ---------- 断言 2：切换到「进阶」(第2个按钮, index=1) ----------
  if (lr && lr.children[1]) {
    lr.children[1].dispatchEvent(new window.Event('click', { bubbles: true }));
  }
  const secondActive =
    !!lr &&
    lr.children.length >= 2 &&
    lr.children[1].classList.contains('active') === true;
  results.push(
    assert(
      'A2: 点击「进阶」后第2个按钮 active 生效',
      secondActive,
      lr && lr.children[1]
        ? 'class="' + lr.children[1].className + '"'
        : 'missing'
    )
  );
  const tip2 = doc.querySelector('.diff-tip');
  results.push(
    assert(
      'A2: 切换后 .diff-tip 文案含 "/ 4 处"',
      !!tip2 && /\/\s*4\s*处/.test(tip2.textContent),
      tip2 ? 'textContent="' + tip2.textContent + '"' : 'missing'
    )
  );

  // ---------- 断言 2(可选)：切换到「高手」(第4个按钮, index=3) ----------
  if (lr && lr.children[3]) {
    lr.children[3].dispatchEvent(new window.Event('click', { bubbles: true }));
  }
  const tip4 = doc.querySelector('.diff-tip');
  results.push(
    assert(
      'A2(可选): 点击「高手」后 .diff-tip 文案含 "/ 6 处"',
      !!tip4 && /\/\s*6\s*处/.test(tip4.textContent),
      tip4 ? 'textContent="' + tip4.textContent + '"' : 'missing'
    )
  );

  // ---------- 断言 3：无致命 JS 运行时异常 ----------
  const fatal = jsdomErrors.filter(
    (e) => !(e && e.message && /Not implemented/i.test(e.message))
  );
  results.push(
    assert(
      'A3: 无致命 JS 运行时异常 (TypeError/ReferenceError 等)',
      fatal.length === 0,
      fatal.length === 0
        ? 'none'
        : 'fatal errors=' + fatal.length
    )
  );

  // ---------- 汇总 ----------
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log('\n================ 测试汇总 ================');
  console.log('总断言数: ' + results.length + ' | 通过: ' + passed + ' | 失败: ' + failed);
  console.log(
    'jsdomError 总数: ' +
      jsdomErrors.length +
      ' | 其中非致命(Not implemented 类): ' +
      (jsdomErrors.length - fatal.length) +
      ' | 致命: ' +
      fatal.length
  );
  if (jsdomErrors.length) {
    console.log('--- jsdomError 明细(前 20 条) ---');
    jsdomErrors.slice(0, 20).forEach((e) => {
      console.log('  * ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message || e));
    });
  }
  process.exit(failed === 0 ? 0 : 1);
}

// 等同步脚本执行/事件 settle 一小会儿再断言
setTimeout(run, 100);
