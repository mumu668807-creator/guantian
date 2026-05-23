# 第一视角大衍筮法模拟器

MVP 0.5：平面交互版大衍筮法。项目主线从粗糙 3D 自动播放，调整为“平面观天画面 + 用户亲自分草”。机械化步骤由系统电子化执行，关键的“分而为二”由用户完成。

## 项目文档

- [PROJECT_JOURNAL.md](./PROJECT_JOURNAL.md)：项目演化札记，记录这个项目为什么从随机工具、粗糙 3D，逐步转向手动分草、平面观天与案边札记。

## 运行

```bash
npm install
npm run dev
```

默认开发地址由 Vite 输出，通常是 `http://localhost:5173/`。

构建检查：

```bash
npm run lint
npm run test:manual-dayan
npm run test:interpretation
npm run build
```

## 当前方向

- 默认进入 2D 平面观天模式。
- 旧 Three.js 3D 场景暂时保留，不删除，后续可通过 `mode: "2d" | "3d"` 切回。
- 视觉目标是水墨/淡彩插画感：远山、草地、溪流、木案、宽袖、双手、蓍草。
- 禁止仙侠手游风、红金边框、玄幻粒子、发光按钮和过度模板化中国风。

## MVP 0.5 功能

- 用户输入“所问何事”后开始起筮。
- 起筮时桌面先显示 50 根蓍草。
- 点击“起筮”后，先抽出 1 根横放在木案上方，标记为 `unusedOne`，对应“大衍之数五十，其用四十有九”。
- `unusedOne` 一直可见，不参与后续分草、挂一和四四数之。
- 剩余 49 根重新整理在桌面中部，使用 SVG 渲染。
- 每根蓍草仍是实体数组，有 `id / group / order / position`。
- 每一变开始时，系统等待用户点击蓍草束任意位置。
- 系统按点击的 x 坐标计算分割位置，自动夹到 `1...total-1`，不会出现空堆。
- 不允许左堆或右堆为 0。
- 系统自动执行：
  - 右堆取一。
  - 左堆四四数之。
  - 右堆四四数之。
  - 余数移出。
- 四四数之按 4 根一组移动，数量真实可见。
- 三变成一爻，六爻成一卦。
- 每一变都重新等待用户选择分草位置。
- 最终结果来自用户 18 次真实分草选择，不再随机。
- 每一变都会累计 `changeRecord`：`availableBefore / splitIndex / leftCount / rightCount / takenOne / rightAfterTake / leftRemainder / rightRemainder / removedCount / availableAfter`。
- 每三变累计一条 `lineRecord`，六爻从下往上生成。
- `manualDayan.ts` 内置合法性断言：初变只允许去策 5/9，二变和三变只允许去策 4/8。
- “此卦照见”不是 AI 自由发挥，而是先根据动爻数量从正式资料库取卦辞/爻辞，再通过可替换 provider 生成札记。
- 可选接入 Supabase Auth：Google 登录与 Email magic link。接入后，每个用户每天只能正式起卦一次，这不是付费限制，而是“卦不可乱起”的仪式规则。

## 轻量用户系统

《观天》的用户系统只用于“进入空间”和“一天一卦”，不做账号中心、等级或社交功能。

前端使用 Supabase Auth：

- Google 登录。
- Email magic link。
- 不做密码注册。
- 不使用 service role key。
- `.env` 只放 Supabase public URL 和 anon key。

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase 数据库执行：

```sql
-- 复制 supabase/schema.sql 到 Supabase SQL Editor 执行
```

核心表为 `guantian_profiles`，记录：

```text
id
last_cast_at
created_at
updated_at
```

起筮前会调用 `claim_daily_cast()`：

- 如果今天尚未起卦，写入 `last_cast_at` 并允许进入仪式。
- 如果今天已经起卦，显示：
  - 英文：`Today's hexagram has already been cast. Let it sit for a while.`
  - 中文：`今日已起一卦。先等一等。`

这条规则属于仪式节制，不是产品权限限制。

## 此卦照见取辞规则

