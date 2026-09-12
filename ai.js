// 刻度 · 外部接口：Claude / Gemini（食物识别 / 周计划 / 周报）与 Open Food Facts（条码）
// 浏览器直连，仅供个人使用；API key 存本机 localStorage。
window.KD_AI = (() => {
const CLAUDE_API = 'https://api.anthropic.com/v1/messages', CLAUDE_MODEL = 'claude-opus-5';
const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_API = m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const keyOf = prefs => prefs.provider === 'gemini' ? prefs.geminiKey : prefs.apiKey;
const hasKey = prefs => !!(keyOf(prefs) || '').trim();
const parseJSON = t => JSON.parse(String(t).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''));

async function callClaude(apiKey, { system, content, schema: sc, effort }) {
  const r = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 16000, thinking: { type: 'adaptive' }, system, messages: [{ role: 'user', content }], output_config: { effort, format: sc } }),
  });
  if (!r.ok) { let msg = `HTTP ${r.status}`; try { const j = await r.json(); msg = j.error?.message || msg; } catch (_) {} throw new Error(msg); }
  const j = await r.json();
  if (j.stop_reason === 'refusal') throw new Error('模型拒绝了这次请求');
  return parseJSON((j.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
}
async function callGemini(apiKey, { system, content, schema: sc }) {
  const parts = content.map(b => b.type === 'image' ? { inline_data: { mime_type: b.source.media_type, data: b.source.data } } : { text: b.text });
  const body = { system_instruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: sc.schema } };
  let r = await fetch(GEMINI_API(GEMINI_MODEL), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) });
  if (r.status === 400) { // 个别 schema 关键字不被接受时退回：只要求 JSON，靠提示词约束
    delete body.generationConfig.responseJsonSchema; body.contents[0].parts.push({ text: '\n只输出符合以下 JSON Schema 的 JSON：' + JSON.stringify(sc.schema) });
    r = await fetch(GEMINI_API(GEMINI_MODEL), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) });
  }
  if (!r.ok) { let msg = `HTTP ${r.status}`; try { const j = await r.json(); msg = j.error?.message || msg; } catch (_) {} throw new Error(msg); }
  const j = await r.json();
  const c = j.candidates && j.candidates[0];
  if (!c || !c.content) throw new Error(c && c.finishReason ? `模型未返回内容（${c.finishReason}）` : '模型未返回内容');
  return parseJSON((c.content.parts || []).map(p => p.text || '').join(''));
}
async function call(prefs, req) {
  const key = (keyOf(prefs) || '').trim();
  if (!key) throw new Error('NO_KEY');
  return prefs.provider === 'gemini' ? callGemini(key, req) : callClaude(key, req);
}

const schema = (properties, required) => ({ type: 'json_schema', schema: { type: 'object', properties, required, additionalProperties: false } });

// 图片 → 食物列表。bbox 为百分比（0–100），用于在照片上画框。
async function recognizeFood(prefs, base64, mediaType) {
  const items = {
    type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['name', 'portion', 'kcal', 'protein', 'carbs', 'fat', 'bbox', 'alternatives'],
      properties: {
        name: { type: 'string', description: '中文菜名/食物名，简短' },
        portion: { type: 'string', description: '估计份量，如 "约 180g" / "1 碗 150g"' },
        kcal: { type: 'integer' }, protein: { type: 'integer' }, carbs: { type: 'integer' }, fat: { type: 'integer' },
        bbox: { type: 'object', additionalProperties: false, required: ['x', 'y', 'w', 'h'], properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } }, description: '该食物在图中的大致位置，百分比 0-100' },
        alternatives: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'kcal'], properties: { name: { type: 'string' }, kcal: { type: 'integer' } } }, description: '2-3 个可能混淆的相似菜品及其热量' },
      } },
  };
  return call(prefs, {
    system: '你是营养师。识别照片中的每一种食物/菜品，用中文命名，估计份量与每份热量和三大营养素（克，整数）。中式菜按常见做法估算油量。无法确定时给出最可能的判断，并在 alternatives 里给 2-3 个相近选项。bbox 为该食物在图中的位置，百分比 0-100。只输出 JSON。',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: '识别这张照片里的食物。' },
    ],
    effort: 'medium', schema: schema({ items }, ['items']),
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
    system: `你是力量与减脂教练。根据用户资料和上周记录生成下一周的训练计划。规则：只使用给定动作名（enum）；每周训练天数与用户设定一致，其余为休息；重量以用户最近记录为基准，上周所有组都达标的动作按渐进超负荷加重（下肢 +5kg，上肢 +2.5kg，哑铃 +1~2kg），未完成的保持或减 5%；自重动作 kg=0；计时动作 unit 为 "s" 或 "min"，其余为 ""。减脂目标：每周 1 次有氧+核心；增肌目标：全部力量。只输出 JSON。`,
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

return { recognizeFood, generatePlan, weeklyReview, lookupBarcode, hasKey };
})();
