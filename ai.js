// 刻度 · 外部接口：Claude / Gemini（食物识别 / 周计划 / 周报）与 Open Food Facts（条码）
// 浏览器直连，仅供个人使用；API key 存本机 localStorage。
window.KD_AI = (() => {
const CLAUDE_API = 'https://api.anthropic.com/v1/messages', CLAUDE_MODEL = 'claude-opus-5';
const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_API = m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const keyOf = prefs => prefs.provider === 'gemini' ? prefs.geminiKey : prefs.apiKey;
const hasKey = prefs => !!(keyOf(prefs) || '').trim();
const parseJSON = t => JSON.parse(String(t).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''));

async function callClaude(apiKey, { system, content, schema: sc, effort, signal }) {
  const r = await fetch(CLAUDE_API, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 16000, thinking: { type: 'adaptive' }, system, messages: [{ role: 'user', content }], output_config: { effort, format: sc } }),
  });
  if (!r.ok) { let msg = `HTTP ${r.status}`; try { const j = await r.json(); msg = j.error?.message || msg; } catch (_) {} throw new Error(msg); }
  const j = await r.json();
  if (j.stop_reason === 'refusal') throw new Error('模型拒绝了这次请求');
  return parseJSON((j.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
}
const GEMINI_MODELS = [GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-2.5-flash']; // 高峰限流时依次降级
const sleep = ms => new Promise(r => setTimeout(r, ms));
const transient = (status, msg) => status === 429 || status === 503 || status === 500 || /high demand|overloaded|RESOURCE_EXHAUSTED|UNAVAILABLE|try again/i.test(msg || '');
async function geminiOnce(apiKey, model, body, signal) {
  const opts = () => ({ method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) });
  let r = await fetch(GEMINI_API(model), opts());
  if (r.status === 400 && body.generationConfig.responseJsonSchema) { // 个别 schema 关键字不被接受时退回：只要求 JSON，靠提示词约束
    const b2 = JSON.parse(JSON.stringify(body)); delete b2.generationConfig.responseJsonSchema; b2.contents[0].parts.push({ text: '\n只输出符合以下 JSON Schema 的 JSON：' + JSON.stringify(body.generationConfig.responseJsonSchema) });
    r = await fetch(GEMINI_API(model), { ...opts(), body: JSON.stringify(b2) });
  }
  if (!r.ok) { let msg = `HTTP ${r.status}`; try { const j = await r.json(); msg = j.error?.message || msg; } catch (_) {} const e = new Error(msg); e.status = r.status; throw e; }
  const j = await r.json();
  const c = j.candidates && j.candidates[0];
  if (!c || !c.content) throw new Error(c && c.finishReason ? `模型未返回内容（${c.finishReason}）` : '模型未返回内容');
  return parseJSON((c.content.parts || []).map(p => p.text || '').join(''));
}
async function callGemini(apiKey, { system, content, schema: sc, signal, onStatus }) {
  const parts = content.map(b => b.type === 'image' ? { inline_data: { mime_type: b.source.media_type, data: b.source.data } } : { text: b.text });
  const body = { system_instruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: sc.schema } };
  let last;
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    for (let attempt = 0; attempt < 2; attempt++) {
      try { return await geminiOnce(apiKey, model, body, signal); }
      catch (e) {
        if (e.name === 'AbortError' || !transient(e.status, e.message)) throw e;
        last = e; if (onStatus) onStatus(attempt === 0 ? `${model.replace('gemini-', '')} 繁忙，重试…` : `换 ${(GEMINI_MODELS[i + 1] || '').replace('gemini-', '') || '…'}`);
        if (attempt === 0) await sleep(1500);
      }
    }
  }
  throw new Error('Gemini 各模型都在限流：' + (last ? last.message.slice(0, 80) : '') + ' · 稍等一分钟再试');
}
async function callClaudeWrap(apiKey, req) { return callClaude(apiKey, req); }
let lastError = '';
async function call(prefs, req, timeoutMs = 90000) {
  const key = (keyOf(prefs) || '').trim();
  if (!key) throw new Error('NO_KEY');
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeoutMs); req.signal = ac.signal; call.abort = () => ac.abort();
  const t0 = Date.now();
  try { return await (prefs.provider === 'gemini' ? callGemini(key, req) : callClaude(key, req)); }
  catch (e) { const msg = e.name === 'AbortError' ? `超时（${Math.round((Date.now() - t0) / 1000)}s 无响应）` : e.message; lastError = `${new Date().toLocaleTimeString()} ${prefs.provider}: ${msg}`; throw new Error(msg); }
  finally { clearTimeout(t); call.abort = null; }
}
// 诊断：发一个最小文本请求，返回耗时
async function ping(prefs) {
  const t0 = Date.now();
  const r = await call(prefs, { system: '只输出 JSON。', content: [{ type: 'text', text: '回复 {"ok":true}' }], effort: 'low', schema: schema({ ok: { type: 'boolean' } }, ['ok']) }, 30000);
  return { ok: !!r.ok, ms: Date.now() - t0 };
}

