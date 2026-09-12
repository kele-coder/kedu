// 刻度 · 健身助手 App（PWA）。单页、无框架；状态存 localStorage。
(() => {
const { EX, exInfo, altOf, homeOf, gymOf, SESSIONS, TEMPLATES, TEMPLATES_BEGINNER, FOOD_DB, OB } = KD_DATA;
const root = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');
const sign = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1);
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const WD = ['一', '二', '三', '四', '五', '六', '日'];
const pad = n => String(n).padStart(2, '0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dstr(new Date());
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return dstr(d); };
const dow = s => ((parse(s).getDay() + 6) % 7) + 1; // 1=周一
const mondayOf = s => addDays(s, 1 - dow(s));
const md = s => `${s.slice(5, 7)}.${s.slice(8, 10)}`;
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const mealLabelByTime = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? '早餐' : h < 14.5 ? '午餐' : h < 17 ? '加餐' : h < 21.5 ? '晚餐' : '加餐'; };

// ─── 图标（Lucide 风格，2px 描边）
const I = {
  house: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9 21v-7h6v7"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  utensils: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v7a3 3 0 0 0 6 0V3M8 3v18M17 3c-2 1-3 4-3 7v3h3v8"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 6-7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  barcode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
  tri: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
};

// ─── 状态
const KEY = 'kedu.v1';
const fresh = () => ({
  v: 1, onboarded: false, ob: { step: 0, answers: {} },
  profile: { goal: '减脂', sex: '男', age: 30, height: 175, weight: 72, target: 68, activity: '轻度活动', place: '健身房', days: 5, kcalOverride: 0, core: true, level: '进阶' },
  prefs: { theme: 'auto', restMode: 'auto', restSec: 0, provider: 'gemini', apiKey: '', geminiKey: '', extraBurn: 0, sound: true, warmup: true, rpe: true, bar: 20 },
  calib: null,
  week: null, nextWeek: null, history: [], logs: {}, meals: {}, weights: [], burn: {}, progress: {}, customFoods: [], recent: [], foodMemory: {}, active: null,
});
let S; try { S = JSON.parse(localStorage.getItem(KEY)); } catch (_) { S = null; }
if (!S || S.v !== 1) S = fresh();
if (!S.prefs.provider) Object.assign(S.prefs, { provider: S.prefs.apiKey ? 'claude' : 'gemini', geminiKey: '' });
if (!S.foodMemory) S.foodMemory = {};
if (S.profile.core == null) S.profile.core = true;
if (!S.profile.level) S.profile.level = '进阶';
if (S.prefs.warmup == null) Object.assign(S.prefs, { warmup: true, rpe: true, bar: 20 });
if (S.calib === undefined) S.calib = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('保存失败：' + e.message); } };

// 界面临时状态（不持久化）
const U = { foodDate: today(), screen: S.onboarded ? 'home' : 'onboard', selDay: 0, toast: '', exDetail: null, video: false, weigh: null, weekly: null, search: null, camera: null, result: null, busy: '', obDraft: null, editEx: null, sheet: null, anim: new Set() };
const open_ = (k, v) => { U[k] = v; U.anim.add(k); };
let toastT = 0;
const toast = (t, ms = 2200) => { U.toast = t; clearTimeout(toastT); toastT = setTimeout(() => { U.toast = ''; const el = document.getElementById('toast'); if (el) el.remove(); }, ms); const el = document.getElementById('toast'); if (el) el.textContent = t; else { const d = document.createElement('div'); d.id = 'toast'; d.className = 'toast'; d.textContent = t; root.appendChild(d); } };

// ─── 底部面板：ask() 返回 Promise，替代系统 prompt/confirm
function ask(spec) { return new Promise(res => { open_('sheet', { ...spec, res }); render(); }); }
const confirmAsk = (title, note, label = '确定', danger = false) => ask({ title, note, confirm: { label, danger } }).then(v => !!v);
function rSheet() {
  const sh = U.sheet;
  const fields = (sh.fields || []).map(f => `<div class="field"><label>${esc(f.label)}${f.unit ? ' · ' + f.unit : ''}</label>${f.type === 'select' ? `<div class="seg">${f.options.map(o => `<div class="${(sh.vals?.[f.key] ?? f.value) === o ? 'on' : ''}" data-act="sheetSeg" data-k="${f.key}" data-v="${esc(o)}">${esc(o)}</div>`).join('')}</div>` : `<input type="${f.type === 'number' ? 'number' : f.type === 'password' ? 'password' : 'text'}" ${f.type === 'number' ? `inputmode="decimal" step="${f.step || 1}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}` : ''} value="${esc(sh.vals?.[f.key] ?? f.value ?? '')}" placeholder="${esc(f.placeholder || '')}" data-sheet="${f.key}" autocomplete="off">`}</div>`).join('');
  const opts = (sh.options || []).map((o, i) => `<div class="list-row" data-act="sheetPick" data-i="${i}"><span style="font-size:14px">${esc(o.label)}</span>${o.sub ? `<span class="muted" style="font-size:12px">${esc(o.sub)}</span>` : ''}</div>`).join('');
  return `<div class="sheet-mask" data-act="sheetCancel"><div class="sheet ${U.anim.has('sheet') ? 'enter' : ''}" data-stop="1" style="padding:14px 20px 16px;max-height:85%;display:flex;flex-direction:column">
    <div class="row" style="flex:none"><span class="h" style="font-size:18px">${esc(sh.title)}</span><span data-act="sheetCancel" style="width:24px;height:24px;display:flex">${I.x}</span></div>
    ${sh.note ? `<div class="muted" style="font-size:12px;margin-top:6px;line-height:1.5">${esc(sh.note)}</div>` : ''}
    <div class="scroll" style="margin-top:12px">${fields}${opts}</div>
    ${sh.confirm ? `<div style="margin-top:12px;flex:none">${btn(sh.confirm.label, 'sheetOk', '', I.check)}</div>` : (sh.fields && sh.fields.length) || !(sh.options || []).length ? `<div style="margin-top:12px;flex:none">${btn(sh.okLabel || '确定', 'sheetOk', '', I.check)}</div>` : ''}</div></div>`;
}
const sheetClose = v => { const sh = U.sheet; U.sheet = null; render(); if (sh) sh.res(v); };

// ─── 计算：热量目标（Mifflin-St Jeor）· 体重趋势（EMA）
const latestWeight = () => S.weights.length ? S.weights[S.weights.length - 1].kg : S.profile.weight;
function targets() {
  const p = S.profile, w = latestWeight();
  const bmr = 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === '男' ? 5 : -161);
  const act = { '久坐': 1.2, '轻度活动': 1.375, '中度活动': 1.55 }[p.activity] || 1.375;
  const tdee = S.calib ? S.calib.daily : bmr * act;
  const adj = { '减脂': -500, '增肌': 300, '保持健康': 0 }[p.goal] || 0;
  const floor = p.sex === '男' ? 1500 : 1200;
  const kcal = p.kcalOverride || Math.max(floor, Math.round((tdee + adj) / 10) * 10);
  const protein = Math.round(w * ({ '减脂': 2.0, '增肌': 1.8, '保持健康': 1.6 }[p.goal] || 1.6));
  const fat = Math.round(kcal * 0.25 / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), formula: Math.round(bmr * act), kcal, protein, fat, carbs, daily: Math.round(tdee), calibrated: !!S.calib };
}
// MacroFactor 式校准：近 28 天「平均摄入 − 趋势体重变化×7700/天数」= 实测总消耗；减去训练/手表消耗得日常消耗
function calibrate() {
  const t = today(), from = addDays(t, -28);
  const days = []; for (let d = from; d <= t; d = addDays(d, 1)) days.push(d);
  const logged = days.filter(d => mealsOf(d).length >= 2 || consumedOf(d) >= 800);
  const tr = trend(), ws = S.weights.map((w, i) => ({ ...w, e: tr[i] })).filter(w => w.date >= from && w.date <= t);
  if (logged.length < 10 || ws.length < 5) return { ok: false, reason: `需要 ≥10 天饮食记录（现 ${logged.length}）和 ≥5 次体重（现 ${ws.length}）` };
  const span = (parse(ws[ws.length - 1].date) - parse(ws[0].date)) / 86400000; if (span < 10) return { ok: false, reason: '体重记录跨度不足 10 天' };
  const avgIn = logged.reduce((a, d) => a + consumedOf(d), 0) / logged.length;
  // 体重变化率用窗口内原始体重的线性回归斜率（EMA 在短窗口内滞后 ~10 天，会低估）
  const xs = ws.map(w => (parse(w.date) - parse(ws[0].date)) / 86400000), ys = ws.map(w => w.kg), mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / (xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1);
  const dW = slope * span, perDay = slope * 7700;
  const activity = logged.reduce((a, d) => a + workoutBurnOf(d) + (S.burn[d] || 0), 0) / logged.length;
  const total = avgIn - perDay, daily = Math.round((total - activity) / 10) * 10;
  const T = targets(), lo = Math.round(T.formula * 0.7), hi = Math.round(T.formula * 1.4);
  return { ok: true, daily: Math.min(hi, Math.max(lo, daily)), raw: daily, avgIn: Math.round(avgIn), dW: +dW.toFixed(2), span: Math.round(span), n: logged.length, formula: T.formula, at: t };
}

function trend() { // 20 日 EMA（α=0.1），MacroFactor 同款思路
  const ws = S.weights; if (!ws.length) return [];
  let e = ws[0].kg; return ws.map(w => (e = e + 0.1 * (w.kg - e)));
}
const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);
const mealsOf = d => S.meals[d] || [];
const consumedOf = d => sum(mealsOf(d), 'kcal');
const workoutBurnOf = d => (S.logs[d] && S.logs[d].burn) || 0;
const burnedOf = d => targets().daily + workoutBurnOf(d) + (S.burn[d] || 0);
const deficitOf = d => consumedOf(d) - burnedOf(d);
const e1rm = (kg, reps) => kg * (1 + reps / 30);

// ─── 周计划
function buildWeek(start, progress = S.progress, place = S.profile.place) {
  const lv = S.profile.level, beginner = lv === '新手', veteran = lv === '老手';
  const tpl = beginner ? (TEMPLATES_BEGINNER[Math.min(4, Math.max(2, S.profile.days))]) : (TEMPLATES[S.profile.days] || TEMPLATES[5]);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i), t = tpl.find(x => x[0] === i + 1);
    if (!t) { days.push({ date, name: '休息', place: '', mins: 0, ex: [] }); continue; }
    const s = SESSIONS[t[1]], home = place === '在家';
    const exList = S.profile.core ? s.ex : s.ex.filter(e => exInfo(e.name).cat !== 'core');
    days.push({ date, name: S.profile.core ? t[1] : t[1].replace(/ \+ 核心$/, ''), place: home ? '在家' : '健身房', mins: s.mins + (veteran ? 10 : 0), ex: exList.map((e, j) => {
      const name = home ? homeOf(e.name) : e.name;
      const kg = progress[name] != null ? progress[name] : (name === e.name ? e.kg : 0);
      const sets = veteran && j < 2 && !e.unit ? e.sets + 1 : e.sets; // 老手：主项多 1 组
      return { name, sets, reps: e.reps, kg, ...(e.unit ? { unit: e.unit } : {}) };
    }) });
  }
  return { start, no: S.history.length + 1, days, note: '' };
}
function ensureWeek() {
  const start = mondayOf(today());
  if (S.week && S.week.start === start) return;
  if (S.week) { S.history.push({ start: S.week.start, no: S.week.no, days: S.week.days.map(d => ({ date: d.date, name: d.name, place: d.place, ex: d.ex })) }); }
  if (S.nextWeek && S.nextWeek.start === start) { S.week = S.nextWeek; S.week.no = S.history.length + 1; }
  else S.week = buildWeek(start);
  S.nextWeek = null; S.active = null; save();
}
function dayStatus(d) {
  if (!d.ex.length) return 'rest';
  const t = today(), log = S.logs[d.date];
  if (log && log.done) return 'done';
  if (d.date === t) return 'today';
  if (d.date < t) return log && log.sets.length ? 'done' : 'skipped';
  return 'planned';
}
const todayDay = () => S.week.days.find(d => d.date === today());
const todayIdx = () => S.week.days.findIndex(d => d.date === today());
const lastSetOf = name => { // 最近一次该动作的记录（跨日期）
  const dates = Object.keys(S.logs).sort().reverse();
  for (const d of dates) { const s = S.logs[d].sets.filter(x => x.ex === name); if (s.length) return s[s.length - 1]; }
  return null;
};

// ─── 训练
let wakeLock = null;
async function lockScreen(on) {
  try { if (on && !wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; } } catch (_) {}
}
function beep() {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if (!S.prefs.sound) return;
  try { const ac = new (window.AudioContext || window.webkitAudioContext)(); [0, 0.25].forEach(t => { const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.25, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.18); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.2); }); } catch (_) {}
}
const restFor = name => S.prefs.restSec || exInfo(name).rest || 90;
const isBarbell = name => /杠铃|卧推|硬拉|深蹲|划船|臀推|推举/.test(name) && !/哑铃|绳索|弹力带|高脚杯|单腿|单臂|俯卧撑|保加利亚/.test(name);
const warmSets = (e, kg) => (!S.prefs.warmup || e.unit || kg < 30 || exInfo(e.name).cat === 'core' || exInfo(e.name).cat === 'cardio') ? [] : [{ kg: Math.round(kg * 0.5 / 2.5) * 2.5, reps: 8 }, { kg: Math.round(kg * 0.75 / 2.5) * 2.5, reps: 4 }];
const plates = (total, bar) => { let side = (total - bar) / 2; if (side < 0) return null; const out = []; for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) { while (side >= p - 1e-9) { out.push(p); side -= p; } } return { out, rest: +side.toFixed(2) }; }

