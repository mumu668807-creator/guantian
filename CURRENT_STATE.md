# CURRENT_STATE

更新时间：2026-07-04

## 当前状态

项目目录是 `/Users/moujingyi/Documents/codex/dayan-yarrow-fps`。这是一个独立 git 仓库，外层 `/Users/moujingyi/Documents/codex` 不是此项目仓库。

当前主线是 Vite + React + TypeScript 的 2D 平面交互版大衍筮法网页。旧 Three.js / React Three Fiber 3D 场景仍保留为 legacy lazy 入口，但默认入口固定为 2D。

## 已完成

- 2D 入口已经接入：`src/App.tsx` 默认渲染 `Ritual2DView`。
- 用户输入所问之事后进入起筮。
- 桌面先显示 50 根蓍草，再抽出 1 根 `unusedOne`，剩余 49 根参与后续过程。
- 每一变等待用户点击蓍草束选择分草处。
- 系统自动执行右取一、左堆四四数之、右堆四四数之、归余。
- 三变成一爻，六爻成一卦。
- 最终结果来自用户 18 次真实分草选择。
- `manualDayan.ts` 有合法性断言，约束初变去策 5/9，二变、三变去策 4/8。
- 六十四卦资料库已经接入，启动时校验 64 卦、binary 唯一、每卦 6 爻、乾坤编码。
- “此卦照见”已经按动爻数量选择卦辞/爻辞，再交给 AI provider 生成札记。
- 前端优先调用同源 `/api/interpret`，后端代理走 OpenAI-compatible `chat/completions`。
- 真实模型失败时可 fallback 到 mock provider。
- Supabase 轻登录已接入：Email magic link、Google 登录能力、一天一卦 RPC `claim_daily_cast()`。
- Vercel Analytics 已接入。
- 中英文 copy 与语言切换已存在。
- 自然音频控制器接口已经接入页面，但音频资产与开关体验仍不完整。
- 本地历史记录已接入：完成起卦并生成解读后，会把记录保存到 localStorage，不接数据库、不接 Supabase。
- 一键分享卦帖已接入：解读完成后可用 `html-to-image` 从隐藏 share layout 生成高清 PNG，不截整页。
- 背景图已优化为 WebP 优先：入口图与分草桌面图保留原 PNG，同时生成桌面/1280 两档 WebP；入口页加载后会提前预加载分草背景。
- 移动端已适配：760px 以下放弃 1600×900 固定舞台缩放，改为纵向流式布局。`useStageScale` 返回 `{ scale, isCompact }`，`StageShell` 在紧凑视口加 `is-compact` 类且不缩放；全部移动样式收在 `styles.css` 末尾的 `@media (max-width: 760px)` 块里，桌面样式未动。移动端已去掉「建议大屏」提示。
- 移动端注意：`seatedArrive` 动画 `fill-mode: both` 会残留 `transform: scale(1)`，使 shell 内 `position: fixed` 元素退化为相对 shell 定位并造成横向溢出，移动端已用 `animation: none` 规避；改动画时要留意这一点。
- `index.html` 已补 SEO 与社交分享元信息（OG/Twitter 卡片、描述、canonical、theme-color、apple web app），`public/og-image.jpg`（1200×630）由入口图生成。
- 支持入口已接入：配置 `VITE_SUPPORT_URL`（Ko-fi 等打赏页）后，「关于观天」面板和解读纸页底部会显示「请一杯茶」链接；不配置则完全不渲染。文案 key 为 `supportLine` / `supportButton`。
- 生产解卦后端已迁到 Vercel Functions：`api/health.ts` 与 `api/interpret.ts` 直接读取 Vercel 环境变量并调用 OpenAI-compatible `chat/completions`，前端生产环境不再需要 `VITE_API_BASE_URL` 或 Railway。
- 默认语言按浏览器语言判断：`readInitialLanguage` 无 URL 参数和本地存储时，`navigator.language` 以 zh 开头进中文，否则英文（面向小红书流量）。
- `html-to-image` 改为分享时动态 import，不进首屏主 chunk。
- 移动端蓍草已放大：`YarrowSvg` 接受 `compact` prop，紧凑视口用裁掉空白边的 viewBox `44 80 672 366`，蓍草区全出血（负 margin 抵掉 shell padding），移动端爻线笔画加粗到 6.5/7。桌面 viewBox 不变。
- 卦帖已改为小红书友好的 3:4：1080×1440（输出 2160×2880 @2x），`share-poster` 内部间距字号同步收紧。
- 解读纸页结尾有「今日一问至此。明日可再来一卦。」（copy key `returnTomorrow`），作为一天一卦的回访提示。
- PWA 已接入：`public/manifest.json`（standalone、观天、墨绿主题色）+ `icon-192/512.png` + `apple-touch-icon.png`，图标是观卦六爻线条（上两阳下四阴），`favicon.svg` 已从紫色占位闪电换成同款。
- AI 札记提示词已重写为「案边札记体」：不再输出固定四章模板，改为要点约束加自由形态，中文 400-700 字、英文 250-400 词，开头三句内必须给倾向；按动爻数量注入取辞侧重（无动爻只讲本卦、一爻动以爻辞为核、四爻以上重心移到变卦）；模糊问题收窄作答并提醒下次怎么问；结尾固定输出一行「> 」金句（20-40 字）。
- 金句链路已接通：`interpretationRenderer` 把「> 」行渲染成 blockquote（纸页与历史面板均有样式）；卦帖 `getShareCoreText` 优先取金句行，取不到再回落旧的长句抽取。
- `AIInterpretationInput` 增加 `mainTexts` / `supportTexts`（来自 `selectInterpretation` 的主辞辅辞），CONTEXT 块新增 MAIN_TEXTS / SUPPORT_TEXTS；mock provider 靠解析 CONTEXT 块工作，改提示词时 CONTEXT 键名不要动。
- 两处 LLM 温度已从 0.7 调到 1.0（`server/llmClient.ts` 与 `api/interpret.ts`）；mock 兜底文案也改成札记体带金句行。
- 新提示词已用线上 DeepSeek 实测五类问题（大事一爻动、小事无动爻、模糊问题、三爻动、五爻动），倾向明确、长度收敛、金句行稳定出现。
- 注意：本地 `.env` 的 MiMo 服务已下线 `mimo-v2-flash`，已改为 `mimo-v2.5`，但该账户余额不足，本地开发解读会回落 mock；线上 Vercel 用 DeepSeek，正常。

