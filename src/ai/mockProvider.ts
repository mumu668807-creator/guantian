import type { AIProvider } from './provider'

type ParsedPrompt = {
  question: string
  primaryName: string
  primaryJudgment: string
  movingLines: string
  movingLineTexts: string
  changedName: string
  changedJudgment: string
  rule: string
}

const readBlock = (prompt: string, label: string, nextLabels: string[]) => {
  const startToken = `${label}：`
  const start = prompt.indexOf(startToken)
  if (start < 0) return ''

  const contentStart = start + startToken.length
  const endIndexes = nextLabels
    .map((nextLabel) => prompt.indexOf(`\n\n${nextLabel}：`, contentStart))
    .filter((index) => index >= 0)
  const end = endIndexes.length ? Math.min(...endIndexes) : prompt.length

  return prompt.slice(contentStart, end).trim()
}

const parseName = (line: string) => line.replace(/（.*$/, '').trim() || '未名卦'

const parsePrompt = (prompt: string): ParsedPrompt => ({
  question: readBlock(prompt, '用户问题', ['本卦']) || '未书之问',
  primaryName: parseName(readBlock(prompt, '本卦', ['本卦卦辞'])),
  primaryJudgment: readBlock(prompt, '本卦卦辞', ['动爻']),
  movingLines: readBlock(prompt, '动爻', ['动爻爻辞']),
  movingLineTexts: readBlock(prompt, '动爻爻辞', ['变卦']),
  changedName: parseName(readBlock(prompt, '变卦', ['变卦卦辞'])),
  changedJudgment: readBlock(prompt, '变卦卦辞', ['取辞规则']),
  rule: readBlock(prompt, '取辞规则', ['请严格按照以下结构输出']),
})

const includesAny = (text: string, words: string[]) => words.some((word) => text.includes(word))