function startWorkout(dayIdx) {
  const d = S.week.days[dayIdx];
  if (!d.ex.length) { toast('这天是休息日，去「训练」里安排'); return; }
  if (S.active && S.active.dayIdx === dayIdx && S.active.date === d.date) { U.screen = 'workout'; render(); return; }
  const e = d.ex[0], last = lastSetOf(e.name);
  S.active = { date: d.date, dayIdx, exIdx: 0, setIdx: 0, kg: last && last.kg >= e.kg ? last.kg : e.kg, reps: e.reps, startedAt: Date.now(), resting: false, restStart: 0, restEnd: 0, sets: [], burn: 0, warm: 0, rpe: 0 };
  save(); U.screen = 'workout'; render();
}
const elapsed = () => S.active ? Math.floor((Date.now() - S.active.startedAt) / 1000) : 0;
function sessionBurn(dayIdx, sec) { // MET × kg × 小时。力量 5 MET，有氧课 7 MET
  const d = S.week.days[dayIdx], met = /有氧/.test(d.name) ? 7 : 5;
  return Math.round(met * latestWeight() * sec / 3600);
}
function completeSet() {
  const a = S.active, d = S.week.days[a.dayIdx], e = d.ex[a.exIdx];
  const ws = a.setIdx === 0 ? warmSets(e, a.kg) : [];
  if (a.warm < ws.length) { // 热身组：不计入正式记录，短休息
    a.warm++; if (navigator.vibrate) navigator.vibrate(30);
    if (S.prefs.restMode === 'auto' && a.warm <= ws.length) { U.anim.add('rest'); a.resting = true; a.restStart = Date.now(); a.restEnd = Date.now() + 45 * 1000; }
    save(); render(); return;
  }
  a.sets.push({ ex: e.name, set: a.setIdx, kg: e.unit ? 0 : a.kg, reps: a.reps, unit: e.unit || '', rpe: a.rpe || 0, t: Date.now() }); a.rpe = 0;
  const lastSet = a.setIdx >= e.sets - 1, lastEx = a.exIdx >= d.ex.length - 1;
  if (lastSet && lastEx) { finishWorkout(); return; }
  if (lastSet) { const n = d.ex[a.exIdx + 1], last = lastSetOf(n.name); a.exIdx++; a.setIdx = 0; a.warm = 0; a.kg = last && last.kg >= n.kg ? last.kg : n.kg; a.reps = n.reps; }
  else a.setIdx++;
  if (navigator.vibrate) navigator.vibrate(30);
  if (S.prefs.restMode === 'auto') { const sec = restFor(e.name); if (sec > 0) { U.anim.add('rest'); a.resting = true; a.restStart = Date.now(); a.restEnd = Date.now() + sec * 1000; } }
  save(); render();
}
function finishWorkout() {
  const a = S.active; if (!a) { U.screen = 'home'; render(); return; }
  const d = S.week.days[a.dayIdx], sec = elapsed(), planned = d.ex.reduce((x, e) => x + e.sets, 0);
  const burn = a.sets.length ? sessionBurn(a.dayIdx, sec) : 0;
  const log = { name: d.name, date: a.date, sec, sets: a.sets, burn, done: a.sets.length >= planned, planned };
  S.logs[a.date] = log;
  // 渐进超负荷：所有组达到目标次数且重量 ≥ 计划 → 下次 +inc
  const notes = [];
  d.ex.forEach(e => {
    if (e.unit) return;
    const s = a.sets.filter(x => x.ex === e.name);
    const inc = exInfo(e.name).inc;
    const hard = s.some(x => x.rpe >= 9.5);
    if (s.length >= e.sets && s.every(x => x.reps >= e.reps && x.kg >= e.kg) && inc > 0 && !hard) {
      const next = +(Math.max(...s.map(x => x.kg)) + inc).toFixed(1); S.progress[e.name] = next; notes.push(`${e.name} 下次 ${next}kg`);
      S.week.days.forEach((dd, i) => { if (i > a.dayIdx) dd.ex.forEach(x => { if (x.name === e.name) x.kg = next; }); });
    } else if (s.length) { S.progress[e.name] = Math.max(...s.map(x => x.kg)); if (hard && s.length >= e.sets && s.every(x => x.reps >= e.reps)) notes.push(`${e.name} 达标但 RPE 10，先稳一周`); }
  });
  log.notes = notes;
  S.active = null; save(); lockScreen(false);
  U.summary = log; U.screen = 'summary'; render();
}
function prs() { // 每个动作的最佳估算 1RM
  const best = {};
  Object.keys(S.logs).sort().forEach(d => S.logs[d].sets.forEach(s => { if (!s.kg || s.unit) return; const v = e1rm(s.kg, s.reps); if (!best[s.ex] || v > best[s.ex].v + 0.01) best[s.ex] = { v, kg: s.kg, reps: s.reps, date: d, prev: best[s.ex] ? best[s.ex].kg : null }; }));
  return Object.entries(best).map(([name, b]) => ({ name, ...b })).sort((x, y) => y.v - x.v).slice(0, 8);
}

// ─── 饮食
function addMeal(label, items, date) {
  const d = date || (U.screen === 'food' || U.result || U.search ? U.foodDate : today()), meals = S.meals[d] || (S.meals[d] = []);
  meals.push({ time: nowHM(), label, desc: items.map(i => i.n).join(' · '), kcal: sum(items, 'k'), p: sum(items, 'p'), c: sum(items, 'c'), f: sum(items, 'f'), items });
  items.forEach(i => { S.recent = [i, ...S.recent.filter(x => x.n !== i.n)].slice(0, 12); });
  save();
}
function foodSearch(q) {
  const all = [...S.customFoods, ...FOOD_DB];
  if (!q) return [...S.recent, ...all.filter(f => !S.recent.some(r => r.n === f.n))].slice(0, 12);
  const ql = q.toLowerCase();
  return all.filter(f => f.n.toLowerCase().includes(ql)).slice(0, 30);
}
function resizeImage(file, max = 1024) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.85)); };
    img.onerror = rej; img.src = url;
  });
}
const densityOf = name => { // 本地营养表：最长匹配
  const D = KD_DATA.DENSITY; if (D[name]) return { v: D[name], key: name };
  let best = null; for (const k of Object.keys(D)) if ((name.includes(k) || k.includes(name)) && (!best || k.length > best.key.length)) best = { v: D[k], key: k };
  return best;
};
const itemMacros = it => { const per = it.per100; return { k: Math.round(it.grams * per.kcal / 100), p: Math.round(it.grams * per.protein / 100), c: Math.round(it.grams * per.carbs / 100), f: Math.round(it.grams * per.fat / 100) }; };
const memNames = () => Object.entries(S.foodMemory).sort((a, b) => b[1].count - a[1].count).slice(0, 20).map(([n]) => n);
async function recognize(src, hint = '') {
  const from = U.camera?.from || U.result?.from || 'home', label = U.camera?.label || U.result?.label || mealLabelByTime();
  U.result = null; U.screen = 'camera';
  U.camera = { label, busy: true, photo: typeof src === 'string' ? src : null, from, t0: Date.now(), hint, error: '' };
  render();
  try {
    const dataUrl = typeof src === 'string' ? src : await resizeImage(src); U.camera.photo = dataUrl; render();
    const r = await KD_AI.recognizeFood(S.prefs, dataUrl.split(',')[1], 'image/jpeg', { hint, known: memNames(), onStatus: t => { if (U.camera) { U.camera.status = t; const el = document.getElementById('camstatus'); if (el) el.textContent = t; } } });
    if (!U.camera) return; // 用户已关闭
    const items = (r.items || []).map(it => {
      const d = densityOf(it.name), mem = S.foodMemory[it.name];
      const per100 = mem?.per100 || (d ? { kcal: d.v[0], protein: d.v[1], carbs: d.v[2], fat: d.v[3] } : it.per100) || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
      return { n: it.name, grams: Math.max(5, it.grams || 100), g0: Math.max(5, it.grams || 100), per100, src: mem ? '常吃' : d ? '营养表' : 'AI', conf: it.confidence || 'medium', reason: it.reason || '', bbox: it.bbox, alts: (it.alternatives || []).map(a => ({ name: a.name, per100kcal: a.per100kcal })), memGrams: mem?.grams };
    });
    if (!items.length) { U.camera.busy = false; U.camera.error = '没识别出食物。换个角度、离近一点，或补一句说明再试。'; render(); return; }
    open_('result', { photo: dataUrl, items, open: -1, label, from, hint }); U.camera = null; U.screen = 'result'; render();
  } catch (e) {
    if (!U.camera) return;
    U.camera.busy = false;
    U.camera.error = e.message === 'NO_KEY' ? `还没设置 ${S.prefs.provider === 'gemini' ? 'Gemini' : 'Claude'} API key，去「我」里填一下；或者先用搜索记录。` : '识别失败：' + e.message;
    render();
  }
}
// 条码
let scanTimer = 0, scanStream = null;
function stopScan() { clearInterval(scanTimer); scanTimer = 0; if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; } }
async function startScan() {
  const s = U.search; if (!s) return;
  s.scanning = true; s.hit = null; s.live = false; render();
  const hasBD = 'BarcodeDetector' in window;
  const onCode = async code => { stopScan(); s.scanning = false; s.busy = '正在查询商品…'; render();
    try { const hit = await KD_AI.lookupBarcode(code); s.busy = ''; if (hit) s.hit = hit; else toast(`条码 ${code} 未收录，可手动添加`, 3000); }
    catch (e) { s.busy = ''; toast('查询失败：' + e.message); }
    render(); };
  if (hasBD && navigator.mediaDevices?.getUserMedia) {
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      s.live = true; render();
      const v = document.getElementById('scanvid'); if (!v) return; v.srcObject = scanStream; await v.play();
      const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      scanTimer = setInterval(async () => { try { const codes = await det.detect(v); if (codes.length) onCode(codes[0].rawValue); } catch (_) {} }, 350);
      return;
    } catch (_) { stopScan(); }
  }
  const v = await ask({ title: '输入条码', note: '这台设备不支持相机扫码，手动输入包装上的条码数字。', fields: [{ key: 'code', label: '条码', type: 'number', value: '', min: 100000, max: 99999999999999 }], okLabel: '查询' });
  if (v && /^\d{6,14}$/.test(String(v.code).trim())) onCode(String(v.code).trim()); else { s.scanning = false; render(); }
}

// ─── 周报
function weekStats(week = S.week) {
  const days = week.days, t = today();
  const planned = days.filter(d => d.ex.length).length, done = days.filter(d => dayStatus(d) === 'done').length;
  const burn = days.reduce((a, d) => a + workoutBurnOf(d.date), 0);
  const logged = days.filter(d => mealsOf(d.date).length);
  const avgDef = logged.length ? Math.round(logged.reduce((a, d) => a + deficitOf(d.date), 0) / logged.length) : 0;
  const avgP = logged.length ? Math.round(logged.reduce((a, d) => a + sum(mealsOf(d.date), 'p'), 0) / logged.length) : 0;
  const tr = trend(), ws = S.weights;
  const inWeek = ws.map((w, i) => ({ ...w, e: tr[i] })).filter(w => w.date >= week.start && w.date <= addDays(week.start, 6));
  const before = ws.map((w, i) => ({ ...w, e: tr[i] })).filter(w => w.date < week.start).pop();
  const wDelta = inWeek.length ? +(inWeek[inWeek.length - 1].e - (before ? before.e : inWeek[0].e)).toFixed(1) : null;
  const skipped = days.filter(d => dayStatus(d) === 'skipped').map(d => `周${WD[dow(d.date) - 1]} ${d.name}`);
  return { planned, done, burn, avgDef, avgP, wDelta, skipped, loggedDays: logged.length, elapsedDays: days.filter(d => d.date <= t).length };
}
function ruleReview(st) {
  const T = targets();
  const head = st.done >= st.planned && st.planned ? '训练全勤，节奏稳。' : st.done ? `完成 ${st.done} / ${st.planned} 次，${st.skipped[0] ? st.skipped[0] + '跳过。' : ''}` : '本周还没有训练记录。';
  const tips = [];
  tips.push(st.done >= st.planned && st.planned ? '下周达标的主项按渐进超负荷自动加重。' : st.skipped.length ? `${st.skipped[0]}跳过，下周把它排到最有空的一天。` : '先把训练做起来，计划可随时改。');
  if (st.loggedDays) tips.push(st.avgDef <= -300 ? `日均热量差 ${st.avgDef}，减脂节奏合适，保持。` : st.avgDef < 0 ? `日均热量差仅 ${st.avgDef}，晚餐减一份主食。` : `日均热量差 ${sign(st.avgDef).replace('.0', '')}，超出目标，先控制加餐。`);
  else tips.push('本周没有饮食记录，先从拍一餐开始。');
  tips.push(st.loggedDays && st.avgP < T.protein * 0.8 ? `蛋白日均 ${st.avgP}g，低于目标 ${T.protein}g，每餐加一份蛋白。` : st.wDelta != null ? `趋势体重 ${sign(st.wDelta)} kg，${st.wDelta <= -0.3 && st.wDelta >= -1 ? '速度正常' : st.wDelta < -1 ? '掉得偏快，注意别掉肌肉' : '变化不大，下周再看'}。` : '记录体重，趋势线才有意义。');
  return { headline: head, tips };
}
function planContext(request) {
  const st = weekStats(), p = S.profile;
  const recent = Object.keys(S.logs).sort().slice(-12).map(d => ({ date: d, session: S.logs[d].name, done: S.logs[d].done, sets: S.logs[d].sets.map(x => `${x.ex} ${x.unit ? x.reps + x.unit : x.kg + 'kg×' + x.reps}`) }));
  return { profile: { ...p, weight: latestWeight() }, targets: targets(), thisWeek: S.week.days.map(d => ({ dow: dow(d.date), name: d.name, place: d.place, ex: d.ex, status: dayStatus(d) })), stats: st, recentLogs: recent, bestLifts: prs().map(x => `${x.name} ${x.kg}kg×${x.reps}`), progress: S.progress,
    rules: `训练水平：${p.level}${p.level === '新手' ? '（新手：全身训练、最多 4 天、每次 5 个动作以内、每动作 2–3 组、每肌群每周 10 组左右、起始重量保守、不排高难度动作如杠铃深蹲/引体向上，可用高脚杯深蹲/高位下拉代替）' : p.level === '老手' ? '（老手：每肌群每周 15–20 组，主项 4–5 组，可用 6 天推拉腿）' : '（进阶：每肌群每周 12–16 组，分化训练）'}；每周训练 ${p.days} 天，其余休息；场地 ${p.place}；${p.core ? '可以安排核心训练' : '不要安排任何核心/腹肌动作（cat=core 的动作一律不用）'}；${p.days === 3 ? '3 天用推/拉/腿三分化' : p.days === 4 ? '4 天用上/下肢分化' : p.days === 6 ? '6 天用推拉腿×2' : '5 天：胸背 / 下肢 / 肩臂 / 有氧 / 下肢'}`,
    userRequest: request || '' };
}
async function generateNext(request = '') {
  const start = addDays(S.week.start, 7);
  U.busy = '正在生成下周计划…'; render();
  let wk = buildWeek(start);
  if (KD_AI.hasKey(S.prefs)) {
    try {
      const ctx = planContext(request);
      const r = await KD_AI.generatePlan(S.prefs, ctx);
      if (r.days && r.days.length) {
        wk.days = wk.days.map((d, i) => { const g = r.days.find(x => x.dow === i + 1); return g && g.ex.length ? { date: d.date, name: g.name, place: g.place, mins: g.mins, ex: g.ex.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, kg: e.kg, ...(e.unit ? { unit: e.unit } : {}) })) } : { date: d.date, name: '休息', place: '', mins: 0, ex: [] }; });
        wk.note = r.note || '';
      }
    } catch (e) { toast('AI 生成失败，已用模板：' + e.message, 3000); }
  }
  S.nextWeek = wk; save(); U.busy = ''; U.weekly = null; render();
  toast(`下周计划已生成（${md(start)} 起）` + (wk.note ? ' · ' + wk.note : ''), 3200);
}

