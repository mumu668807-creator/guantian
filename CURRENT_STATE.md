# CURRENT_STATE

更新时间：2026-05-27

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
- `server/index.ts`、`server/env.ts`、`server/llmClient.ts`：本地 LLM 代理。
- `src/auth/supabaseClient.ts`、`src/auth/useGuantianAuth.ts`：Supabase Auth 与一天一卦。
- `src/audio/natureAudio.ts`：自然音频控制器。
- `src/styles.css`：主要视觉与交互样式。
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
- 旧 3D 代码仍在仓库和构建产物里，增加包体；但暂时不要删除，等 2D 主线稳定后再决定是否封存。
- 本地 LLM 代理需要单独运行；生产环境需要配置 `VITE_API_BASE_URL`。
- Supabase schema 文件在 README 中被提到，但当前根目录未看到 `supabase/schema.sql`，后续处理数据库前需要确认。

## 不要随便改

- 不要改 `manualDayan.ts` 的数学规则，除非同时更新断言与测试。
- 不要改爻位顺序：六爻从下往上，`yaoTexts[0]` 是初爻。
- 不要改 `hexagramLookup.ts` 的 binary 推导逻辑，除非明确验证 64 卦映射。
- 不要把 AI prompt 写进 React 组件；继续放在 `src/interpretation/interpretationPrompt.ts`。
- 不要让前端保存或读取真实 LLM key。
- 不要把 `claim_daily_cast()` 改成付费、次数促销或增长机制。
- 不要删除旧 3D 文件；目前它们是可回退资产。
- 不要把开发 debug 信息显示给正式用户。
- 不要一次性重做视觉系统；先做小而确定的体验改进。