const themeFor = (input: ParsedPrompt) => {
  const corpus = `${input.primaryName}${input.primaryJudgment}${input.movingLineTexts}${input.changedName}${input.changedJudgment}`

  if (includesAny(corpus, ['需', '酒食', '待', '涉大川'])) {
    return {
      root: '此卦的根基不是进攻，而是等待中的守正。事情面前有水，有险，也有可渡之处；现在最要紧的不是抢先，而是让时机熟透。',
      change: '动处落在“需于酒食，贞吉”一类语气上，它不催你出门争胜，而让你先把内里的秩序安顿好。能坐得住，局势才不会被焦虑牵走。',
      trend: '变卦所指向的趋势，是从等待转向联结与归附。等不是停滞，而是在让人、资源、证据慢慢靠拢。',
      conflict: '你困住的不是不知道答案，而是想用提前行动消灭不确定。',
      misread: '最容易误判的是：把“慢”看成失败，把暂不推进看成失控。',
      risk: '风险在于过早表态、过早投入、过早要求对方或局势给出确定回应。这样会把本来可成的势，逼成紧张。',
      dont: ['不要急着逼问结果。', '不要用一次情绪高涨时的判断替代长期观察。', '不要为了证明自己主动，而做超出证据的承诺。'],
      doNow: ['把已经确定的事实列出来，把猜测单独放一栏。', '维持节奏，不撤退，也不强攻。', '等待一个外部信号成熟后再推进下一步。'],
      action: '三日内，只做一件小事：给这件事设一个观察点，写下“什么出现时我才行动”。',
      principle: '能等到火候的人，不是软弱，是知道力气该落在哪里。',
      closing: '卦像一张案上的水：它没有叫你退，也没有叫你冲。它只是让你看见，真正的门还没有完全开。先稳住手，守住中正，把心从催促里收回来；时机成熟时，路会比现在清楚。',
    }
  }

  if (includesAny(corpus, ['泰', '交', '小往大来', '亨'])) {
    return {
      root: '此卦显出通达之象，但通达不是任意扩张，而是上下能相接，内外有交换。',
      change: '动爻提示变化发生在分寸处：有些东西已经松动，但还需要位置、礼数和节制来承接。',
      trend: '趋势偏向由闭塞转为可通。真正有用的，不是声势，而是关系和秩序重新流动。',
      conflict: '你困住的不是机会太少，而是不确定自己该用多大的力进入局面。',
      misread: '最容易误判的是：把顺势当成万事无碍，忽略了每一步仍要守位。',
      risk: '风险在于乐观过头，或在局势刚刚转顺时急着收割。',
      dont: ['不要把短暂顺利当作长期保证。', '不要越过必要的确认。'],
      doNow: ['保持往来通畅。', '把能公开说清的条件先说清。'],
      action: '三日内，补上一条被你略过的确认。',
      principle: '通达之时，越要让事情有秩序地通过。',
      closing: '此卦不替你许诺结果，只提醒你：路若开始通，不要用急躁把它重新堵住。让该来的来，让该定的定，人的心稳，局面才稳。',
    }
  }

  return {
    root: `${input.primaryName}所示，是此问当下的底色。卦辞说“${input.primaryJudgment}”，重点不在吉凶二字，而在它暴露了局势的结构。`,
    change: input.movingLineTexts.includes('无动爻')
      ? '此卦无动爻，说明此刻变化不在单一节点上，而在整体格局中。先看全局，比急着抓某一处更要紧。'
      : `动爻原文为“${input.movingLineTexts}”。变动处不是装饰，它指出此事里最不稳定、也最需要你看清的位置。`,
    trend: `${input.changedName}作为趋势，不是结论书，而是一条可能展开的路。变卦卦辞说“${input.changedJudgment}”，它提醒你看后续的方向，而不是迷信一次判断。`,
    conflict: '你困住的不是表面那个问题，而是对局势、欲望和代价还没有同时看清。',
    misread: '最容易误判的是：只取自己想听的一面，把卦辞当成批准书。',
    risk: '风险在于把模糊处强行解释成确定，把短期情绪误认为长期方向。',
    dont: ['不要立刻把这次起卦当作行动命令。', '不要回避你已经看见却不愿承认的事实。'],
    doNow: ['把事实、推测、期待分开写下。', '找出一件可以验证的小事，而不是追求一次性结论。'],
    action: '三日内，做一次冷静复盘：只记录事实，不替事实加情绪。',
    principle: '能被验证的，才值得推进；不能被验证的，先放在心旁。',
    closing: '卦不是替你说命，而是把你放回事情之中。看清自己的用力、恐惧和贪快，便已经往外走了一步。',
  }
}

export const mockProvider: AIProvider = {
  async interpret(prompt) {
    await new Promise((resolve) => window.setTimeout(resolve, 650))

    const input = parsePrompt(prompt)
    const theme = themeFor(input)

    return {
      markdown: `（模拟札记：尚未接入真实模型服务）

# 一、卦象总诊断

## 1. 本卦所示：当前局势的根基
你问的是“${input.question}”。${theme.root}

## 2. 动爻所示：真正发生变化的关键点
动爻：${input.movingLines}。${theme.change}

## 3. 变卦所示：趋势与可能结果
由${input.primaryName}而之${input.changedName}。${theme.trend}

## 4. 此问的核心矛盾
${theme.conflict}

# 二、现实处境拆解

## 1. 表面问题
表面上，你是在问这件事会怎样、能不能推进、该不该行动。

## 2. 深层问题
深处其实是在问：我能不能承受暂时没有答案，并且不让焦虑替我做决定。

## 3. 你最容易误判的地方
${theme.misread}

## 4. 卦象提醒你的风险
${theme.risk}

# 三、行动建议

## 1. 现在不要做什么
${theme.dont.map((item) => `- ${item}`).join('\n')}

## 2. 现在应该做什么
${theme.doNow.map((item) => `- ${item}`).join('\n')}

## 3. 三日内的小动作
${theme.action}

## 4. 这件事的长期原则
${theme.principle}

# 四、卦给你的那句话

${theme.closing}`,
    }
  },
}
