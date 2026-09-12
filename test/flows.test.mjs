import { JSDOM } from 'jsdom'; import { readFileSync } from 'node:fs';
const dir = new URL('../', import.meta.url).pathname;
const html = readFileSync(dir + 'index.html', 'utf8').replace(/<script src="[^"]+"><\/script>/g, '').replace(/<link rel="stylesheet"[^>]+>/, '');
import { VirtualConsole } from 'jsdom'; const vc = new VirtualConsole(); vc.on('jsdomError', e => console.log('JSDOM ERROR:', e.detail ? e.detail.stack : e.stack)); const dom = new JSDOM(html, { virtualConsole: vc, url: 'https://kedu.test/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom; const { document } = window;
window.prompt = (m, d) => { const v = window.__prompt?.(m, d); return v === undefined ? d : v; }; window.confirm = () => true; window.alert = () => {};
window.navigator.vibrate = () => true;
window.AudioContext = class { createOscillator(){return{connect(){},start(){},stop(){},frequency:{}}} createGain(){return{connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}} get destination(){return{}} get currentTime(){return 0} };
for (const f of ['data.js', 'ai.js', 'app.js']) window.eval(readFileSync(dir + f, 'utf8'));
const KD = window.KD;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const click = el => { if (!el) throw new Error('element not found'); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
const tick = () => new Promise(r => setTimeout(r, 0));
const sheetFill = async (vals) => { for (const [k, v] of Object.entries(vals)) { const el = $(`[data-sheet="${k}"]`); if (!el) throw new Error('no sheet field ' + k); el.value = v; } act('sheetOk'); await tick(); await tick(); };
const act = (name, pred) => { const els = $$(`[data-act="${name}"]`).filter(pred || (() => true)); if (!els.length) throw new Error('no act ' + name + ' on screen ' + KD.U.screen); click(els[0]); };
const text = () => document.getElementById('app').textContent.replace(/\s+/g, ' ');
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };

// 1. 引导
ok(KD.U.screen === 'onboard', '初始进入引导');
act('obPick', e => e.textContent === '减脂'); act('obPick', e => e.textContent === '男');
for (const v of [32, 176, 72.4, 68]) { document.getElementById('obnum').value = v; act('obNum'); }
act('obPick', e => e.textContent === '轻度活动'); act('obPick', e => e.textContent === '健身房'); act('obPick', e => e.textContent === '5');
ok(text().includes('本周计划已生成'), '引导完成态');
const t = text(); const kcal = +(t.match(/每日 ([\d,]+) kcal/)[1].replace(',', ''));
// Mifflin: 10*72.4+6.25*176-5*32+5 = 724+1100-160+5 = 1669 ×1.375 = 2295 −500 = 1795 → 1800 (取整到 10)
ok(kcal === 1800 || kcal === 1790, '热量目标 Mifflin-St Jeor 计算 = ' + kcal);
act('obFinish'); ok(KD.U.screen === 'home', '进入首页');
ok(KD.S.week && KD.S.week.days.length === 7 && KD.S.week.days.filter(d => d.ex.length).length === 5, '周计划 5 练 2 休');
ok(text().includes('摄入') && text().includes('+ 记录'), '首页四格渲染');

// 2. 周计划页
act('go', e => e.dataset.to === 'plan'); ok(KD.U.screen === 'plan', '训练页');
const anyTraining = KD.S.week.days.findIndex(d => d.ex.length); act('selDay', e => +e.dataset.i === anyTraining);
const before = KD.S.week.days[anyTraining].ex[0].name; act('swapEx'); ok(KD.S.week.days[anyTraining].ex[0].name !== before, '换备选动作: ' + before + ' → ' + KD.S.week.days[anyTraining].ex[0].name);
act('togglePlace'); ok(KD.S.week.days[anyTraining].place === '在家', '换成在家版'); act('togglePlace'); ok(KD.S.week.days[anyTraining].place === '健身房', '换回健身房版');
act('exDetail'); ok(!!KD.U.exDetail && text().includes('动作解析'), '动作解析覆盖层'); act('closeDetail');

// 3. 训练流程（把今天设为有训练日：直接把今天的 day 换成一个课程）
const ti = KD.S.week.days.findIndex(d => d.date === new Date().toISOString().slice(0,10)) ;
const tIdx = KD.S.week.days.findIndex(d => d.date === (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })());
act('selDay', e => +e.dataset.i === tIdx);
if (!KD.S.week.days[tIdx].ex.length) { act('addSession'); ok(!!KD.U.sheet && $$('[data-act="sheetPick"]').length > 5, '安排训练：面板列出课程'); act('sheetPick', e => e.textContent.startsWith('下肢 + 核心')); await tick(); await tick(); }
ok(KD.S.week.days[tIdx].ex.length > 0, '今天有训练');
act('startSel'); ok(KD.U.screen === 'workout' && KD.S.active, '进入训练中'); ok($('#app').dataset.theme === 'dark', '训练中自动深色');
const plannedSets = KD.S.week.days[tIdx].ex.reduce((a, e) => a + e.sets, 0);
act('kg', e => e.dataset.d === '2.5'); const kg0 = KD.S.active.kg; ok(kg0 === KD.S.week.days[tIdx].ex[0].kg + 2.5, '重量 +2.5');
act('completeSet'); ok(KD.S.active.sets.length === 1 && KD.S.active.resting === true, '完成一组后自动进入休息倒计时');
act('restAdd'); ok(KD.S.active.restEnd > Date.now() + 100000, '+30s');
act('endRest'); ok(!KD.S.active.resting, '跳过休息');
KD.S.active.startedAt -= 40*60*1000; let guard = 0; while (KD.U.screen === 'workout' && guard++ < 60) { act('completeSet'); if (KD.S.active && KD.S.active.resting) act('endRest'); }
ok(KD.U.screen === 'summary', '训练完成 → 总结页'); ok(text().includes(`${plannedSets} / ${plannedSets}`), '完成组数 ' + plannedSets);
const log = Object.values(KD.S.logs)[0]; ok(log && log.done && log.burn > 0, '日志已记录，消耗 ' + log.burn);
const prog = Object.keys(KD.S.progress); ok(prog.length > 0, '渐进超负荷写入 progress: ' + prog.slice(0,3).join(','));
act('summaryHome'); ok(KD.U.screen === 'home' && text().includes('已完成 · 再练'), '首页显示已完成');

// 4. 饮食 · 搜索
act('go', e => e.dataset.to === 'food'); act('openSearch'); ok(!!KD.U.search, '搜索覆盖层');
const q = $('#q'); q.value = '鸡胸'; q.dispatchEvent(new window.Event('input', { bubbles: true }));
ok($('#results').textContent.includes('鸡胸肉'), '搜索结果局部刷新');
act('togglePick', e => e.dataset.n === '鸡胸肉（熟）'); ok(KD.U.search.picked.length === 1, '多选');
q.value = '不存在的食物'; q.dispatchEvent(new window.Event('input', { bubbles: true }));
act('customFood'); ok(!!KD.U.sheet, '自定义食物面板'); await sheetFill({ u: '1 碗', k: 333, p: 20, c: 30, f: 5 });
ok(KD.S.customFoods[0] && KD.S.customFoods[0].k === 333, '自定义食物');
act('logPicked'); ok(KD.U.screen === 'food' && Object.values(KD.S.meals)[0].length === 1 && Object.values(KD.S.meals)[0][0].kcal === 498, '记入一餐 498 kcal');
ok(text().includes('498'), '饮食页显示摄入');
act('delMeal'); ok(!!KD.U.sheet && KD.U.sheet.confirm, '删除确认面板'); act('sheetOk'); await tick(); await tick(); ok(Object.values(KD.S.meals)[0].length === 0, '删除餐');

// 4b. 识别结果页（构造数据，不走网络）

window.eval(`KD.U.result = { photo: 'data:image/jpeg;base64,AAAA', items: [{ n: '白米饭', grams: 200, g0: 200, per100: { kcal: 116, protein: 2.6, carbs: 25.9, fat: 0.3 }, src: '营养表', conf: 'high', reason: '一碗', bbox: { x: 10, y: 10, w: 30, h: 30 }, alts: [{ name: '糙米饭', per100kcal: 111 }] }, { n: '神秘炒菜', grams: 150, g0: 150, per100: { kcal: 150, protein: 10, carbs: 5, fat: 10 }, src: 'AI', conf: 'low', reason: '', bbox: null, alts: [] }], open: -1, label: '晚餐', from: 'food', hint: '' }; KD.U.screen = 'result'; KD.render();`);
ok(text().includes('232') && text().includes('待确认'), '结果页：按密度算热量 200g×116 = 232，低置信度标待确认');
act('focusItem', e => e.dataset.i === '0'); act('itemF', e => e.dataset.f === '0.5'); ok(KD.U.result.items[0].grams === 100 && text().includes('116'), '份量 ×½ → 100g / 116 kcal');
act('itemG', e => e.dataset.d === '10'); ok(KD.U.result.items[0].grams === 110, '+10g');
act('altItem'); ok(KD.U.result.items[0].n === '糙米饭' && KD.U.result.items[0].per100.kcal === 111, '换成备选并按营养表取密度');
act('logResult'); const lastMeal = Object.values(KD.S.meals)[0].slice(-1)[0]; ok(lastMeal.kcal === Math.round(110 * 111 / 100) + 225 && KD.S.foodMemory['糙米饭'].grams === 110, '记入并写入常吃记忆');

// 5. 体重 & 进度 & 周报
act('go', e => e.dataset.to === 'home'); act('go', e => e.dataset.to === 'progress'); ok(KD.U.screen === 'progress', '首页消耗格 → 进度页'); act('weigh'); ok(!!KD.U.weigh, '体重弹层');
act('wKg', e => e.dataset.d === '-0.1'); act('wBf', e => e.dataset.d === '0.1'); act('saveWeigh');
ok(KD.S.weights.length === 1 && KD.S.weights[0].kg === 72.3, '同日覆盖体重 72.3');
act('openWeekly'); ok(!!KD.U.weekly && text().includes('建议 · 下周'), '周报覆盖层');
act('genNext'); await new Promise(r => setTimeout(r, 50));
ok(KD.S.nextWeek && KD.S.nextWeek.days.length === 7, '模板生成下周');
const nextEx = KD.S.nextWeek.days.flatMap(d => d.ex).find(e => KD.S.progress[e.name] != null);
ok(nextEx && nextEx.kg === KD.S.progress[nextEx.name], '下周计划沿用渐进后的重量: ' + (nextEx && nextEx.name + ' ' + nextEx.kg));

// 6. 我 · 设置
act('go', e => e.dataset.to === 'profile'); ok(text().includes('Mifflin') || text().includes('日常消耗'), '个人页');
act('theme', e => e.dataset.v === 'dark'); ok($('#app').dataset.theme === 'dark', '全局深色');
act('restMode', e => e.dataset.v === 'manual'); ok(KD.S.prefs.restMode === 'manual', '手动休息模式');
act('editNum', e => e.dataset.k === 'kcalOverride'); await sheetFill({ v: 2000 }); ok(text().includes('2,000 kcal · 手动'), '手动热量目标');
// 持久化
const saved = JSON.parse(window.localStorage.getItem('kedu.v1')); ok(saved.onboarded && saved.weights.length === 1 && saved.profile.kcalOverride === 2000, 'localStorage 持久化');
console.log(fails ? `\n${fails} 项失败` : '\n全部通过');
process.exit(fails ? 1 : 0);
