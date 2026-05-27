# NEXT_TASK

## 只做一个最小任务

下一步建议只做：给 2D 起筮空间补一个真正可用的静音开关，并把自然音频接成“轻到不打扰”的环境层。

## 为什么是这个任务

当前项目的核心数学和流程已经能跑，下一步不该急着堆功能。项目真正缺的是“气”：风、水、远处环境声，以及用户能随时关掉它的安全感。

这个任务足够小，也足够贴近项目方向。它不需要重构大衍算法，不需要改取辞规则，不需要动 Supabase，也不会改变业务逻辑。

## 范围

只允许碰：

- `src/audio/natureAudio.ts`
- `src/view2d/Ritual2DView.tsx`
- `src/styles.css`
- 如确实需要，可新增少量音频资源文件

不碰：

- `src/domain/manualDayan.ts`
- `src/state/useManualRitualMachine.ts`
- `src/domain/interpretation.ts`
- `src/domain/hexagramLookup.ts`
- `src/data/iching64.json`
- Supabase 相关文件
- LLM server 相关文件
- 旧 3D 场景

## 验收标准

- 页面有一个克制的静音/启声按钮，不抢画面。
- 默认音量很轻，不像播放器或素材展示。
- 浏览器自动播放限制下，不报错；用户首次点击或按键后可恢复声音。
- 用户关闭后，本次浏览不再自动响。
- 不影响起筮流程、分草逻辑、结果生成和 AI 札记。
- `npm run lint`
- `npm run build`

## 暂时不要做

- 不要同时重做蓍草拖拽。
- 不要同时替换整张背景图。
- 不要同时清理旧 3D。
- 不要同时改登录和一天一卦规则。
- 不要做复杂音频面板、音轨选择、可视化频谱。

## 回退方式

如果这个任务做坏了，只回退这次涉及的音频与样式改动，保留当前大衍流程不动。