const schema = (properties, required) => ({ type: 'json_schema', schema: { type: 'object', properties, required, additionalProperties: false } });

// 图片 → 食物列表 v2：模型只负责认菜、估克数、给每 100g 密度与置信度；热量由 app 按本地营养表/密度计算。
async function recognizeFood(prefs, base64, mediaType, { hint = '', known = [], onStatus } = {}) {
  const per100 = { type: 'object', additionalProperties: false, required: ['kcal', 'protein', 'carbs', 'fat'], properties: { kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' } } };
  const items = {
    type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['name', 'grams', 'per100', 'confidence', 'reason', 'bbox', 'alternatives'],
      properties: {
        name: { type: 'string', description: '中文菜名/食物名，简短通用（如 "白米饭" "宫保鸡丁"），不要带形容词' },
        grams: { type: 'integer', description: '这一份的估计重量（克，熟重）' },
        per100: { ...per100, description: '每 100g 的热量 kcal 与蛋白/碳水/脂肪克数' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: '对菜名与份量的整体把握' },
        reason: { type: 'string', description: '一句话：用什么参照物/依据估的份量（≤20 字）' },
        bbox: { type: 'object', additionalProperties: false, required: ['x', 'y', 'w', 'h'], properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } }, description: '在图中的位置，百分比 0-100' },
        alternatives: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'per100kcal'], properties: { name: { type: 'string' }, per100kcal: { type: 'number' } } }, description: '2-3 个可能混淆的相近菜品及其每 100g 热量' },
      } },
  };
  const sys = `你是经验丰富的中餐营养师。任务：识别照片中每一种食物，估计份量。
步骤：1) 先找参照物判断尺度：普通饭碗口径约 11–12cm、盛满米饭约 150–200g；外卖餐盒一格米饭约 200–250g；筷子长约 24cm；餐盘直径约 20–26cm；易拉罐 330ml。2) 逐个食物判断名称（用最常见的通用菜名）、可见部分被遮挡的比例、堆叠高度，估算克数。3) 给出每 100g 的营养密度（按常见做法含油量）。4) 混合菜（盖浇饭、便当、炒饭）拆成主食 + 菜分别列出。5) 汤只算汤本身，饮料按体积估克数。
把握不大的项 confidence 标 low，并在 alternatives 给出相近选项。只输出 JSON。`;
  const parts = [];
  if (hint) parts.push(`用户补充说明（优先采信）：${hint}`);
  if (known.length) parts.push(`用户常吃的食物名（若匹配请沿用同样的名字）：${known.join('、')}`);
  parts.push('识别这张照片里的食物。');
  return call(prefs, {
    system: sys,
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: parts.join('\n') },
    ],
    effort: 'medium', schema: schema({ items }, ['items']), onStatus,
  });
}

