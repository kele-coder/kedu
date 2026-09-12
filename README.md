# 刻度 · 健身助手（PWA）

按 `design_handoff_fitness_assistant` 的 Modernist 设计稿实现的个人减脂 App。纯 HTML/CSS/JS，无构建步骤，数据只存在手机浏览器本地（localStorage），可离线使用。

## 怎么装到手机上

**方式 A · 同一 Wi-Fi 先试用（不需要部署）**
```
cd kedu-app && node serve.mjs 4173
```
终端会打印 `手机: http://192.168.x.x:4173`，手机浏览器打开即可。此方式下浏览器不允许注册离线缓存，也无法「安装」为独立 App，但所有功能可用（拍照走系统相机，不需要 HTTPS）。

**方式 B · 部署到 GitHub Pages（推荐，免费、HTTPS、可安装、离线）**
1. 新建一个 GitHub 仓库，把本目录所有文件推上去（`test/` 和 `serve.mjs` 可不推）。
2. 仓库 Settings → Pages → Source 选 `main` 分支根目录。
3. 手机打开 `https://<你的用户名>.github.io/<仓库名>/`：
   - Android Chrome：菜单 → 「安装应用」/「添加到主屏幕」。
   - iPhone Safari：分享 → 「添加到主屏幕」。
4. 以后改了文件，把 `sw.js` 里的 `VERSION` 加 1 再推，手机下次打开会自动更新。

Vercel / Netlify / Cloudflare Pages 拖文件夹上传也一样能用。

## 需要你自己配的东西
- **Claude API key**（「我」→ Claude API key）：拍照识别食物、AI 生成下周计划、AI 周报要用。不填也能用：搜索/扫码/自定义食物记录饮食，计划按模板 + 渐进超负荷生成，周报走规则。费用：一张照片识别约 ¥0.1–0.3。key 只存在手机本地，直接请求 Anthropic，不经过任何第三方。
- **条码**：走 Open Food Facts 公共库，免费、无需 key，国内商品收录不全；查不到时可手动录热量存为自定义食物。
- **手表消耗**：Web 拿不到 Health Connect / HealthKit，在「饮食」页 ⌚ 手动填当天运动消耗。

## 相对设计稿的改动（对比同类产品后的取舍）
| 设计稿 | 改成 | 依据 |
|---|---|---|
| 每日热量目标写死 1,800 | 按 Mifflin-St Jeor 算 BMR × 活动系数，减脂 −500 / 增肌 +300，设下限；可手动覆盖 | 临床与营养学会通用做法；500–750 kcal/日赤字对应每周 0.5–1 kg |
| 蛋白目标写死 | 减脂 2.0 g/kg · 增肌 1.8 · 保持 1.6；脂肪 25% 热量，碳水补齐 | 减脂期 1.6–2.2 g/kg 保肌肉 |
| 组间休息「手动开始 / 手动结束，不倒计时」 | 默认完成一组后**自动倒计时**（复合 120s / 孤立 60s / 核心 45s，可固定），到点震动 + 提示音，可 +30s / 跳过；保留手动模式 | Strong / Hevy 等主流训练 App 的标准做法，减少训练中的操作 |
| 体重只画原始值 | 原始点 + **20 日 EMA 趋势线**，首页/周报按趋势算变化 | MacroFactor 用 20 日 EMA；Happy Scale 同理，去掉水分波动噪声 |
| 周报统一「主项 +2.5kg」 | **双重递进**：某动作所有组都达到目标次数且重量 ≥ 计划 → 下次自动加（下肢 +5 / 上肢 +2.5 / 哑铃 +1–2）；否则保持 | 渐进超负荷的常规实现 |
| 训练消耗 = 组数 × 17 | MET × 体重 × 时长（力量 5 MET，有氧课 7 MET） | 更接近真实 |
| 热量差 = 手表 + 训练 − 摄入 | 热量差 = 摄入 −（TDEE + 训练 + 手表额外）| 原公式会把 −1,200 这种不真实的数字当赤字 |
| 引导只有「示例数据 / 手动输入」 | 真实录入性别、年龄、身高、体重、目标体重、活动量 | 热量计算需要 |
| 无持久化 | localStorage + 导出/导入 JSON；训练中刷新可恢复；跨周自动归档并生成新周 | 个人长期使用必须 |
| 无 | 训练中屏幕常亮（Wake Lock）、餐次按时间自动判断、自定义食物、删除记录、跳过动作、在计划里改组数/重量、加动作 | 实际使用会碰到 |
| Health Connect 同步 | Web 无法实现，改手动录入 | 平台限制 |

未做：Health Connect / HealthKit 自动同步（需原生壳）；示范视频仍是 YouTube 嵌入（26 个 ID 已验证有效，国内网络需代理）。

## 文件
- `index.html` `app.css` `app.js` — 应用本体；`data.js` — 动作库（35 个动作，含解析/要点/备选/在家版/视频）、计划模板（3–6 天）、食物库（60+ 中餐常见）；`ai.js` — Claude 与 Open Food Facts 接口。
- `sw.js` `manifest.webmanifest` `icons/` — PWA。
- `serve.mjs` — 本地预览；`test/` — jsdom 流程测试（`npm i jsdom` 后 `node test/flows.test.mjs`）。

## 改数据
- 加动作 / 改视频：`data.js` 里 `EX`。
- 改计划模板：`data.js` 里 `SESSIONS` / `TEMPLATES`。
- 改颜色字体：`app.css` 顶部 tokens（与设计稿 `_ds/styles.css` 一致）。