// ─── 渲染
const topbar = (l, r) => `<div class="topbar"><span class="brand">${l}</span><span class="kicker" style="color:var(--fg)">${r}</span></div>`;
const btn = (label, act, extra = '', icon = I.arrow, cls = '') => `<button class="btn ${cls}" data-act="${act}" ${extra}><span>${label}</span>${icon}</button>`;
const spark = (vals, w, h, padY = 2, r = 4, trendVals = null) => {
  if (vals.length < 2) return `<svg class="spark" width="${w}" height="${h}"></svg>`;
  const all = trendVals ? [...vals, ...trendVals] : vals;
  const lo = Math.min(...all) - 0.3, hi = Math.max(...all) + 0.3;
  const P = arr => arr.map((v, i) => `${(i / (arr.length - 1) * w).toFixed(1)},${(padY + (hi - v) / (hi - lo) * (h - padY * 2)).toFixed(1)}`);
  const pts = P(vals), last = pts[pts.length - 1].split(',');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${trendVals ? `<polyline points="${P(trendVals).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2"/>` : ''}<polyline points="${pts.join(' ')}" fill="none" stroke="${trendVals ? 'var(--muted)' : 'var(--fg)'}" stroke-width="${trendVals ? 1 : 1.5}" ${trendVals ? 'stroke-dasharray="2 3"' : ''}/><rect x="${last[0] - r / 2}" y="${last[1] - r / 2}" width="${r}" height="${r}" fill="var(--acc)"/></svg>`;
};
const nav = () => {
  const it = (s, ic, l) => `<div class="item ${U.screen === s ? 'on' : ''}" data-act="go" data-to="${s}">${ic}<span>${l}</span></div>`;
  return `<div class="nav">${it('home', I.house, '今日')}${it('plan', I.dumbbell, '训练')}<div class="cam" data-act="camera">${I.camera}</div>${it('food', I.utensils, '饮食')}${it('profile', I.user, '我')}</div>`;
};

function rOnboard() {
  const step = S.ob.step, q = OB[step], hist = OB.slice(0, step).map(o => ({ q: o.q, a: S.ob.answers[o.key] + (o.unit ? ' ' + o.unit : '') }));
  const done = step >= OB.length;
  const bars = Array.from({ length: OB.length + 1 }, (_, i) => `<div style="flex:1;height:3px;background:${i < step ? 'var(--fg)' : i === step ? 'var(--acc)' : 'var(--track)'}"></div>`).join('');
  let body = '';
  if (!done) {
    body = `<div class="h" style="font-size:22px;line-height:1.2;margin-top:8px">${q.q}</div>`;
    if (q.type === 'number') {
      const v = U.obDraft ?? (S.ob.answers[q.key] ?? q.def);
      body += `<div class="numrow"><div class="step" data-act="obStep" data-d="-1">${I.minus}</div><input type="number" inputmode="decimal" id="obnum" value="${v}" step="${q.step || 1}" min="${q.min}" max="${q.max}" data-inp="obnum"><span class="muted">${q.unit}</span><div class="step" data-act="obStep" data-d="1">${I.plus}</div></div>
      ${btn('下一步', 'obNum')}`;
    } else body += `<div style="display:flex;flex-wrap:wrap;border-top:1px solid var(--line);border-left:1px solid var(--line)">${q.opts.map(o => `<div class="opt" data-act="obPick" data-v="${esc(o)}">${o}</div>`).join('')}</div>`;
    if (q.hint) body += `<div class="muted" style="font-size:12px">${q.hint}</div>`;
  } else {
    const T = targets();
    body = `<div class="h" style="font-size:22px;line-height:1.2;margin-top:8px">好了。本周计划已生成。</div>
    <div class="muted" style="font-size:13px;line-height:1.6">${(S.ob.answers.level || '').startsWith('新手') && S.ob.answers.days > 4 ? '新手前几个月 4 天以内的全身训练效果最好，已按 4 天安排，多出的天用来走路和恢复。' : ''}${(S.ob.answers.level || '').startsWith('新手') ? Math.min(4, S.ob.answers.days) : S.ob.answers.days} 天 · ${S.profile.place} · 每日 ${fmt(T.kcal)} kcal（基础代谢 ${fmt(T.bmr)} · 日常消耗 ${fmt(T.tdee)}）· 蛋白 ${T.protein}g · 碳水 ${T.carbs}g · 脂肪 ${T.fat}g。随时可在「我」里改。</div>`;
  }
  return `<div class="screen">${topbar('刻度', `设置 · ${Math.min(step + 1, OB.length + 1)} / ${OB.length + 1}`)}
  <div style="display:flex;gap:3px;padding:10px 20px 0">${bars}</div>
  <div class="scroll" style="padding:16px 20px 0;display:flex;flex-direction:column;gap:12px">
    ${hist.map(h => `<div class="muted" style="font-size:13px">${h.q}</div><div style="align-self:flex-end;background:var(--fg);color:var(--bg);padding:8px 12px;font-size:13px">${esc(h.a)}</div>`).join('')}
    ${body}<div style="height:20px"></div></div>
  ${done ? `<div class="footer">${btn('进入今日', 'obFinish')}</div>` : ''}</div>`;
}

function rHome() {
  const d = today(), T = targets(), consumed = consumedOf(d), burned = burnedOf(d), td = todayDay(), st = td ? dayStatus(td) : 'rest';
  const meals = mealsOf(d), ws = S.weights, tr = trend();
  const cur = ws.length ? ws[ws.length - 1].kg : S.profile.weight, delta = ws.length > 1 ? cur - ws[ws.length - 2].kg : 0;
  const startLabel = st === 'done' ? '已完成 · 再练' : S.active && S.active.date === d ? '继续训练' : '开始训练';
  const remaining = T.kcal - consumed;
  return `<div class="screen">${topbar('刻度', `周${WD[dow(d) - 1]} · ${md(d)} · 第 ${S.week.no} 周`)}
  <div class="scroll">
  <div class="grid2" style="border-bottom:2px solid var(--line)">
    <div class="cell" data-act="go" data-to="food" style="border-right:2px solid var(--line);border-bottom:2px solid var(--line)"><div class="kicker">摄入</div><div class="big" style="font-size:36px;margin:8px 0 6px">${fmt(consumed)}</div><div class="muted" style="font-size:12px">目标 ${fmt(T.kcal)} · ${remaining >= 0 ? '剩 ' + fmt(remaining) : '超 ' + fmt(-remaining)}</div><div class="bar" style="margin-top:10px"><i style="width:${Math.min(100, consumed / T.kcal * 100)}%"></i></div></div>
    <div class="cell" data-act="go" data-to="progress" style="border-bottom:2px solid var(--line)"><div class="kicker">消耗</div><div class="big" style="font-size:36px;margin:8px 0 6px">${fmt(burned)}</div><div class="muted" style="font-size:12px">日常 ${fmt(T.daily)} · 训练 ${fmt(workoutBurnOf(d))}${S.burn[d] ? ' · 手表 ' + fmt(S.burn[d]) : ''}</div><div class="bar" style="margin-top:10px"><i class="acc" style="width:${Math.min(100, burned / (T.daily + 600) * 100)}%"></i></div></div>
    <div class="cell" style="border-right:2px solid var(--line)"><div class="kicker acc">训练 · ${td && td.ex.length ? '周' + WD[dow(d) - 1] : '休息日'}</div><div class="h" style="font-size:22px;line-height:1.15;margin:8px 0 6px">${td ? td.name : '休息'}</div><div class="muted" style="font-size:12px">${td && td.ex.length ? `${td.place} · ${td.ex.length} 动作 · ${td.mins} 分钟` : '恢复、散步、早点睡'}</div>${td && td.ex.length ? `<div style="margin-top:12px">${btn(startLabel, 'startToday', '', I.arrow, 'sm')}</div>` : ''}</div>
    <div class="cell" data-act="weigh"><div class="row"><div class="kicker">体重</div><span class="link">+ 记录</span></div><div class="big" style="font-size:36px;margin:8px 0 6px">${cur.toFixed(1)}</div><div class="muted" style="font-size:12px">kg · ${ws.length > 1 ? '较上次 ' + sign(delta) : '趋势 ' + (tr.length ? tr[tr.length - 1].toFixed(1) : '—')}</div><div style="margin-top:8px">${spark(ws.slice(-8).map(w => w.kg), 120, 24)}</div></div>
  </div>
  <div class="grid3" style="border-bottom:2px solid var(--line)">${[['蛋白', sum(meals, 'p'), T.protein], ['碳水', sum(meals, 'c'), T.carbs], ['脂肪', sum(meals, 'f'), T.fat]].map(([l, v, t], i) => `<div style="padding:12px 16px;${i < 2 ? 'border-right:2px solid var(--line)' : ''}"><div class="kicker">${l}</div><div style="font-size:15px;margin-top:4px"><b>${v}</b> / ${t}g</div></div>`).join('')}</div>
  ${S.nextWeek ? `<div style="padding:12px 20px" class="muted">下周计划已就绪，周一自动切换。</div>` : ''}
  </div>${nav()}</div>`;
}

function rPlan() {
  const days = S.week.days, sel = days[U.selDay], st = dayStatus(sel), t = today();
  const stTxt = { done: '已完成', skipped: '已跳过', today: '今天', rest: '休息', planned: '计划' }[st];
  const cells = days.map((d, i) => {
    const s = dayStatus(d), on = i === U.selDay;
    const dot = s === 'done' ? `background:${on ? '#fff' : 'var(--fg)'}` : s === 'skipped' ? 'background:var(--n400)' : s === 'rest' ? `border:1.5px solid ${on ? '#fff' : 'var(--line)'}` : `border:2px solid ${on ? '#fff' : 'var(--fg)'}`;
    return `<div class="wk-cell ${on ? 'sel' : ''}" data-act="selDay" data-i="${i}"><span>${WD[i]}</span><span class="d">${parseInt(d.date.slice(8))}</span><span class="dot" style="${dot}"></span><span class="s">${s === 'rest' ? '休' : s === 'skipped' ? '跳过' : d.name.replace(/ /g, '').slice(0, 4)}</span></div>`;
  }).join('');
  const log = S.logs[sel.date];
  const exRows = sel.ex.map((e, j) => {
    const done = log ? log.sets.filter(x => x.ex === e.name) : [];
    return `<div class="plan-ex"><div class="nm" data-act="exDetail" data-name="${esc(e.name)}">${I.tri}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.name}</span></div>
    <span class="spec" data-act="editEx" data-j="${j}">${done.length ? `<b style="color:var(--fg)">${done.length}/${e.sets}</b> · ` : ''}${e.sets} × ${e.reps}${e.unit || ''}${e.kg ? ` · ${e.kg}kg` : ''}</span><span class="link" data-act="swapEx" data-j="${j}">换</span></div>`;
  }).join('');
  return `<div class="screen">${topbar(`第 ${S.week.no} 周`, `${S.profile.goal} · ${S.profile.days} 练 ${7 - S.profile.days} 休${S.week.note ? ' · AI' : ''}`)}
  <div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:2px solid var(--line)">${cells}</div>
  <div class="scroll" style="padding:14px 20px 0">
    <div class="kicker acc">周${WD[U.selDay]} · ${stTxt}${sel.place ? ' · ' + sel.place : ''}</div>
    <div class="h" style="font-size:28px;line-height:1.1;margin:6px 0 4px">${sel.name}</div>
    <div class="muted" style="font-size:12px;margin-bottom:10px">${st === 'rest' ? '不安排训练' : `${sel.ex.length} 个动作 · ${sel.ex.reduce((a, e) => a + e.sets, 0)} 组 · 约 ${sel.mins} 分钟${log ? ` · 用时 ${Math.round(log.sec / 60)} 分 · 消耗 ${log.burn} kcal` : ''}`}</div>
    ${exRows}
    ${sel.ex.length ? `<div style="display:flex;gap:16px;padding:12px 0;border-top:1px solid var(--line)"><span class="link" data-act="moveTomorrow">改到明天</span><span class="link" data-act="togglePlace">${sel.place === '在家' ? '换成健身房版' : '换成在家版'}</span><span class="link" data-act="addEx">+ 加动作</span></div>` : `<div style="padding:12px 0;border-top:1px solid var(--line)"><span class="link" data-act="addSession">在这天安排训练</span></div>`}
    <div style="height:24px"></div></div>
  ${sel.date === t && sel.ex.length ? `<div class="footer">${btn(st === 'done' ? '再练一次' : S.active && S.active.date === t ? '继续训练' : '开始训练', 'startSel')}</div>` : sel.date > t && sel.ex.length ? '' : ''}
  ${nav()}</div>`;
}

function rFood() {
  const d = U.foodDate, isToday = d === today(), T = targets(), meals = mealsOf(d), consumed = consumedOf(d), rem = T.kcal - consumed;
  const seg = meals.map((m, i) => `<div style="width:${Math.min(100, m.kcal / T.kcal * 100)}%;background:${i % 2 ? 'var(--n700)' : 'var(--fg)'}"></div>`).join('');
  const rows = meals.map((m, i) => `<div style="display:flex;gap:12px;padding:12px 0;border-top:1px solid var(--line);align-items:center"><div class="stripes" style="width:48px;height:48px;flex:none"></div><div style="flex:1;min-width:0"><div class="kicker">${m.time} ${m.label}</div><div style="font-size:13px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.desc)}</div><div class="muted" style="font-size:11px;margin-top:2px">蛋白 ${m.p} · 碳水 ${m.c} · 脂肪 ${m.f}</div></div><div style="font-size:15px;font-weight:800">${fmt(m.kcal)}</div><span class="muted" data-act="delMeal" data-i="${i}" style="padding:6px 0 6px 6px">${I.x.replace('<svg', '<svg width="14" height="14"')}</span></div>`).join('');
  const quick = [...S.recent].slice(0, 8);
  const st = weekStats();
  return `<div class="screen">${topbar('饮食', `<span data-act="foodDay" data-d="-1" style="padding:0 8px">‹</span>${isToday ? '今天' : `周${WD[dow(d) - 1]} ${md(d)}`}<span data-act="foodDay" data-d="1" style="padding:0 0 0 8px;${isToday ? 'opacity:.3' : ''}">›</span>`)}
  <div class="scroll" style="padding:14px 20px 0">
    <div class="row" style="align-items:baseline"><div><span class="big" style="font-size:40px">${fmt(consumed)}</span><span class="muted" style="font-size:13px;margin-left:6px">/ ${fmt(T.kcal)} kcal</span></div><span class="acc" style="font-size:13px;font-weight:600">${rem >= 0 ? '剩 ' + fmt(rem) : '超 ' + fmt(-rem)}</span></div>
    <div style="display:flex;height:8px;background:var(--track);margin:10px 0 12px">${seg}</div>
    <div class="grid3" style="border-top:2px solid var(--line);border-bottom:2px solid var(--line);margin-bottom:4px">${[['蛋白', sum(meals, 'p'), T.protein], ['碳水', sum(meals, 'c'), T.carbs], ['脂肪', sum(meals, 'f'), T.fat]].map(([l, v, t], i) => `<div style="padding:10px 0 10px ${i ? 12 : 0}px;${i < 2 ? 'border-right:2px solid var(--line)' : ''}"><div class="kicker">${l}</div><div style="font-size:14px;margin-top:3px"><b>${v}</b> / ${t}g</div></div>`).join('')}</div>
    ${rows || `<div class="muted" style="padding:16px 0;font-size:13px">${isToday ? '今天还没有记录。拍一张，或者搜索。' : '这天没有记录。'}</div>`}
    <div style="display:flex;gap:18px;padding:12px 0;border-top:1px solid var(--line);flex-wrap:wrap"><span class="link" data-act="camera">📷 拍照记录${mealLabelByTime()}</span><span class="link" data-act="openSearch">🔍 搜索 / 扫码</span><span class="link" data-act="copyMeal">⧉ 复制前一天</span>${isToday ? `<span class="link" data-act="extraBurn">⌚ 手表消耗</span>` : ''}</div>
    ${quick.length ? `<div class="kicker" style="margin:6px 0 8px">常吃 · 点一下记入${mealLabelByTime()}</div><div>${quick.map((f, i) => `<span class="chip" data-act="quickAdd" data-i="${i}" style="border-color:var(--line);color:var(--fg)">${esc(f.n)} <span class="muted">${f.k}</span></span>`).join('')}</div>` : ''}
    <div style="height:16px"></div></div>
  <div style="padding:10px 20px;border-top:2px solid var(--line);display:flex;justify-content:space-between;font-size:12px" class="muted"><span>消耗 ${fmt(burnedOf(d))} · 热量差 ${deficitOf(d) > 0 ? '+' : ''}${fmt(deficitOf(d))}</span><span>本周均 ${st.loggedDays ? (st.avgDef > 0 ? '+' : '') + fmt(st.avgDef) : '—'}</span></div>
  ${nav()}</div>`;
}