// 周计划：让模型在动作库范围内生成，保证解析/视频可用
async function generatePlan(prefs, ctx) {
  const names = Object.keys(KD_DATA.EX);
  const ex = { type: 'object', additionalProperties: false, required: ['name', 'sets', 'reps', 'kg', 'unit'],
    properties: { name: { type: 'string', enum: names }, sets: { type: 'integer' }, reps: { type: 'integer' }, kg: { type: 'number' }, unit: { type: 'string', enum: ['', 's', 'min'] } } };
  const day = { type: 'object', additionalProperties: false, required: ['dow', 'name', 'place', 'mins', 'ex'],
    properties: { dow: { type: 'integer', description: '1=周一 … 7=周日' }, name: { type: 'string', description: '课程名，如 "下肢 + 核心"' }, place: { type: 'string', enum: ['健身房', '在家'] }, mins: { type: 'integer' }, ex: { type: 'array', items: ex } } };
  return call(prefs, {
    system: `你是力量与减脂教练。根据用户资料和上周记录生成下一周的训练计划。规则：只使用给定动作名（enum）；每周训练天数与用户设定一致，其余为休息；重量以用户最近记录为基准，上周所有组都达标的动作按渐进超负荷加重（下肢 +5kg，上肢 +2.5kg，哑铃 +1~2kg），未完成的保持或减 5%；自重动作 kg=0；计时动作 unit 为 "s" 或 "min"，其余为 ""。减脂目标默认每周 1 次有氧；增肌目标全部力量。ctx.rules 是硬性约束（天数、场地、是否安排核心、分化方式），ctx.userRequest 是用户本次的具体要求，两者必须严格遵守，优先级高于默认模板；ctx.scope 若存在则只改指定范围。note 用一句话说明这周的安排思路和对用户要求的处理。只输出 JSON。`,
    content: [{ type: 'text', text: JSON.stringify(ctx) }],
    effort: 'high', schema: schema({ days: { type: 'array', items: day }, note: { type: 'string', description: '一句话说明本周安排思路' } }, ['days', 'note']),
  });
}

// 周报：结论 + 三条下周建议
async function weeklyReview(prefs, ctx) {
  return call(prefs, {
    system: '你是减脂教练。根据本周数据写周报：headline 是一两句直接结论（不超过 40 字，不客套）；tips 为 3 条具体可执行的下周建议，每条不超过 30 字。中文，只输出 JSON。',
    content: [{ type: 'text', text: JSON.stringify(ctx) }],
    effort: 'medium', schema: schema({ headline: { type: 'string' }, tips: { type: 'array', items: { type: 'string' } } }, ['headline', 'tips']),
  });
}

// 条码 → Open Food Facts（免费，无需 key）
async function lookupBarcode(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_zh,brands,serving_size,serving_quantity,nutriments`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (j.status !== 1 || !j.product) return null;
  const p = j.product, n = p.nutriments || {};
  const name = p.product_name_zh || p.product_name || '未知商品';
  const per = 100, sq = parseFloat(p.serving_quantity) || 0;
  const scale = sq ? sq / per : 1;
  const num = k => Math.round((parseFloat(n[k]) || 0) * scale);
  const kcal = n['energy-kcal_100g'] != null ? num('energy-kcal_100g') : Math.round((parseFloat(n['energy_100g']) || 0) / 4.184 * scale);
  return { n: `${name}${p.brands ? ' · ' + p.brands.split(',')[0] : ''}`, u: sq ? `1 份 ${p.serving_size || sq + 'g'}` : '100g', k: kcal, p: num('proteins_100g'), c: num('carbohydrates_100g'), f: num('fat_100g'), code };
}

return { recognizeFood, generatePlan, weeklyReview, lookupBarcode, hasKey, ping, abort: () => call.abort && call.abort(), lastError: () => lastError, model: prefs => prefs.provider === 'gemini' ? GEMINI_MODEL : CLAUDE_MODEL };
})();