## 关键文件

- `src/App.tsx`：应用入口，决定默认走 2D，旧 3D 以 lazy 方式保留。
- `src/view2d/Ritual2DView.tsx`：当前主体验页面，包含入口、登录、问题输入、仪式流程、结果展示、AI 札记触发。
- `src/view2d/YarrowSvg.tsx`：蓍草 SVG 渲染与点击分草入口。
- `src/view2d/InkLandscape.tsx`：2D 平面观天背景。
- `src/state/useManualRitualMachine.ts`：手动分草流程状态机，管理步骤、延迟、记录、成爻、成卦。
- `src/domain/manualDayan.ts`：大衍手动数策核心算法、蓍草位置、分割计算、合法性断言。
- `src/domain/interpretation.ts`：按动爻数量选择卦辞/爻辞的规则。
- `src/domain/hexagramLookup.ts`：六十四卦资料库查询与校验。
- `src/data/iching64.json`：正式六十四卦资料库。
- `src/interpretation/interpretationPrompt.ts`：AI 札记 prompt。
- `src/ai/localApiProvider.ts`：前端调用本地/线上解释接口。
- `api/health.ts`、`api/interpret.ts`：生产环境 Vercel Functions，同域提供健康检查与解卦代理。
- `server/index.ts`、`server/env.ts`、`server/llmClient.ts`：本地 LLM 代理。
- `src/auth/supabaseClient.ts`、`src/auth/useGuantianAuth.ts`：Supabase Auth 与一天一卦。
- `src/audio/natureAudio.ts`：自然音频控制器。
- `src/history/localHistory.ts`：本地历史记录读写、记录结构与结果摘要生成。
- `src/styles.css`：主要视觉与交互样式。
- `src/view2d/Ritual2DView.tsx`：包含隐藏卦帖布局、分享 PNG 生成与预览保存入口。
- `scripts/optimize-images.mjs`：用 sharp 从原 PNG 生成 WebP 背景资源。
- `README.md`：功能、运行方式、架构说明。
- `PROJECT_JOURNAL.md`：项目精神与演化原因。

## 当前检查结果

最近一次已通过：

- `npm run test:manual-dayan`
- `npm run test:interpretation`
- `npm run lint`
- `npm run build`

构建会提示部分 chunk 超过 500 kB，主要与旧 3D / Three 相关 bundle 有关，不是构建失败。

## 现在的问题

- 2D 美术仍偏占位，距离最终水墨/淡彩插画还有距离。
- 蓍草点击分草可用，但触摸、拖拽、手感还不够细。
- 左右堆、余数区、已用区还可以更像真实木案上的摆放。
- 自然音频只有基础控制器，缺少完整素材、静音开关和细致音量策略。
- 历史记录目前只是本地 localStorage 版本，没有跨设备同步、删除、导出或数据库持久化。
- 旧 3D 代码仍在仓库和构建产物里，增加包体；但暂时不要删除，等 2D 主线稳定后再决定是否封存。
- 本地 LLM 代理需要单独运行；生产环境由 Vercel Functions 承接，不再依赖 Railway。
- Supabase schema 文件在 README 中被提到，但当前根目录未看到 `supabase/schema.sql`，后续处理数据库前需要确认。

## 不要随便改

- 不要改 `manualDayan.ts` 的数学规则，除非同时更新断言与测试。
- 不要改爻位顺序：六爻从下往上，`yaoTexts[0]` 是初爻。
- 不要改 `hexagramLookup.ts` 的 binary 推导逻辑，除非明确验证 64 卦映射。
- 不要把 AI prompt 写进 React 组件；继续放在 `src/interpretation/interpretationPrompt.ts`。
- 不要让前端保存或读取真实 LLM key。
- 不要重新引入 `VITE_API_BASE_URL` 作为生产解卦入口，除非明确决定恢复外部后端。
- 不要把 `claim_daily_cast()` 改成付费、次数促销或增长机制。
- 不要把本地历史记录直接接到 Supabase；后续若要同步，需要另开一个明确的小任务。
- 不要删除旧 3D 文件；目前它们是可回退资产。
- 不要把开发 debug 信息显示给正式用户。
- 不要一次性重做视觉系统；先做小而确定的体验改进。