function rProgress() {
  const ws = S.weights, tr = trend(), T = targets(), t = today();
  const cur = ws.length ? ws[ws.length - 1] : null, trendNow = tr.length ? tr[tr.length - 1] : null;
  const first = ws.length ? ws[0].kg : null;
  const bf = [...ws].reverse().find(w => w.bf), bfOld = ws.filter(w => w.bf && w.date <= addDays(t, -28)).pop();
  const allLogs = Object.values(S.logs);
  const allPlanned = S.history.reduce((a, w) => a + w.days.filter(d => d.ex.length).length, 0) + S.week.days.filter(d => d.ex.length && d.date <= t).length;
  const doneN = allLogs.filter(l => l.sets.length).length;
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const bars = days7.map(d => { const has = mealsOf(d).length, v = has ? deficitOf(d) : 0; const h = Math.min(100, Math.abs(v) / 12); return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1"><div style="height:56px;width:100%;display:flex;align-items:flex-end"><div style="width:100%;height:${has ? h : 0}%;background:${d === t ? 'var(--acc)' : v > 0 ? 'var(--n400)' : 'var(--fg)'}"></div></div><span style="font-size:9px" class="muted">${WD[dow(d) - 1]}</span></div>`; }).join('');
  const pr = prs();
  return `<div class="screen">${topbar('进度', `<span class="link" data-act="openWeekly">本周总结 ›</span>`)}
  <div class="scroll" style="padding:14px 20px 0">
    <div class="row"><div class="kicker">体重 · 趋势（20 日 EMA）</div><span class="link" data-act="weigh">+ 记录今日</span></div>
    <div class="row" style="align-items:baseline;margin:6px 0 8px"><span class="big" style="font-size:36px">${trendNow ? trendNow.toFixed(1) : '—'}</span><span class="muted" style="font-size:12px;text-align:right">${cur ? `最新 ${cur.kg.toFixed(1)} · 累计 ${sign(cur.kg - first)} kg` : '还没有记录'}<br>目标 ${S.profile.target.toFixed(1)}</span></div>
    <div style="width:100%;overflow:hidden">${spark(ws.slice(-30).map(w => w.kg), 320, 72, 8, 4, tr.slice(-30))}</div>
    <div class="grid2" style="border-top:2px solid var(--line);border-bottom:2px solid var(--line);margin-top:12px">
      <div style="padding:12px 12px 12px 0;border-right:2px solid var(--line)"><div class="kicker">体脂率</div><div class="big" style="font-size:26px;margin:6px 0 4px">${bf ? bf.bf.toFixed(1) + '%' : '—'}</div><div class="muted" style="font-size:11px">${bf && bfOld ? sign(bf.bf - bfOld.bf) + ' / 4 周' : '记录体重时可一并录入'}</div></div>
      <div style="padding:12px 0 12px 12px"><div class="kicker">训练完成率</div><div class="big" style="font-size:26px;margin:6px 0 4px">${allPlanned ? Math.round(doneN / allPlanned * 100) : 0}%</div><div class="muted" style="font-size:11px">${doneN} / ${allPlanned} 次</div></div>
    </div>
    <div class="kicker" style="margin:14px 0 8px">每日热量差 · 近 7 天</div>
    <div style="display:flex;gap:6px">${bars}</div>
    <div class="kicker" style="margin:16px 0 4px">力量记录 · 估算 1RM</div>
    ${pr.length ? pr.map(p => `<div class="list-row"><span style="font-size:14px">${p.name}</span><span style="font-size:13px"><b>${p.kg}</b> kg × ${p.reps}${p.date === t ? ' <span class="acc">今日</span>' : p.prev && p.prev < p.kg ? ` <span class="acc">+${+(p.kg - p.prev).toFixed(1)}</span>` : ''}</span></div>`).join('') : '<div class="muted" style="font-size:13px;padding:8px 0">完成一次训练后出现。</div>'}
    <div style="height:24px"></div></div>${nav()}</div>`;
}

function rProfile() {
  const p = S.profile, T = targets(), w = latestWeight();
  const seg = [['light', '浅色'], ['dark', '深色'], ['auto', '训练时深色']].map(([v, l]) => `<div class="${S.prefs.theme === v ? 'on' : ''}" data-act="theme" data-v="${v}">${l}</div>`).join('');
  const rest = [['auto', '自动倒计时'], ['manual', '手动计时']].map(([v, l]) => `<div class="${S.prefs.restMode === v ? 'on' : ''}" data-act="restMode" data-v="${v}">${l}</div>`).join('');
  const row = (l, v, act, extra = '') => `<div class="list-row" data-act="${act}" ${extra}><span style="font-size:14px">${l}</span><span style="font-size:13px" class="${act ? 'link' : 'muted'}">${v}</span></div>`;
  return `<div class="screen">${topbar('我', `${p.goal} · ${p.sex} · ${p.age} 岁`)}
  <div class="scroll" style="padding:0 20px">
    <div class="grid3" style="border-bottom:2px solid var(--line)">${[['身高', p.height, 'cm', 'height'], ['体重', w.toFixed(1), 'kg', ''], ['目标', p.target.toFixed(1), 'kg', 'target']].map(([l, v, u, k], i) => `<div data-act="${k ? 'editNum' : 'weigh'}" data-k="${k}" style="padding:14px 0;${i < 2 ? 'border-right:2px solid var(--line);' : ''}${i ? 'padding-left:12px' : ''}"><div class="kicker">${l}</div><div class="big" style="font-size:20px;margin-top:6px">${v}<span class="muted" style="font-size:11px;font-weight:400;margin-left:3px">${u}</span></div></div>`).join('')}</div>
    <div class="kicker" style="margin:14px 0 2px">目标与计划</div>
    ${row('每日热量目标', `${fmt(T.kcal)} kcal${p.kcalOverride ? ' · 手动' : ' · 自动'}`, 'editNum', 'data-k="kcalOverride"')}
    ${row('日常消耗（TDEE）· 基础代谢', `${fmt(T.tdee)}${T.calibrated ? ' 实测' : ' 公式'} · ${fmt(T.bmr)}`, 'calib')}
    ${row('蛋白 / 碳水 / 脂肪', `${T.protein} / ${T.carbs} / ${T.fat} g`, '')}
    ${row('目标', p.goal, 'cycle', 'data-k="goal"')}
    ${row('训练经验', p.level === '新手' ? '新手 · 低量全身' : p.level === '老手' ? '老手 · 主项加量' : '进阶 · 分化', 'cycle', 'data-k="level"')}
    ${row('日常活动', p.activity, 'cycle', 'data-k="activity"')}
    ${row('每周训练天数', p.days, 'cycle', 'data-k="days"')}
    ${row('训练场地', p.place, 'cycle', 'data-k="place"')}
    ${row('核心训练', p.core ? '包含' : '不安排', 'toggleCore')}
    ${row('年龄', p.age, 'editNum', 'data-k="age"')}
    ${row('重新生成本周计划', '剩余天数按模板重排 ›', 'regen')}
    <div class="kicker" style="margin:14px 0 2px">训练</div>
    <div class="list-row"><span style="font-size:14px">组间休息</span><div class="seg" style="width:180px">${rest}</div></div>
    ${row('休息时长', S.prefs.restSec ? S.prefs.restSec + ' 秒 · 固定' : '按动作（复合 120 · 孤立 60 · 核心 45）', 'editNum', 'data-k="restSec"')}
    ${row('休息结束提示音', S.prefs.sound ? '开' : '关（仅震动）', 'toggleSound')}
    ${row('自动热身组', S.prefs.warmup ? '≥30kg 的动作前 2 组（50% · 75%）' : '关', 'toggleWarm')}
    ${row('记录 RPE', S.prefs.rpe ? '开 · 达标但 RPE 10 不加重' : '关', 'toggleRpe')}
    <div class="kicker" style="margin:14px 0 2px">数据与外观</div>
    <div class="list-row"><span style="font-size:14px">外观</span><div class="seg" style="width:200px">${seg}</div></div>
    <div class="list-row"><span style="font-size:14px">AI 服务商</span><div class="seg" style="width:180px">${[['gemini', 'Gemini · 免费'], ['claude', 'Claude']].map(([v, l]) => `<div class="${S.prefs.provider === v ? 'on' : ''}" data-act="provider" data-v="${v}">${l}</div>`).join('')}</div></div>
    ${S.prefs.provider === 'gemini' ? row('Gemini API key', S.prefs.geminiKey ? '已设置 ' + S.prefs.geminiKey.slice(0, 8) + '…' : '未设置 · aistudio.google.com 免费申请', 'apiKey', 'data-k="geminiKey"') : row('Claude API key', S.prefs.apiKey ? '已设置 ' + S.prefs.apiKey.slice(0, 10) + '…' : '未设置 · console.anthropic.com（需充值）', 'apiKey', 'data-k="apiKey"')}
    ${row('测试 AI 连接', `${KD_AI.model(S.prefs)} ›`, 'pingAI')}
    ${KD_AI.lastError() ? `<div class="muted" style="font-size:11px;padding:6px 0;word-break:break-all">最近错误：${esc(KD_AI.lastError())}</div>` : ''}
    ${row('手表 / 运动手环', '不支持自动同步 · 在饮食页手动录消耗', '')}
    ${row('导出数据', 'JSON ›', 'exportData')}
    ${row('导入数据', '选择文件 ›', 'importData')}
    ${row('重新走一遍引导', '›', 'restart')}
    ${row('清空全部数据', '›', 'wipe')}
    <div class="muted" style="font-size:11px;padding:16px 0 24px" data-act="reloadApp">刻度 v12 · 数据只存在这台手机的浏览器里 · 点此检查更新</div>
  </div>${nav()}</div>`;
}

function rCamera() {
  const c = U.camera;
  return `<div class="screen ${U.anim.has('screen') ? 'enter' : ''}" style="background:#201e1d;color:#f3f2f2">
  <div class="row" style="padding:10px 20px;border-bottom:2px solid rgba(243,242,242,.4)"><span data-act="closeCamera" style="width:24px;height:24px;display:flex">${I.x}</span><span class="kicker" style="color:#f3f2f2" id="camstatus">${c.busy ? '识别中…' : '拍照识别'}</span><span style="width:24px"></span></div>
  <div style="flex:1;position:relative;margin:16px 20px 0;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#2d2b2b;min-height:0">
    ${c.photo ? `<img src="${c.photo}" class="gray" style="width:100%;height:100%;object-fit:cover">` : `<div class="muted" style="font-size:13px;color:#bab6b6;text-align:center;padding:0 24px;line-height:1.7">快门开相机拍这一餐，或左下「相册」选已有照片。<br>俯拍、把碗筷拍进去，份量估得更准。</div>`}
    <div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
    ${c.busy && c.photo ? '<div class="scanline"></div>' : ''}
    ${c.error ? `<div style="position:absolute;left:0;right:0;bottom:0;background:rgba(32,30,29,.92);padding:12px 14px;font-size:13px;line-height:1.5;border-top:2px solid var(--acc)">${esc(c.error)}${c.photo ? `<div style="margin-top:8px"><span class="link" data-act="retryRecog" style="color:#ff9783">再试一次 ›</span></div>` : ''}</div>` : ''}
  </div>
  <div style="padding:10px 20px 0;${c.busy ? 'opacity:.5;pointer-events:none' : ''}"><input type="text" placeholder="补充说明（可选）：如 米饭半碗 / 外卖 / 两人份" value="${esc(c.hint || '')}" data-inp="hint" style="background:#2d2b2b;color:#f3f2f2;font-size:13px;padding:9px 12px"></div>
  <div class="grid3" style="align-items:center;padding:8px 20px calc(20px + var(--sab))">
    <div style="display:flex;flex-direction:column;gap:14px;font-size:13px;font-weight:600"><label>相册<input type="file" accept="image/*" id="galfile" class="hidden" ${c.busy ? 'disabled' : ''}></label><span data-act="openSearch">搜索</span></div>
    <div style="display:flex;justify-content:center"><label style="width:72px;height:72px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;${c.busy ? 'opacity:.5' : ''}"><div style="width:56px;height:56px;background:${c.busy ? 'var(--acc)' : '#f3f2f2'}"></div><input type="file" accept="image/*" capture="environment" id="camfile" class="hidden" ${c.busy ? 'disabled' : ''}></label></div>
    <span data-act="cycleLabel" style="font-size:13px;font-weight:600;text-align:right">${c.label} ›</span>
  </div></div>`;
}

function rResult() {
  const r = U.result, T = targets(), consumed = consumedOf(today());
  const M = r.items.map(itemMacros), total = M.reduce((a, m) => a + m.k, 0);
  const boxes = r.items.map((it, i) => it.bbox ? `<div data-act="focusItem" data-i="${i}" style="position:absolute;left:${it.bbox.x}%;top:${it.bbox.y}%;width:${it.bbox.w}%;height:${it.bbox.h}%;border:2px solid ${r.open === i ? 'var(--acc)' : '#f3f2f2'}"><div class="badge" style="position:absolute;left:-2px;top:-2px;background:${r.open === i ? 'var(--acc)' : '#f3f2f2'};color:${r.open === i ? '#fff' : '#201e1d'};border:0">${i + 1}</div></div>` : '').join('');
  const rows = r.items.map((it, i) => { const m = M[i], on = r.open === i, low = it.conf === 'low';
    return `<div style="border-top:1px solid var(--line)" class="${U.anim.has('result') ? 'row-in' : ''}" ${U.anim.has('result') ? `style="animation-delay:${i * 60}ms;border-top:1px solid var(--line)"` : ''}>
    <div style="display:flex;gap:12px;align-items:center;padding:12px 0" data-act="focusItem" data-i="${i}"><div class="badge ${on ? 'on' : ''}">${i + 1}</div><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;display:flex;gap:6px;align-items:center;flex-wrap:wrap">${esc(it.n)}${low ? '<span style="font-size:10px;font-weight:800;color:var(--acc-text);border:1px solid var(--acc);padding:1px 4px">待确认</span>' : ''}</div><div class="muted" style="font-size:11px;margin-top:2px">${it.grams}g · 蛋白 ${m.p}g · 碳水 ${m.c}g · 脂肪 ${m.f}g${it.src !== 'AI' ? ' · ' + it.src : ''}</div></div><div style="font-size:16px;font-weight:800">${fmt(m.k)}</div><span class="muted" data-act="delItem" data-i="${i}" style="padding:4px 0 4px 4px">${I.x.replace('<svg', '<svg width="14" height="14"')}</span></div>
    ${on ? `<div style="background:var(--acc-soft);padding:12px;margin-bottom:10px">
      <div class="row"><span class="kicker">份量</span><span class="muted" style="font-size:11px">${esc(it.reason)}</span></div>
      <div style="display:flex;align-items:center;gap:8px;margin:8px 0"><div class="step" data-act="itemG" data-i="${i}" data-d="-10" style="height:40px;width:44px">${I.minus}</div><span class="big" style="font-size:28px;min-width:90px">${it.grams}<span style="font-size:13px;font-weight:400"> g</span></span><div class="step" data-act="itemG" data-i="${i}" data-d="10" style="height:40px;width:44px">${I.plus}</div></div>
      <div>${[['½', 0.5], ['1', 1], ['1½', 1.5], ['2', 2]].map(([l, f]) => `<span class="chip ${it.grams === Math.round(it.g0 * f) ? 'on' : ''}" data-act="itemF" data-i="${i}" data-f="${f}">×${l}</span>`).join('')}${it.memGrams ? `<span class="chip" data-act="itemSet" data-i="${i}" data-g="${it.memGrams}">上次 ${it.memGrams}g</span>` : ''}</div>
      ${it.alts.length ? `<div class="muted" style="font-size:11px;margin:8px 0 6px">不是${esc(it.n)}？换成</div><div>${it.alts.map((a, k) => `<span class="chip" data-act="altItem" data-i="${i}" data-k="${k}">${esc(a.name)}</span>`).join('')}</div>` : ''}
      <div style="display:flex;gap:16px;margin-top:6px"><span class="link" data-act="renameItem" data-i="${i}">改名 / 改热量</span></div></div>` : ''}</div>`; }).join('');
  return `<div class="screen ${U.anim.has('screen') ? 'enter' : ''}">
  <div style="position:relative;height:230px;flex:none;border-bottom:4px solid var(--acc);overflow:hidden;background:#2d2b2b"><img src="${r.photo}" class="gray" style="width:100%;height:100%;object-fit:cover">${boxes}<span data-act="closeResult" style="position:absolute;left:12px;top:12px;width:28px;height:28px;background:rgba(32,30,29,.7);color:#fff;display:flex;align-items:center;justify-content:center">${I.x}</span><span data-act="redoRecog" style="position:absolute;right:12px;top:12px;background:rgba(32,30,29,.7);color:#fff;font-size:11px;font-weight:600;padding:6px 10px">补充说明 · 重新识别</span></div>
  <div class="scroll" style="padding:4px 20px 0"><div class="muted" style="font-size:11px;padding:8px 0 4px">点某一项可以调份量、换菜。热量按本地营养表算${r.hint ? ' · 说明：' + esc(r.hint) : ''}</div>${rows}
    <div class="row" style="padding:12px 0;border-top:2px solid var(--line)"><span class="kicker">合计</span><span class="big" style="font-size:28px">${fmt(total)}</span></div><div style="height:8px"></div></div>
  <div class="footer"><div class="grid3" style="margin-bottom:12px">${[['今日目标', T.kcal, ''], ['记入后', consumed + total, ''], ['剩余', T.kcal - consumed - total, 'acc']].map(([l, v, c]) => `<div><div class="kicker">${l}</div><div class="${c}" style="font-size:16px;font-weight:800;margin-top:2px">${fmt(v)}</div></div>`).join('')}</div>
  <div class="row" style="gap:8px">${btn(`记入${r.label}`, 'logResult', '', I.check)}<span class="link" data-act="cycleResultLabel" style="white-space:nowrap">改餐次</span></div></div></div>`;
}

function rWorkout() {
  const a = S.active, d = S.week.days[a.dayIdx], e = d.ex[a.exIdx], timed = !!e.unit, info = exInfo(e.name);
  const last = lastSetOf(e.name), nextEx = d.ex[a.exIdx + 1], lastSet = a.setIdx === e.sets - 1;
  const ws = a.setIdx === 0 ? warmSets(e, a.kg) : [], warming = a.warm < ws.length, wsCur = warming ? ws[a.warm] : null;
  const bars = Array.from({ length: e.sets }, (_, i) => `<div style="flex:1;height:4px;background:${i < a.setIdx ? 'var(--fg)' : i === a.setIdx ? 'var(--acc)' : 'var(--track)'}"></div>`).join('');
  const restLeft = Math.max(0, Math.ceil((a.restEnd - Date.now()) / 1000)), restSince = Math.floor((Date.now() - a.restStart) / 1000);
  const rest = a.resting ? `<div class="overlay ${U.anim.has('rest') ? 'enter' : ''}" data-act="endRest" style="justify-content:center;align-items:flex-start;padding:0 20px"><div class="kicker acc">组间休息${S.prefs.restMode === 'auto' ? ' · 倒计时' : ' · 正计时'}</div><div class="big" id="rest-num" style="font-size:120px;margin:12px 0">${S.prefs.restMode === 'auto' ? mmss(restLeft) : mmss(restSince)}</div><div class="muted" style="font-size:13px">${S.prefs.restMode === 'auto' ? `建议 ${restFor(d.ex[a.exIdx].name)} 秒` : `建议 ${info.rest} 秒`} · 下一组 ${timed ? '' : a.kg + 'kg × '}${a.reps}${e.unit || ''}</div>
    <div style="position:absolute;left:20px;right:20px;bottom:calc(24px + var(--sab));display:flex;gap:8px">${S.prefs.restMode === 'auto' ? `<button class="btn ghost" data-act="restAdd" data-s="30" style="width:auto">+30s</button>` : ''}<button class="btn ghost" data-act="endRest"><span>${S.prefs.restMode === 'auto' ? '跳过，直接开始' : '点击任意处继续'}</span>${I.arrow}</button></div></div>` : '';
  return `<div class="screen">
  <div class="row" style="padding:10px 20px;border-bottom:2px solid var(--line)"><span data-act="exDetail" data-name="${esc(e.name)}" style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;min-width:0"><span class="muted tab">${a.exIdx + 1} / ${d.ex.length}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.name}</span>${I.tri.replace('<svg', '<svg width="12" height="12"')}</span><span class="tab" id="elapsed" style="font-weight:800;font-size:16px">${mmss(elapsed())}</span><span class="link" data-act="finish" style="font-size:13px">结束</span></div>
  <div style="display:flex;gap:3px;padding:10px 20px 0">${bars}</div>
  <div class="scroll" style="display:flex;flex-direction:column;justify-content:center;padding:0 20px">
    <div class="kicker acc">${warming ? `热身 ${a.warm + 1} / ${ws.length} · 正式重量 ${a.kg}kg` : `第 ${a.setIdx + 1} 组 / ${e.sets}`}</div>
    <div class="grid2" style="border-top:2px solid var(--line);border-bottom:2px solid var(--line);margin:12px 0">
      <div style="padding:16px 12px 16px 0;border-right:2px solid var(--line);${timed ? 'opacity:.35' : ''}"><div class="kicker">${timed ? '—' : e.kg === 0 && a.kg === 0 ? '自重 · 加重 kg' : '重量 kg'}</div><div class="big" ${isBarbell(e.name) && !timed ? 'data-act="plates"' : ''} style="font-size:56px;margin:10px 0 12px">${timed ? '—' : warming ? wsCur.kg : a.kg}</div><div style="display:flex;gap:8px"><div class="step" data-act="kg" data-d="-2.5">${I.minus}</div><div class="step" data-act="kg" data-d="2.5">${I.plus}</div></div></div>
      <div style="padding:16px 0 16px 12px"><div class="kicker">${timed ? `时长 ${e.unit}` : '次数'}</div><div class="big" style="font-size:56px;margin:10px 0 12px">${warming ? wsCur.reps : a.reps}</div><div style="display:flex;gap:8px"><div class="step" data-act="reps" data-d="${timed ? -5 : -1}">${I.minus}</div><div class="step" data-act="reps" data-d="${timed ? 5 : 1}">${I.plus}</div></div></div>
    </div>
    ${S.prefs.rpe && !timed && !warming ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px"><span class="kicker" style="margin-right:4px">RPE</span>${[6, 7, 8, 9, 10].map(v => `<div class="chip ${a.rpe === v ? 'on' : ''}" data-act="rpe" data-v="${v}" style="margin:0;padding:5px 10px;border-color:var(--line);color:${a.rpe === v ? '#fff' : 'var(--fg)'}">${v}</div>`).join('')}<span class="muted" style="font-size:10px;margin-left:4px">${a.rpe ? (a.rpe >= 10 ? '力竭' : a.rpe >= 9 ? '还能 1 次' : a.rpe >= 8 ? '还能 2 次' : '轻松') : '可选'}</span></div>` : ''}
    <div class="muted" style="font-size:12px">${last && !timed ? `上次 ${last.kg} × ${last.reps}${last.rpe ? ' @' + last.rpe : ''}` : `目标 ${e.reps}${e.unit || ''}`} · ${lastSet ? (nextEx ? `下一动作 ${nextEx.name}` : '最后一组') : `还剩 ${e.sets - a.setIdx - 1} 组`}${a.sets.filter(x => x.ex === e.name).length ? ' · 本次 ' + a.sets.filter(x => x.ex === e.name).map(x => timed ? x.reps : `${x.kg}×${x.reps}`).join(' / ') : ''}</div>
  </div>
  <div class="footer" style="display:flex;flex-direction:column;gap:8px">${btn(warming ? '热身完成' : lastSet && !nextEx ? '完成训练' : lastSet ? '完成 · 下一动作' : '完成本组', 'completeSet', '', I.check)}<div style="display:flex;gap:8px"><button class="btn ghost" data-act="startRest"><span>开始休息 · ${S.prefs.restMode === 'auto' ? '倒计时' : '手动计时'}</span></button>${warming ? '<button class="btn ghost" data-act="skipWarm" style="width:auto;white-space:nowrap">跳过热身</button>' : ''}<button class="btn ghost" data-act="skipEx" style="width:auto;white-space:nowrap">跳过动作</button></div></div>
  ${rest}</div>`;
}

function rSummary() {
  const l = U.summary;
  return `<div class="screen" style="background:var(--acc);color:#fff">
  <div class="scroll" style="padding:24px 20px 0;display:flex;flex-direction:column;justify-content:center">
    <div class="kicker" style="color:#ffc4b8">训练完成 · ${md(l.date)}</div>
    <div class="h" style="font-size:40px;line-height:1.05;margin:10px 0 20px">${l.name}</div>
    <div class="grid3" style="border-top:2px solid rgba(255,255,255,.5);border-bottom:2px solid rgba(255,255,255,.5)">${[['用时', mmss(l.sec)], ['完成组', `${l.sets.length} / ${l.planned}`], ['消耗 kcal', l.burn]].map(([k, v], i) => `<div style="padding:14px 0;${i ? 'padding-left:12px;' : ''}${i < 2 ? 'border-right:2px solid rgba(255,255,255,.5)' : ''}"><div class="kicker" style="color:#ffc4b8">${k}</div><div class="big" style="font-size:26px;margin-top:6px">${v}</div></div>`).join('')}</div>
    <div style="font-size:13px;line-height:1.6;margin-top:16px">${l.done ? '全部完成。' : '提前结束，已完成的组已记录；剩余动作可明天补。'}${l.notes.length ? '<br>渐进超负荷：' + l.notes.join('；') + '。' : ''}</div>
  </div>
  <div class="footer" style="border-top:0;background:transparent">${btn('回到今日', 'summaryHome', '', I.arrow, 'inv')}</div></div>`;
}

// ─── 覆盖层
function rExDetail() {
  const name = U.exDetail, info = exInfo(name), vid = info.video;
  const src = vid ? `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1&playsinline=1` : '';
  return `<div class="overlay ${U.anim.has('exDetail') ? 'enter' : ''}">
    <div class="row" style="padding:10px 20px;border-bottom:2px solid var(--line);background:#201e1d;color:#f3f2f2"><span data-act="closeDetail" style="width:24px;height:24px;display:flex">${I.x}</span><span class="kicker" style="color:#f3f2f2">${vid ? '示范视频 · 来源 YouTube · 点击播放' : '暂无示范视频'}</span><span style="width:24px"></span></div>
    <div style="height:196px;flex:none;position:relative;background:#2d2b2b" class="${U.video ? '' : 'stripes'}">${U.video && vid ? `<iframe src="${src}" style="width:100%;height:100%;border:0;filter:grayscale(1) contrast(1.08)" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>` : `<div data-act="playVideo" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><div style="width:56px;height:56px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center">${I.play.replace('<svg', '<svg width="24" height="24"')}</div></div><div style="position:absolute;left:16px;right:16px;bottom:12px;height:2px;background:rgba(243,242,242,.4)"></div>`}</div>
    <div class="scroll" style="padding:14px 20px 0">
      <div class="kicker acc">${info.m}</div><div class="h" style="font-size:28px;line-height:1.1;margin:6px 0 4px">${esc(name)}</div><div class="muted" style="font-size:12px">节奏 · ${info.tempo}${info.rest ? ` · 建议休息 ${info.rest}s` : ''}</div>
      <div class="kicker" style="margin:16px 0 4px">动作解析</div>${info.steps.map((s, i) => `<div style="display:flex;gap:12px;padding:10px 0;border-top:1px solid var(--line)"><span style="font-size:14px;font-weight:800;width:18px;flex:none">${i + 1}</span><span style="font-size:13px;line-height:1.5">${s}</span></div>`).join('')}
      <div class="kicker" style="margin:16px 0 4px">要点</div>${info.tips.map(t => `<div style="display:flex;gap:10px;align-items:center;padding:8px 0"><span style="width:10px;height:10px;background:var(--acc);flex:none"></span><span style="font-size:13px">${t}</span></div>`).join('')}<div style="height:16px"></div></div>
    <div class="footer">${btn('知道了', 'closeDetail', '', I.check)}</div></div>`;
}
function rSearch() {
  const s = U.search, q = s.query.trim(), res = foodSearch(q), total = sum(s.picked, 'k');
  const rows = res.map(f => { const on = s.picked.some(x => x.n === f.n); return `<div class="list-row" data-act="togglePick" data-n="${esc(f.n)}"><div><div style="font-size:14px">${esc(f.n)}</div><div class="muted" style="font-size:11px">${esc(f.u)} · 蛋白 ${f.p}g</div></div><div style="display:flex;align-items:center;gap:12px"><span style="font-size:14px;font-weight:800">${f.k}</span><div class="badge ${on ? 'on' : ''}" style="width:26px;height:26px">${on ? I.check.replace('<svg', '<svg width="14" height="14"') : I.plus.replace('<svg', '<svg width="14" height="14"')}</div></div></div>`; }).join('');
  return `<div class="overlay ${U.anim.has('search') ? 'enter' : ''}">
    <div class="row" style="padding:10px 20px;border-bottom:2px solid var(--line)"><span data-act="closeSearch" style="width:24px;height:24px;display:flex">${I.x}</span><span class="kicker" style="color:var(--fg)">添加到${s.label}</span><span class="link" data-act="cycleSearchLabel">改</span></div>
    <div style="display:flex;padding:12px 20px 0;gap:0"><input type="search" placeholder="搜索食物，如 鸡胸肉 / 米饭" value="${esc(s.query)}" data-inp="query" id="q" autocomplete="off"><div data-act="scan" style="width:44px;flex:none;background:var(--fg);color:var(--bg);display:flex;align-items:center;justify-content:center">${I.barcode.replace('<svg', '<svg width="20" height="20"')}</div></div>
    ${s.scanning ? `<div style="margin:12px 20px 0;height:${s.live ? 200 : 120}px;position:relative;overflow:hidden;background:#2d2b2b" class="${s.live ? '' : 'stripes'}">${s.live ? '<video id="scanvid" playsinline muted></video>' : ''}<div class="scanline"></div><div style="position:absolute;left:12px;bottom:10px;color:#f3f2f2;font-size:12px">正在识别条码…</div><span data-act="cancelScan" style="position:absolute;right:8px;top:8px;width:28px;height:28px;background:rgba(32,30,29,.7);color:#fff;display:flex;align-items:center;justify-content:center">${I.x}</span></div>` : ''}
    ${s.busy ? `<div class="muted" style="padding:12px 20px 0;font-size:12px">${s.busy}</div>` : ''}
    ${s.hit ? `<div style="margin:12px 20px 0;background:var(--acc-soft);padding:12px"><div class="kicker acc">条码识别成功</div><div style="font-size:14px;font-weight:600;margin-top:4px">${esc(s.hit.n)}</div><div class="muted" style="font-size:11px;margin:2px 0 8px">${esc(s.hit.u)} · ${s.hit.k} kcal · 蛋白 ${s.hit.p}g · 条码 ${s.hit.code}</div>${btn('加入', 'addHit', '', I.plus, 'sm')}</div>` : ''}
    <div class="scroll" style="padding:4px 20px 0" id="results">${rows || `<div class="muted" style="padding:16px 0;font-size:13px">没有「${esc(q)}」。</div>`}
      ${q ? `<div style="padding:12px 0;border-top:1px solid var(--line)"><span class="link" data-act="customFood">+ 自定义「${esc(q)}」的热量</span></div>` : ''}<div style="height:16px"></div></div>
    ${s.picked.length ? `<div class="footer">${btn(`记入 ${s.picked.length} 项 · ${total} kcal`, 'logPicked', '', I.check)}</div>` : ''}</div>`;
}
function rWeigh() {
  const w = U.weigh;
  return `<div class="sheet-mask" data-act="closeWeigh"><div class="sheet ${U.anim.has('weigh') ? 'enter' : ''}" data-stop="1" style="padding:14px 20px 16px">
    <div class="row"><span class="kicker">今日 · 晨起空腹 · ${md(today())}</span><span data-act="closeWeigh" style="width:24px;height:24px;display:flex">${I.x}</span></div>
    <div class="grid2" style="margin:14px 0 10px">${[['体重 kg', w.kg, 'wKg'], ['体脂 %', w.bf, 'wBf']].map(([l, v, k], i) => `<div style="${i ? 'padding-left:12px' : 'border-right:2px solid var(--line);padding-right:12px'}"><div class="kicker">${l}</div><div class="big" style="font-size:48px;margin:8px 0 10px">${v.toFixed(1)}</div><div style="display:flex;gap:8px"><div class="step" data-act="${k}" data-d="-0.1">${I.minus}</div><div class="step" data-act="${k}" data-d="0.1">${I.plus}</div></div></div>`).join('')}</div>
    <div class="muted" style="font-size:12px;margin-bottom:12px">同一天重复保存会覆盖。体脂没测就留原值。</div>${btn('保存', 'saveWeigh', '', I.check)}</div></div>`;
}
function rWeekly() {
  const w = U.weekly, st = w.stats, rv = w.review;
  return `<div class="overlay ${U.anim.has('weekly') ? 'enter' : ''}">
    <div class="row" style="padding:10px 20px;border-bottom:2px solid var(--line)"><span data-act="closeWeekly" style="width:24px;height:24px;display:flex">${I.x}</span><span class="kicker" style="color:var(--fg)">第 ${S.week.no} 周 · ${md(S.week.start)} – ${md(addDays(S.week.start, 6))}</span><span style="width:24px"></span></div>
    <div class="scroll" style="padding:14px 20px 0">
      <div class="kicker acc">本周总结${w.ai ? ' · AI' : ''}</div><div class="h" style="font-size:30px;line-height:1.15;margin:6px 0 14px">${esc(rv.headline)}</div>
      <div class="grid2" style="border-top:2px solid var(--line);border-bottom:2px solid var(--line)">${[['训练完成', `${st.done} / ${st.planned}`, ''], ['训练消耗', fmt(st.burn) + ' kcal', ''], ['日均热量差', st.loggedDays ? (st.avgDef > 0 ? '+' : '') + fmt(st.avgDef) : '—', ''], ['体重变化', st.wDelta != null ? sign(st.wDelta) + ' kg' : '—', 'acc']].map(([k, v, c], i) => `<div style="padding:12px ${i % 2 ? '0 12px 12px' : '12px 12px 0'};${i % 2 === 0 ? 'border-right:2px solid var(--line);' : ''}${i < 2 ? 'border-bottom:2px solid var(--line)' : ''}"><div class="kicker">${k}</div><div class="big ${c}" style="font-size:22px;margin-top:6px">${v}</div></div>`).join('')}</div>
      <div class="kicker" style="margin:16px 0 4px">建议 · 下周</div>${rv.tips.map(t => `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0"><span style="width:10px;height:10px;background:var(--acc);flex:none;margin-top:5px"></span><span style="font-size:13px;line-height:1.5">${esc(t)}</span></div>`).join('')}
      ${(() => { const c = calibrate(); return c.ok ? `<div style="background:var(--acc-soft);padding:12px;margin-top:8px"><div class="kicker acc">热量校准</div><div style="font-size:13px;line-height:1.5;margin-top:4px">近 ${c.span} 天实测日常消耗 ≈ <b>${fmt(c.daily)}</b>（公式 ${fmt(c.formula)}${S.calib ? '，当前用 ' + fmt(S.calib.daily) : ''}）。</div><div style="margin-top:6px"><span class="link" data-act="calib">查看 / 采用 ›</span></div></div>` : ''; })()}
      ${!w.ai && KD_AI.hasKey(S.prefs) ? `<div style="padding:8px 0"><span class="link" data-act="aiReview">用 AI 重写周报 ›</span></div>` : ''}<div style="height:16px"></div></div>
    <div class="footer" style="display:flex;gap:8px"><button class="btn ghost" data-act="closeWeekly" style="flex:1"><span>稍后</span></button><div style="flex:2">${btn(S.nextWeek ? '重新生成下周' : '按建议生成下周', 'genNext')}</div></div></div>`;
}

function render() {
  const sc = root.querySelector('.scroll'), top = sc ? sc.scrollTop : 0, prev = root.dataset.screen;
  const isDark = S.prefs.theme === 'dark' || (S.prefs.theme === 'auto' && U.screen === 'workout');
  root.dataset.theme = isDark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]').content = U.screen === 'summary' ? '#ec3013' : isDark ? '#201e1d' : '#f3f2f2';
  const R = { onboard: rOnboard, home: rHome, plan: rPlan, food: rFood, progress: rProgress, profile: rProfile, camera: rCamera, result: rResult, workout: rWorkout, summary: rSummary };
  let html = R[U.screen]();
  if (U.exDetail) html += rExDetail();
  if (U.search) html += rSearch();
  if (U.weigh) html += rWeigh();
  if (U.weekly) html += rWeekly();
  if (U.sheet) html += rSheet();
  if (U.busy) html += `<div class="sheet-mask" style="justify-content:center;align-items:center"><div style="background:var(--fg);color:var(--bg);padding:14px 18px;font-size:13px;font-weight:600">${U.busy}</div></div>`;
  if (U.toast) html += `<div class="toast" id="toast">${esc(U.toast)}</div>`;
  if (prev !== U.screen) U.anim.add('screen');
  html = html.replace('<div class="screen"', `<div class="screen ${U.anim.has('screen') ? 'enter' : ''}"`);
  root.innerHTML = html;
  root.dataset.screen = U.screen; U.anim.clear();
  if (prev === U.screen) { const s2 = root.querySelector('.scroll'); if (s2) s2.scrollTop = top; }
  lockScreen(U.screen === 'workout');
  const q = document.getElementById('q'); if (q && U.search && U.search.focus) { q.focus(); U.search.focus = false; }
}

// ─── 动作（事件委托）
const cycles = { level: ['新手', '进阶', '老手'], goal: ['减脂', '增肌', '保持健康'], activity: ['久坐', '轻度活动', '中度活动'], days: [3, 4, 5, 6], place: ['健身房', '在家', '两者都有'] };
const numFields = { height: ['身高 cm', 120, 230], target: ['目标体重 kg', 30, 250], age: ['年龄', 14, 80], kcalOverride: ['每日热量目标 kcal（0 = 自动计算）', 0, 6000], restSec: ['固定休息秒数（0 = 按动作建议）', 0, 600] };
const go = s => { U.screen = s; U.exDetail = null; render(); };
const A = {
  go: d => { if (d.to === 'food') U.foodDate = today(); go(d.to); },
  // 引导
  obPick: d => { const q = OB[S.ob.step]; S.ob.answers[q.key] = q.key === 'days' ? +d.v : d.v; S.ob.step++; U.obDraft = null; save(); render(); },
  obStep: d => { const q = OB[S.ob.step], v = +(document.getElementById('obnum').value) || q.def; U.obDraft = +(Math.min(q.max, Math.max(q.min, v + (+d.d) * (q.step || 1))).toFixed(1)); render(); },
  obNum: () => { const q = OB[S.ob.step], v = +(document.getElementById('obnum').value); if (!(v >= q.min && v <= q.max)) { toast(`请输入 ${q.min}–${q.max}`); return; } S.ob.answers[q.key] = v; S.ob.step++; U.obDraft = null; save(); render(); },
  obFinish: () => { const a = S.ob.answers; const level = (a.level || '进阶').split(' ')[0]; Object.assign(S.profile, { goal: a.goal, sex: a.sex, age: a.age, height: a.height, weight: a.weight, target: a.target, activity: a.activity, place: a.place, days: level === '新手' ? Math.min(4, a.days) : a.days, level });
    if (!S.weights.length) S.weights.push({ date: today(), kg: a.weight, bf: 0 }); S.onboarded = true; S.week = null; ensureWeek(); save(); go('home'); },
  restart: async () => { if (!await confirmAsk('重新走一遍引导', '会按新答案重建本周计划，训练/饮食/体重记录保留。', '开始')) return; S.ob = { step: 0, answers: {} }; S.onboarded = false; go('onboard'); },
  // 训练
  startToday: () => startWorkout(todayIdx()),
  startSel: () => startWorkout(U.selDay),
  selDay: d => { U.selDay = +d.i; render(); },
  exDetail: d => { open_('exDetail', d.name); U.video = false; render(); },
  closeDetail: () => { U.exDetail = null; U.video = false; render(); },
  playVideo: () => { if (exInfo(U.exDetail).video) { U.video = true; render(); } else toast('该动作暂无示范视频'); },
  swapEx: d => { const day = S.week.days[U.selDay], e = day.ex[+d.j]; const n = altOf(e.name); if (n === e.name) { toast('没有备选动作'); return; } e.name = n; e.kg = S.progress[n] ?? (exInfo(n).inc ? e.kg : 0); save(); render(); toast(`已换成 ${n}`); },
  editEx: async d => { const day = S.week.days[U.selDay], e = day.ex[+d.j]; const v = await ask({ title: e.name, fields: [{ key: 's', label: '组数', type: 'number', value: e.sets, min: 1, max: 20 }, { key: 'r', label: e.unit ? `时长 ${e.unit}` : '次数', type: 'number', value: e.reps, min: 1, max: 999 }, ...(e.unit ? [] : [{ key: 'k', label: '重量', unit: 'kg', type: 'number', value: e.kg, min: 0, max: 500, step: 0.5 }])], okLabel: '保存' }); if (!v) return; e.sets = +v.s; e.reps = +v.r; if (!e.unit) e.kg = +v.k; save(); render(); },
  addEx: async () => { const cat = { lower: '下肢', upper: '上肢', core: '核心', cardio: '有氧' }; const n = await ask({ title: '加动作', options: Object.keys(EX).map(k => ({ label: k, sub: `${cat[EX[k].cat]} · ${EX[k].m}` })) }); if (!n) return; S.week.days[U.selDay].ex.push({ name: n, sets: 3, reps: 10, kg: S.progress[n] ?? 0 }); save(); render(); },
  addSession: async () => { const v = await ask({ title: '安排训练', options: Object.keys(SESSIONS).map(k => ({ label: k, sub: `${SESSIONS[k].ex.length} 动作 · ${SESSIONS[k].mins} 分钟` })) }); if (!v) return; const s = SESSIONS[v], home = S.profile.place === '在家'; const day = S.week.days[U.selDay]; day.name = v; day.place = home ? '在家' : '健身房'; day.mins = s.mins; day.ex = s.ex.map(e => { const name = home ? homeOf(e.name) : e.name; return { name, sets: e.sets, reps: e.reps, kg: S.progress[name] ?? (name === e.name ? e.kg : 0), ...(e.unit ? { unit: e.unit } : {}) }; }); save(); render(); },
  moveTomorrow: () => { const i = U.selDay; if (i >= 6) { toast('已经是周日'); return; } const D = S.week.days, a = D[i], b = D[i + 1]; const swap = (x, y) => ({ ...y, date: x.date }); D[i] = swap(a, b); D[i + 1] = swap(b, a); if (S.active && (S.active.dayIdx === i || S.active.dayIdx === i + 1)) S.active = null; U.selDay = i + 1; save(); render(); },
  togglePlace: () => { const day = S.week.days[U.selDay], toHome = day.place !== '在家'; day.place = toHome ? '在家' : '健身房'; day.ex = day.ex.map(e => { const name = toHome ? homeOf(e.name) : gymOf(e.name); return { ...e, name, kg: name === e.name ? e.kg : (S.progress[name] ?? (toHome ? 0 : (SESSIONS[day.name]?.ex.find(x => x.name === name)?.kg ?? 0))) }; }); save(); render(); },
  rpe: d => { const a = S.active; a.rpe = a.rpe === +d.v ? 0 : +d.v; save(); render(); },
  skipWarm: () => { const a = S.active, e = S.week.days[a.dayIdx].ex[a.exIdx]; a.warm = warmSets(e, a.kg).length; a.resting = false; save(); render(); },
  plates: async () => { const a = S.active; const bar = S.prefs.bar || 20; const P = plates(a.kg, bar); await ask({ title: `${a.kg} kg · 配片`, note: P ? (P.out.length ? `杠 ${bar}kg，每边：${P.out.join(' + ')} kg${P.rest ? `（还差 ${P.rest}kg 无法凑齐）` : ''}` : `空杆 ${bar}kg${P.rest ? `，还差每边 ${P.rest}kg` : ''}`) : `重量低于杠铃自重 ${bar}kg`, fields: [{ key: 'bar', label: '杠铃自重', type: 'select', options: ['20', '15', '10'], value: String(bar) }], okLabel: '好' }).then(v => { if (v && v.bar) { S.prefs.bar = +v.bar; save(); } }); },
  kg: d => { const a = S.active; a.kg = Math.max(0, +(a.kg + (+d.d)).toFixed(1)); save(); render(); },
  reps: d => { const a = S.active; a.reps = Math.max(1, a.reps + (+d.d)); save(); render(); },
  completeSet, finish: async () => { if (S.active.sets.length === 0) { if (!await confirmAsk('放弃这次训练？', '还没记录任何一组。', '放弃', true)) return; S.active = null; save(); lockScreen(false); go('home'); return; } finishWorkout(); },
  skipEx: () => { const a = S.active, d = S.week.days[a.dayIdx]; if (a.exIdx >= d.ex.length - 1) { finishWorkout(); return; } const n = d.ex[a.exIdx + 1], last = lastSetOf(n.name); a.exIdx++; a.setIdx = 0; a.warm = 0; a.rpe = 0; a.kg = last && last.kg >= n.kg ? last.kg : n.kg; a.reps = n.reps; a.resting = false; save(); render(); },
  startRest: () => { const a = S.active, e = S.week.days[a.dayIdx].ex[a.exIdx]; U.anim.add('rest'); a.resting = true; a.restStart = Date.now(); a.restEnd = Date.now() + restFor(e.name) * 1000; save(); render(); },
  endRest: () => { S.active.resting = false; save(); render(); },
  restAdd: d => { S.active.restEnd += (+d.s) * 1000; save(); render(); },
  summaryHome: () => go('home'),
  // 饮食
  camera: () => { U.camera = { label: mealLabelByTime(), busy: false, photo: null, from: U.screen, hint: '', error: '' }; go('camera'); setTimeout(() => { const f = document.getElementById('camfile'); if (f) f.click(); }, 60); },
  closeCamera: () => { KD_AI.abort(); const f = U.camera?.from; U.camera = null; go(f && f !== 'camera' ? f : 'home'); },
  cycleLabel: () => { const L = ['早餐', '午餐', '加餐', '晚餐']; U.camera.label = L[(L.indexOf(U.camera.label) + 1) % 4]; render(); },
  cycleResultLabel: () => { const L = ['早餐', '午餐', '加餐', '晚餐']; U.result.label = L[(L.indexOf(U.result.label) + 1) % 4]; render(); },
  closeResult: () => { const f = U.result.from; U.result = null; go(f || 'home'); },
  focusItem: d => { U.result.open = U.result.open === +d.i ? -1 : +d.i; render(); },
  delItem: d => { U.result.items.splice(+d.i, 1); U.result.open = -1; if (!U.result.items.length) { toast('已清空，返回'); A.closeResult(); return; } render(); },
  itemG: d => { const it = U.result.items[+d.i]; it.grams = Math.max(5, it.grams + (+d.d)); render(); },
  itemF: d => { const it = U.result.items[+d.i]; it.grams = Math.round(it.g0 * (+d.f)); render(); },
  itemSet: d => { const it = U.result.items[+d.i]; it.grams = +d.g; render(); },
  altItem: d => { const it = U.result.items[+d.i], a = it.alts[+d.k]; const old = { name: it.n, per100kcal: it.per100.kcal }; const dd = densityOf(a.name), mem = S.foodMemory[a.name];
    it.n = a.name; it.per100 = mem?.per100 || (dd ? { kcal: dd.v[0], protein: dd.v[1], carbs: dd.v[2], fat: dd.v[3] } : { ...it.per100, kcal: a.per100kcal }); it.src = mem ? '常吃' : dd ? '营养表' : 'AI'; it.conf = 'high';
    it.alts = [old, ...it.alts.filter(x => x.name !== a.name)]; render(); },
  renameItem: async d => { const it = U.result.items[+d.i];
    const v = await ask({ title: '改名 / 改热量', note: '热量按每 100g 填；改过的会记住，下次识别到同名食物直接用。', fields: [{ key: 'n', label: '名称', value: it.n }, { key: 'k', label: '每 100g 热量', unit: 'kcal', type: 'number', value: it.per100.kcal, min: 0, max: 900 }, { key: 'p', label: '每 100g 蛋白', unit: 'g', type: 'number', value: it.per100.protein, min: 0, max: 100 }, { key: 'c', label: '每 100g 碳水', unit: 'g', type: 'number', value: it.per100.carbs, min: 0, max: 100 }, { key: 'f', label: '每 100g 脂肪', unit: 'g', type: 'number', value: it.per100.fat, min: 0, max: 100 }] });
    if (!v) return; it.n = (v.n || it.n).trim(); it.per100 = { kcal: +v.k || 0, protein: +v.p || 0, carbs: +v.c || 0, fat: +v.f || 0 }; it.src = '手改'; it.conf = 'high'; render(); },
  redoRecog: async () => { const r = U.result; const v = await ask({ title: '补充说明后重新识别', note: '例：米饭只有半碗 / 这是两人份 / 鸡肉是水煮的没放油', fields: [{ key: 'hint', label: '说明', value: r.hint || '', placeholder: '一句话' }], okLabel: '重新识别' }); if (!v) return; U.camera = { label: r.label, from: r.from }; recognize(r.photo, (v.hint || '').trim()); },
  retryRecog: () => { const c = U.camera; recognize(c.photo, c.hint || ''); },
  logResult: () => { const r = U.result; const items = r.items.map(it => { const m = itemMacros(it); const mem = S.foodMemory[it.n] || { count: 0 }; S.foodMemory[it.n] = { grams: it.grams, per100: it.per100, count: mem.count + 1, last: today() }; return { n: it.n, u: `${it.grams}g`, ...m }; });
    addMeal(r.label, items); U.result = null; go('food'); toast(`已记入${r.label} · 今日剩余 ${fmt(targets().kcal - consumedOf(today()))} kcal`, 2600); },
  delMeal: async d => { const m = mealsOf(U.foodDate)[+d.i]; if (!await confirmAsk('删除这条记录？', `${m.time} ${m.label} · ${m.desc} · ${m.kcal} kcal`, '删除', true)) return; S.meals[U.foodDate].splice(+d.i, 1); save(); render(); },
  foodDay: d => { const n = addDays(U.foodDate, +d.d); if (n > today()) return; U.foodDate = n; render(); },
  quickAdd: d => { const f = S.recent[+d.i]; if (!f) return; addMeal(mealLabelByTime(), [{ n: f.n, u: f.u, k: f.k, p: f.p, c: f.c, f: f.f }], U.foodDate); render(); toast(`已记入 ${f.n} · ${f.k} kcal`); },
  copyMeal: async () => { const y = addDays(U.foodDate, -1), ms = mealsOf(y); if (!ms.length) { toast('前一天没有记录'); return; } const i = await ask({ title: `复制 ${md(y)} 的记录`, options: ms.map((m, k) => ({ label: `${m.label} · ${m.desc}`, sub: `${m.kcal} kcal`, value: k })) }); if (i == null) return; const m = ms[i]; addMeal(m.label, (m.items && m.items.length ? m.items : [{ n: m.desc, u: '1 份', k: m.kcal, p: m.p, c: m.c, f: m.f }]).map(x => ({ n: x.n, u: x.u, k: x.k, p: x.p, c: x.c, f: x.f })), U.foodDate); render(); toast(`已复制${m.label} · ${m.kcal} kcal`); },
  openSearch: () => { open_('search', null); U.search = { query: '', picked: [], scanning: false, hit: null, label: U.camera?.label || mealLabelByTime(), focus: true }; if (U.screen === 'camera') { const f = U.camera?.from; U.camera = null; U.screen = f && f !== 'camera' ? f : 'food'; } render(); },
  closeSearch: () => { stopScan(); U.search = null; render(); },
  cycleSearchLabel: () => { const L = ['早餐', '午餐', '加餐', '晚餐']; U.search.label = L[(L.indexOf(U.search.label) + 1) % 4]; render(); },
  togglePick: d => { const s = U.search, f = foodSearch(s.query.trim()).find(x => x.n === d.n) || (s.hit && s.hit.n === d.n ? s.hit : null); if (!f) return; s.picked = s.picked.some(x => x.n === f.n) ? s.picked.filter(x => x.n !== f.n) : [...s.picked, f]; render(); },
  scan: startScan, cancelScan: () => { stopScan(); U.search.scanning = false; render(); },
  addHit: () => { const s = U.search; if (!s.picked.some(x => x.n === s.hit.n)) s.picked.push(s.hit); if (!S.customFoods.some(x => x.n === s.hit.n)) S.customFoods.unshift({ ...s.hit }); s.hit = null; save(); render(); },
  customFood: async () => { const s = U.search, n = s.query.trim(); const v = await ask({ title: `自定义「${n}」`, fields: [{ key: 'u', label: '份量描述', value: '1 份' }, { key: 'k', label: '热量', unit: 'kcal', type: 'number', value: '', min: 0, max: 5000 }, { key: 'p', label: '蛋白', unit: 'g', type: 'number', value: 0, min: 0, max: 500 }, { key: 'c', label: '碳水', unit: 'g', type: 'number', value: 0, min: 0, max: 500 }, { key: 'f', label: '脂肪', unit: 'g', type: 'number', value: 0, min: 0, max: 500 }], okLabel: '加入' }); if (!v) return; const food = { n, u: v.u || '1 份', k: +v.k, p: +v.p, c: +v.c, f: +v.f }; S.customFoods.unshift(food); if (U.search) U.search.picked.push(food); save(); render(); },
  logPicked: () => { const s = U.search; addMeal(s.label, s.picked.map(f => ({ n: f.n, u: f.u, k: f.k, p: f.p, c: f.c, f: f.f }))); const n = s.picked.length, k = sum(s.picked, 'k'); stopScan(); U.search = null; go('food'); toast(`已记入${s.label} · ${n} 项 · ${k} kcal`); },
  extraBurn: async () => { const d = today(); const v = await ask({ title: '手表 / 手环消耗', note: '填手表显示的今日运动消耗，不含本 App 记录的训练。', fields: [{ key: 'v', label: '消耗', unit: 'kcal', type: 'number', value: S.burn[d] || 0, min: 0, max: 5000 }], okLabel: '保存' }); if (!v) return; S.burn[d] = Math.max(0, +v.v || 0); save(); render(); },
  // 体重
  weigh: () => { const last = S.weights[S.weights.length - 1]; open_('weigh', null); U.weigh = { kg: last ? last.kg : S.profile.weight, bf: last ? last.bf || 0 : 0 }; render(); },
  closeWeigh: () => { U.weigh = null; render(); },
  wKg: d => { U.weigh.kg = +(U.weigh.kg + (+d.d)).toFixed(1); render(); }, wBf: d => { U.weigh.bf = +Math.max(0, U.weigh.bf + (+d.d)).toFixed(1); render(); },
  saveWeigh: () => { const t = today(), i = S.weights.findIndex(w => w.date === t), rec = { date: t, kg: U.weigh.kg, bf: U.weigh.bf }; if (i >= 0) S.weights[i] = rec; else S.weights.push(rec); S.weights.sort((a, b) => a.date < b.date ? -1 : 1); U.weigh = null; save(); render(); toast('已记录今日体重'); },
  // 周报
  openWeekly: () => { const st = weekStats(); open_('weekly', null); U.weekly = { stats: st, review: ruleReview(st), ai: false }; render(); },
  closeWeekly: () => { U.weekly = null; render(); },
  aiReview: async () => { const w = U.weekly; U.busy = 'AI 正在写周报…'; render(); try { const st = w.stats, ctx = { profile: { ...S.profile, weight: latestWeight() }, targets: targets(), stats: st, days: S.week.days.map(d => ({ date: d.date, plan: d.name, status: dayStatus(d), meals: mealsOf(d.date).map(m => ({ label: m.label, desc: m.desc, kcal: m.kcal, p: m.p })), deficit: mealsOf(d.date).length ? deficitOf(d.date) : null })), weights: S.weights.slice(-14) }; const r = await KD_AI.weeklyReview(S.prefs, ctx); w.review = r; w.ai = true; } catch (e) { toast('失败：' + e.message); } U.busy = ''; render(); },
  genNext: async () => { const v = KD_AI.hasKey(S.prefs) ? await ask({ title: '生成下周计划', note: 'AI 会参考本周记录、最好成绩和你的要求。要求可空。', fields: [{ key: 'req', label: '对下周的要求（可选）', value: '', placeholder: '如：周三没空 / 多练腿 / 减少有氧' }], okLabel: '生成' }) : {}; if (!v) return; generateNext((v.req || '').trim()); },
  // 底部面板
  sheetCancel: () => sheetClose(null),
  sheetOk: () => { const sh = U.sheet, vals = { ...(sh.vals || {}) }; (sh.fields || []).forEach(f => { if (f.type === 'select') { if (vals[f.key] == null) vals[f.key] = f.value; return; } const el = root.querySelector(`[data-sheet="${f.key}"]`); vals[f.key] = el ? el.value : f.value; }); if (sh.confirm && !sh.fields) { sheetClose(true); return; } for (const f of sh.fields || []) { if (f.type === 'number' && f.required !== false) { const n = +vals[f.key]; if (vals[f.key] === '' || !(n >= (f.min ?? -1e9) && n <= (f.max ?? 1e9))) { toast(`${f.label}：范围 ${f.min ?? ''}–${f.max ?? ''}`); return; } } } sheetClose(vals); },
  sheetPick: d => { const o = U.sheet.options[+d.i]; sheetClose(o.value !== undefined ? o.value : o.label); },
  sheetSeg: d => { const vals = { ...(U.sheet.vals || {}) }; root.querySelectorAll('[data-sheet]').forEach(el => { vals[el.dataset.sheet] = el.value; }); vals[d.k] = d.v; U.sheet.vals = vals; render(); },
  // 我
  theme: d => { S.prefs.theme = d.v; save(); render(); },
  restMode: d => { S.prefs.restMode = d.v; save(); render(); },
  toggleCore: () => { S.profile.core = !S.profile.core; save(); render(); toast('点「重新生成本周计划」立即生效，否则下周生效', 2600); },
  calib: async () => { const c = calibrate(); const T = targets();
    if (!c.ok) { await ask({ title: '校准热量目标', note: `按 MacroFactor 的方法，用近 28 天「实际摄入 − 体重趋势变化」反推你真实的日常消耗。${c.reason}。继续记录几天再来。${S.calib ? `\n\n当前使用 ${c.reason ? '上次' : ''}实测值 ${fmt(S.calib.daily)}（${md(S.calib.at)} 校准）。` : ''}`, options: S.calib ? [{ label: '改回公式值', value: 'reset' }] : [] }).then(v => { if (v === 'reset') { S.calib = null; save(); render(); toast('已改回公式值'); } }); return; }
    const v = await ask({ title: '校准热量目标', note: `近 ${c.span} 天：日均摄入 ${fmt(c.avgIn)} kcal，趋势体重 ${sign(c.dW)} kg（${c.n} 天有饮食记录）。反推日常消耗 ≈ ${fmt(c.daily)}，公式值 ${fmt(c.formula)}${c.raw !== c.daily ? '（原始值 ' + fmt(c.raw) + '，已限幅）' : ''}。采用后每日目标变为 ${fmt(Math.max(S.profile.sex === '男' ? 1500 : 1200, c.daily + ({ '减脂': -500, '增肌': 300, '保持健康': 0 }[S.profile.goal] || 0)))}。`, options: [{ label: `采用实测值 ${fmt(c.daily)}` , value: 'apply' }, ...(S.calib ? [{ label: '改回公式值', value: 'reset' }] : [])] });
    if (v === 'apply') { S.calib = { daily: c.daily, at: c.at, n: c.n }; save(); render(); toast(`已采用 · 目标 ${fmt(targets().kcal)} kcal`); } else if (v === 'reset') { S.calib = null; save(); render(); toast('已改回公式值'); } },
  toggleWarm: () => { S.prefs.warmup = !S.prefs.warmup; save(); render(); },
  toggleRpe: () => { S.prefs.rpe = !S.prefs.rpe; save(); render(); },
  toggleSound: () => { S.prefs.sound = !S.prefs.sound; save(); render(); },
  cycle: d => { const c = cycles[d.k]; S.profile[d.k] = c[(c.indexOf(S.profile[d.k]) + 1) % c.length]; save(); render(); if (d.k === 'days' || d.k === 'place' || d.k === 'level') toast('下周生效；要立即生效点「重新生成本周计划」', 2600); },
  editNum: async d => { const [label, min, max] = numFields[d.k]; const cur = d.k === 'restSec' ? S.prefs.restSec : S.profile[d.k]; const v = await ask({ title: label, fields: [{ key: 'v', label, type: 'number', value: cur, min, max, step: d.k === 'target' ? 0.1 : 1 }], okLabel: '保存' }); if (!v) return; const n = +v.v; if (d.k === 'restSec') S.prefs.restSec = n; else S.profile[d.k] = n; save(); render(); },
  regen: async () => {
    const hasAI = KD_AI.hasKey(S.prefs);
    const v = await ask({ title: '重新生成本周计划', note: '只重排本周还没练的天，已完成的记录不变。', fields: [...(hasAI ? [{ key: 'mode', label: '方式', type: 'select', options: ['AI 生成', '模板'], value: 'AI 生成' }, { key: 'req', label: '要求（可选）', value: '', placeholder: '如：不练核心 / 周五改练腿' }] : [])], okLabel: '重排' });
    if (!v) return;
    const t = today(), keep = (d) => d.date < t || (S.logs[d.date] && S.logs[d.date].sets.length);
    let fresh_ = buildWeek(S.week.start), note = '';
    if (hasAI && v.mode === 'AI 生成') {
      U.busy = 'AI 正在重排本周…'; render();
      try { const r = await KD_AI.generatePlan(S.prefs, { ...planContext((v.req || '').trim()), scope: '只重排 thisWeek 里 status 为 today/planned 的天，其余天照抄' });
        fresh_.days = fresh_.days.map((d, i) => { const g = r.days.find(x => x.dow === i + 1); return g && g.ex.length ? { date: d.date, name: g.name, place: g.place, mins: g.mins, ex: g.ex.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, kg: e.kg, ...(e.unit ? { unit: e.unit } : {}) })) } : { date: d.date, name: '休息', place: '', mins: 0, ex: [] }; }); note = r.note || '';
      } catch (e) { toast('AI 失败，已用模板：' + e.message, 3000); }
      U.busy = '';
    }
    S.week.days = S.week.days.map((d, i) => keep(d) ? d : fresh_.days[i]); S.week.note = note; if (S.active) S.active = null; save(); render(); toast(note ? '已重排 · ' + note : '本周剩余训练已重排', 3200); },
  apiKey: async d => { const k = d.k || 'apiKey'; const v = await ask({ title: k === 'geminiKey' ? 'Gemini API key' : 'Anthropic API key', note: '只存在这台手机的浏览器里。', fields: [{ key: 'v', label: 'Key', type: 'password', value: S.prefs[k], placeholder: k === 'geminiKey' ? 'AIza…' : 'sk-ant-…' }], okLabel: '保存' }); if (!v) return; S.prefs[k] = (v.v || '').trim(); save(); render(); },
  provider: d => { S.prefs.provider = d.v; save(); render(); },
  pingAI: async () => { U.busy = '正在连接…'; render(); try { const r = await KD_AI.ping(S.prefs); U.busy = ''; render(); toast(`连接正常 · ${r.ms} ms`, 3000); } catch (e) { U.busy = ''; render(); toast('失败：' + e.message, 5000); } },
  exportData: () => { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kedu-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); },
  importData: () => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'application/json,.json'; f.onchange = () => { const r = new FileReader(); r.onload = () => { try { const j = JSON.parse(r.result); if (j.v !== 1 || !j.profile) throw new Error('不是刻度的数据文件'); S = j; save(); ensureWeek(); go('home'); toast('已导入'); } catch (e) { toast('导入失败：' + e.message); } }; r.readAsText(f.files[0]); }; f.click(); },
  reloadApp: async () => { try { const r = await navigator.serviceWorker?.getRegistration(); if (r) await r.update(); } catch (_) {} location.reload(); },
  wipe: async () => { if (!await confirmAsk('清空全部数据？', '不可恢复，建议先导出。', '清空', true)) return; localStorage.removeItem(KEY); location.reload(); },
};
root.addEventListener('click', ev => {
  const stop = ev.target.closest('[data-stop]'), el = ev.target.closest('[data-act]');
  if (!el) return; if (stop && !stop.contains(el)) return;
  if (stop && el.classList.contains('sheet-mask')) return;
  const fn = A[el.dataset.act]; if (fn) fn(el.dataset, el, ev);
});
root.addEventListener('input', ev => {
  const el = ev.target.closest('[data-inp]'); if (!el) return;
  if (el.dataset.inp === 'query' && U.search) { U.search.query = el.value; const r = document.getElementById('results'); if (r) { const tmp = document.createElement('div'); tmp.innerHTML = rSearch(); r.innerHTML = tmp.querySelector('#results').innerHTML; } }
  if (el.dataset.inp === 'obnum') U.obDraft = null;
  if (el.dataset.inp === 'hint' && U.camera) U.camera.hint = el.value;
});
root.addEventListener('change', ev => { if ((ev.target.id === 'camfile' || ev.target.id === 'galfile') && ev.target.files[0]) recognize(ev.target.files[0], (U.camera && U.camera.hint || '').trim()); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { ensureWeek(); if (U.screen === 'workout') lockScreen(true); render(); } });

// 每秒：训练计时 / 休息倒计时（只改文字，不整页重绘）
setInterval(() => {
  if (U.screen === 'camera' && U.camera && U.camera.busy) { const el = document.getElementById('camstatus'); if (el) el.textContent = `${U.camera.status || '识别中…'} ${Math.round((Date.now() - U.camera.t0) / 1000)}s`; }
  if (U.screen !== 'workout' || !S.active) return;
  const a = S.active, el = document.getElementById('elapsed'); if (el) el.textContent = mmss(elapsed());
  if (a.resting) {
    const r = document.getElementById('rest-num');
    if (S.prefs.restMode === 'auto') { const left = Math.ceil((a.restEnd - Date.now()) / 1000); if (left <= 0) { a.resting = false; save(); beep(); render(); toast('休息结束，开始下一组'); } else if (r) r.textContent = mmss(left); }
    else if (r) r.textContent = mmss(Math.floor((Date.now() - a.restStart) / 1000));
  }
}, 1000);

// ─── 启动
if (S.onboarded) ensureWeek();
if (S.active && S.week && S.week.days[S.active.dayIdx] && S.week.days[S.active.dayIdx].date === S.active.date) U.screen = 'workout'; else S.active = null;
U.selDay = Math.max(0, S.week ? S.week.days.findIndex(d => d.date === today()) : 0);
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
window.KD = { S, U, render, save };
})();