- 0 动爻：取本卦卦辞。
- 1 动爻：取本卦该动爻爻辞。
- 2 动爻：取本卦两个动爻爻辞，上动爻为主，下动爻为辅。
- 3 动爻：本卦卦辞为主，变卦卦辞为辅。
- 4 动爻：取变卦两个未变爻爻辞，下未变爻为主，上未变爻为辅。
- 5 动爻：取变卦唯一未变爻爻辞。
- 6 动爻：取变卦卦辞。
- 正式资料库位于 `src/data/iching64.json`，类型定义位于 `src/data/iching64.ts`。
- 查询入口位于 `src/domain/hexagramLookup.ts`，提供 `getHexagramById`、`getHexagramByBinary`、`getJudgment`、`getYaoText`。
- JSON 原始数据没有 `binary` 字段，程序根据每卦的“上卦/下卦”推导 bottom-up binary，与大衍结果编码一致。
- 启动时会校验资料库：必须正好 64 卦、binary 不重复、每卦 6 条爻辞、乾卦为 `111111`、坤卦为 `000000`。校验失败会 `console.error` 并阻止程序继续运行。
- 暂未录入的卦辞/爻辞会显示“该卦辞/爻辞尚未录入资料库。”
- 爻辞数组顺序固定为 `yaoTexts[0] = 初爻 = line 1`，`yaoTexts[5] = 上爻 = line 6`；`getYaoText(binary, line)` 直接读取 `yaoTexts[line - 1]`，不反转。
- 资料库重建脚本位于 `scripts/build_iching_json.ts`。它从原始 txt/markdown 重新生成 JSON，卦辞取“卦标题之后、第一条爻辞之前”的整段文本，不依赖句号。

```bash
npm run build:iching-json -- /path/to/zhouyi-source.txt
```

脚本生成前会校验：64 卦、每卦 6 爻、`judgment` 非空、binary 唯一、乾 `111111`、坤 `000000`；失败会输出缺失卦、空卦辞、缺失爻辞列表并终止。

## 主要目录

```text
src/
  domain/
    manualDayan.ts        # 手动分草版大衍筮法
    interpretation.ts     # 此卦照见取辞选择器
    hexagramLookup.ts     # 六十四卦资料库校验与 binary 查询
    dayan.ts              # 旧随机/自动版算法，暂保留
    yarrowStalks.ts       # 旧 3D 蓍草实体，暂保留
    ritualTimeline.ts     # 旧 3D 时间轴，暂保留
  state/
    useManualRitualMachine.ts # MVP 0.5 手动分草状态机
    useRitualMachine.ts       # 旧 3D 自动状态机，暂保留
  view2d/
    Ritual2DView.tsx      # 平面交互主视图
    YarrowSvg.tsx         # 50 根 SVG 蓍草、unusedOne 与点击分草
    InkLandscape.tsx      # 平面观天山水背景
  scene/
    RitualScene.tsx       # 旧 Three/R3F 场景，暂停主线
  theme/
    themes.ts
  audio/
    natureAudio.ts
  data/
    iching64.json         # 六十四卦正式资料库
    iching64.ts           # 六十四卦资料库类型定义
  interpretation/
    interpretationTypes.ts
    interpretationInput.ts
    interpretationPrompt.ts
    interpretationRenderer.tsx
  ai/
    provider.ts
    localApiProvider.ts
    mockProvider.ts
  server/
    index.ts
    env.ts
    llmClient.ts
```

## AI 架构与安全

- 前端优先调用 `localApiProvider`，向同源 `/api/interpret` 发送 prompt。
- 后端代理位于 `server/`，使用 OpenAI-compatible `chat/completions` 接口，但不在代码里写死 OpenAI、MiMo 或 DeepSeek。
- 本地配置使用 `.env`，可参考 `.env.example`：

```bash
LLM_PROVIDER=mimo
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://api.example.com/v1
LLM_MODEL=your-model-name
```

- 切换 DeepSeek 或其他兼容服务时，只改 `.env`：

```bash
LLM_PROVIDER=deepseek
LLM_API_KEY=your_deepseek_key_here
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

- 启动后端代理：

```bash
npm run server
```

- Vite 开发服务会把 `/api` 代理到 `http://127.0.0.1:8787`。
- 真实接口失败时，前端会自动 fallback 到 `mockProvider`。
- 前端不写入真实 API key。
- 禁止新增 `VITE_LLM_API_KEY`、`VITE_OPENAI_API_KEY` 这类会暴露 key 的方案。
- Prompt 模板在 `src/interpretation/interpretationPrompt.ts`，不写在 React 组件里。

## 已知限制

- 2D 美术仍是 CSS/SVG 占位，不是最终插画。
- 音频只有接口占位，尚未接入鸟鸣、风声、水流素材。
- 真实模型代理需要单独运行 `npm run server`；未配置或接口失败时会回到 mockProvider。
- 旧 3D 代码仍在 bundle 中，后续若长期走 2D，可再拆包或移出默认路径。

## 下一步

1. 强化 SVG 蓍草的拖拽/触摸手感。
2. 把左右堆、余数区、已用区做得更像木案上的真实摆放。
3. 接入轻量自然音频：远鸟、风、溪流，并提供静音开关。
4. 把平面背景替换为更完整的水墨/淡彩插画资产。
5. 只在 2D 主线稳定后，再决定 3D 代码是否封存到独立入口。
