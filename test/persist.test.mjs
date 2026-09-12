import { JSDOM } from 'jsdom'; import { readFileSync } from 'node:fs';
const dir = new URL('../', import.meta.url).pathname;
const html = readFileSync(dir + 'index.html', 'utf8').replace(/<script src="[^"]+"><\/script>/g, '').replace(/<link rel="stylesheet"[^>]+>/, '');
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const boot = (storage, fakeNow) => {
  const dom = new JSDOM(html, { url: 'https://kedu.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom; window.confirm = () => true; window.prompt = (m, d) => d;
  if (storage) window.localStorage.setItem('kedu.v1', storage);
  if (fakeNow) { const RealDate = window.Date; const off = fakeNow - RealDate.now(); window.eval(`(() => { const R = Date; const off = ${off}; class D extends R { constructor(...a) { if (!a.length) super(R.now() + off); else super(...a); } static now() { return R.now() + off; } } window.Date = D; })()`); }
  for (const f of ['data.js', 'ai.js', 'app.js']) window.eval(readFileSync(dir + f, 'utf8'));
  return window;
};
// 造一份已引导、训练中的状态
let w = boot(null);
let KD = w.KD; Object.assign(KD.S.profile, { days: 4 }); KD.S.onboarded = true; KD.S.ob.step = 9; w.eval("KD.S.week=null"); w.eval("(0)");
// 通过 obFinish 路径最直接：
w.eval(`KD.S.ob.answers={goal:'减脂',sex:'男',age:30,height:175,weight:70,target:66,activity:'久坐',place:'两者都有',days:4}`);
w.document.querySelector('[data-act]') ; // ensure rendered
w.eval(`document.getElementById('app').innerHTML=''`);
// call obFinish via a synthetic element
w.eval(`const el=document.createElement('div'); el.dataset.act='obFinish'; document.getElementById('app').appendChild(el); el.click();`);
ok(KD.S.onboarded && KD.S.week.days.filter(d => d.ex.length).length === 4, '4 天计划');
const tIdx = KD.S.week.days.findIndex(d => d.date === (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })());
if (!KD.S.week.days[tIdx].ex.length) { w.eval(`KD.U.selDay=${tIdx}; const el=document.createElement('div'); el.dataset.act='addSession'; document.getElementById('app').appendChild(el); el.click();`); w.eval(`[...document.querySelectorAll('[data-act="sheetPick"]')].find(e => e.textContent.startsWith('上肢')).click()`); await new Promise(r => setTimeout(r, 5)); }
w.eval(`KD.U.selDay=${tIdx}; const el=document.createElement('div'); el.dataset.act='startSel'; document.getElementById('app').appendChild(el); el.click();`);
w.eval(`document.querySelector('[data-act="completeSet"]').click()`);
ok(KD.S.active && KD.S.active.sets.length === 1, '训练中已记 1 组');
const snapshot = w.localStorage.getItem('kedu.v1');

// 重新加载：应恢复到训练中
w = boot(snapshot); KD = w.KD;
ok(KD.U.screen === 'workout' && KD.S.active.sets.length === 1, '刷新后恢复训练中状态');
ok(w.document.getElementById('elapsed') && w.document.getElementById('elapsed').textContent.length === 5, '计时显示');

// 一周后打开：应归档本周、生成新周，清掉 active
w = boot(snapshot, Date.now() + 8 * 86400000); KD = w.KD;
ok(KD.S.history.length === 1 && KD.S.week.no === 2 && !KD.S.active && KD.U.screen === 'home', '跨周：归档 + 第 2 周 + 清空未完成训练');
ok(KD.S.week.days[0].date > KD.S.history[0].days[6].date, '新周日期在旧周之后');
console.log(fails ? `${fails} 失败` : '全部通过'); process.exit(fails ? 1 : 0);
