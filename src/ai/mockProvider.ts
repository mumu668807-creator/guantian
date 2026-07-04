import type { AIProvider } from './provider'

type ParsedPrompt = {
  language: 'en' | 'zh'
  question: string
  primaryName: string
  primaryJudgment: string
  movingLines: string
  movingLineNames: string
  movingLineTexts: string
  changedName: string
  changedJudgment: string
  rule: string
}

type JudgmentTheme = {
  questionType: string
  tendencyZh: string
  tendencyEn: string
  basisZh: string
  basisEn: string
  currentZh: string
  currentEn: string
  movingZh: string
  movingEn: string
  trendZh: string
  trendEn: string
  tensionZh: string
  tensionEn: string
  avoidZh: string[]
  avoidEn: string[]
  doZh: string[]
  doEn: string[]
  signalZh: string
  signalEn: string
  pushZh: string
  pushEn: string
  closingZh: string
  closingEn: string
}

const readContext = (prompt: string, key: string) => {
  const token = `${key}:`
  const start = prompt.indexOf(token)
  if (start < 0) return ''

  const contentStart = start + token.length
  const next = prompt.slice(contentStart).match(/\n[A-Z_]+:/)
  const end = next?.index === undefined ? prompt.indexOf('【/CONTEXT】', contentStart) : contentStart + next.index
  return prompt.slice(contentStart, end < 0 ? prompt.length : end).trim()
}

const cleanName = (name: string) => name.replace(/卦|\sgua$/i, '').trim() || '未名'

const parsePrompt = (prompt: string): ParsedPrompt => {
  const language = readContext(prompt, 'OUTPUT_LANGUAGE') === 'en' ? 'en' : 'zh'
  return {
    language,
    question: readContext(prompt, 'USER_QUESTION') || (language === 'en' ? 'unwritten question' : '未书之问'),
    primaryName: cleanName(readContext(prompt, 'PRIMARY_HEXAGRAM_NAME')),
    primaryJudgment: readContext(prompt, 'PRIMARY_HEXAGRAM_TEXT'),
    movingLines: readContext(prompt, 'MOVING_LINES') || (language === 'en' ? 'none' : '无'),
    movingLineNames: readContext(prompt, 'MOVING_LINE_NAMES') || (language === 'en' ? 'none' : '无动爻'),
    movingLineTexts: readContext(prompt, 'MOVING_LINE_TEXTS'),
    changedName: cleanName(readContext(prompt, 'CHANGED_HEXAGRAM_NAME')),
    changedJudgment: readContext(prompt, 'CHANGED_HEXAGRAM_TEXT'),
    rule: readContext(prompt, 'SELECTION_RULE'),
  }
}

const includesAny = (text: string, words: string[]) => words.some((word) => text.includes(word))

const inferQuestionTypeZh = (question: string) => {
  if (includesAny(question, ['感情', '喜欢', '复合', '分手', '关系', '恋', '婚'])) return '感情'
  if (includesAny(question, ['合作', '合伙', '客户', '项目', '合同'])) return '合作'
  if (includesAny(question, ['工作', '事业', '岗位', '升职', '公司', '创业'])) return '事业'
  if (includesAny(question, ['钱', '财', '投资', '回款', '收入', '资金'])) return '财务'
  if (includesAny(question, ['家', '父母', '孩子', '家庭'])) return '家庭'
  if (includesAny(question, ['要不要', '该不该', '能不能', '会不会', '选', '决定'])) return '决策'
  return '此事'
}

const inferQuestionTypeEn = (question: string) => {
  const lower = question.toLowerCase()
  if (includesAny(lower, ['love', 'relationship', 'marriage', 'breakup', 'partner'])) return 'relationship'
  if (includesAny(lower, ['partner', 'client', 'contract', 'collaboration', 'project'])) return 'collaboration'
  if (includesAny(lower, ['work', 'career', 'job', 'company', 'promotion', 'business'])) return 'work'
  if (includesAny(lower, ['money', 'investment', 'income', 'payment', 'fund'])) return 'money'
  if (includesAny(lower, ['family', 'parent', 'child', 'home'])) return 'family'
  if (includesAny(lower, ['should', 'whether', 'choice', 'decide', 'can it', 'will it'])) return 'decision'
  return 'this matter'
}

const hasNoMovingLines = (input: ParsedPrompt) =>
  input.movingLines === 'none' || input.movingLines === '无' || input.movingLineNames.includes('none')

const themeFor = (input: ParsedPrompt): JudgmentTheme => {
  const corpus = `${input.primaryName}${input.primaryJudgment}${input.movingLineTexts}${input.changedName}${input.changedJudgment}`
  const questionTypeZh = inferQuestionTypeZh(input.question)
  const questionTypeEn = inferQuestionTypeEn(input.question)
  const lineName = hasNoMovingLines(input) ? '无动爻' : input.movingLineNames
  const lineNameEn = hasNoMovingLines(input) ? 'no moving line' : input.movingLineNames

  if (includesAny(corpus, ['需', '酒食', '待', '涉大川'])) {
    return {
      questionType: input.language === 'en' ? questionTypeEn : questionTypeZh,
      tendencyZh: '这事偏成，但慢；能往前走，不能硬推。',
      tendencyEn: 'This leans toward possible, but slow. The situation has not fully ripened yet, and pressure would likely work against it.',
      basisZh: `本卦是${input.primaryName}，主等；动爻${lineName}，落在“需于酒食，贞吉”的意思上；变卦是${input.changedName}，后面有转通的口子。`,
      basisEn: `The primary gua is ${input.primaryName}, which points to waiting under real conditions. The moving line ${lineNameEn} keeps the matter in a steadier place rather than forcing it. The changed gua, ${input.changedName}, suggests that the blockage can open if the timing is handled well.`,
      currentZh: `问的是${questionTypeZh}，需卦就是等。不是不能成，是条件还没齐。这里可能有资源、回应、时间或对方状态没到位。`,
      currentEn: `For ${questionTypeEn}, ${input.primaryName} does not simply say no. It says the conditions are still forming. Something external still needs to answer, arrive, or become clear.`,
      movingZh: hasNoMovingLines(input)
        ? '无动爻时，看整体。关键不在突然转折，而在守住等待的分寸。'
        : `动在${lineName}。这爻不是叫你冲，是叫你稳住位置。转机在“能承接”，不在“抢结果”。`,
      movingEn: hasNoMovingLines(input)
        ? 'With no moving line, the reading stays with the overall structure. The key is not a sudden turn, but how well the waiting is held.'
        : `The moving line is ${lineNameEn}. It does not favor a push. It favors staying available, steady, and ready to receive the next opening.`,
      trendZh: `${input.changedName}说明后面不是全堵。短期慢，后面有通的可能。`,
      trendEn: `${input.changedName} points to some later opening. The short term is slow, but the matter is not closed if handled without pressure.`,
      tensionZh: '你急着要结果，但卦让你先等条件。',
      tensionEn: 'The tension is between wanting an answer now and needing the conditions to mature first.',
      avoidZh: ['不要逼问最后结果。', '不要在条件未齐时加码。', '不要把延迟直接当失败。'],
      avoidEn: ['Do not press for a final answer now.', 'Do not add commitment before the missing condition is clear.', 'Do not treat delay as refusal too quickly.'],
      doZh: ['把已经具备的条件和缺口列清楚。', '只做一次低压确认。', '守住稳定回应，不要追着要结果。'],
      doEn: ['List what is already in place and what is still missing.', 'Make one low-pressure clarification.', 'Stay steady rather than chasing the outcome.'],
      signalZh: '三日内看是否出现明确回复、时间确认、资源到位，或对方主动补信息。',
      signalEn: 'Within three days, watch for a clearer reply, a confirmed time, a resource becoming available, or the other side adding information without being pushed.',
      pushZh: '只问下一步条件或时间点，不逼态度。',
      pushEn: 'Ask only about the next condition or timing. Do not force a position.',
      closingZh: '此事偏成，但慢；守住节奏可通，急推则坏。',
      closingEn: 'This can move, but slowly. Let the situation ripen; pressure would narrow the opening rather than widen it.',
    }
  }

  if (includesAny(corpus, ['讼', '争', '不利涉大川'])) {
    return {
      questionType: input.language === 'en' ? questionTypeEn : questionTypeZh,
      tendencyZh: '这事现在不利硬碰硬。能不能成，先看争执和责任怎么划清。',
      tendencyEn: 'This is not favorable for direct pressure. The outcome depends less on force and more on how responsibility, rules, or disagreement are handled.',
      basisZh: `本卦${input.primaryName}不是小矛盾；动爻${lineName}指向争处；变卦${input.changedName}看后续能不能从对立里退出来。`,
      basisEn: `${input.primaryName} is not a small friction pattern. It points to conflict, competing accounts, or responsibility. The changed gua, ${input.changedName}, shows whether the matter can move out of opposition.`,
      currentZh: `问的是${questionTypeZh}，这里不是单纯推进不了，是双方现在说不到一起。`,
      currentEn: `For ${questionTypeEn}, this is not merely a delay. The structure suggests disagreement, unclear responsibility, or rules that both sides are using differently.`,
      movingZh: `动处在${lineName}。真正会变的是争执的处理方式，不是你多用力就能成。`,
      movingEn: `The moving point is ${lineNameEn}. What changes is how the conflict is handled, not how hard you push.`,
      trendZh: `${input.changedName}说明后续要看能不能收束争端。收得住，还有机会；收不住，就拖。`,
      trendEn: `${input.changedName} suggests the next phase depends on whether the dispute can be contained. If it can, there is room; if not, it drags.`,
      tensionZh: '问题不在想不想成，而在谁认账、谁让步、按什么规则走。',
      tensionEn: 'The issue is not only desire. It is who accepts what, who adjusts, and which rule the matter follows.',
      avoidZh: ['不要靠情绪压人。', '不要越过规则。', '不要把责任说得含糊。'],
      avoidEn: ['Do not pressure through emotion.', 'Do not bypass the rule or agreement.', 'Do not leave responsibility vague.'],
      doZh: ['把争议点写下来。', '确认对方真正不同意的是哪一条。', '先求可执行的小共识。'],
      doEn: ['Write down the exact point of disagreement.', 'Clarify what the other side actually objects to.', 'Seek one small agreement that can be acted on.'],
      signalZh: '三日内看对方是否愿意就具体条款、责任或时间点说清楚。',
      signalEn: 'Within three days, watch whether the other side is willing to clarify a specific term, responsibility, or timeline.',
      pushZh: '先问“我们卡在哪一条”，不要问“到底成不成”。',
      pushEn: 'Ask “Which point is blocking this?” rather than “Will this work or not?”',
      closingZh: '此卦不利硬碰硬；先把争处说清，才有往前走的路。',
      closingEn: 'This is not a moment for force. Name the point of conflict first; only then can the matter move.',
    }
  }

  return {
    questionType: input.language === 'en' ? questionTypeEn : questionTypeZh,
    tendencyZh: '半成。不是没机会，但现在还不能只凭愿望往前压。',
    tendencyEn: 'This is partial, not settled. There is room, but the situation needs verification before a stronger move.',
    basisZh: `本卦${input.primaryName}给当前结构，动爻${lineName}给变化点，变卦${input.changedName}给后势。现在只能按这三处判断，不能加戏。`,
    basisEn: `${input.primaryName} gives the present structure, ${lineNameEn} marks the active point, and ${input.changedName} shows the next shape. The reading should stay with those three signals.`,
    currentZh: `问的是${questionTypeZh}，现在结构里还有不明处。不是简单支持，也不是直接否定。`,
    currentEn: `For ${questionTypeEn}, the present structure still has something unconfirmed. It is neither a clean yes nor a clean no.`,
    movingZh: hasNoMovingLines(input)
      ? '无动爻，看整体。事情没有明显突发口子，先别急着找单点答案。'
      : `动在${lineName}。变化已经有，但更像提醒分寸，不是直接给通行证。`,
    movingEn: hasNoMovingLines(input)
      ? 'With no moving line, the whole pattern matters more than a sudden turn. Do not look for a single dramatic signal.'
      : `The moving point is ${lineNameEn}. There is movement, but it is more about proportion and timing than permission to force the matter.`,
    trendZh: `${input.changedName}说明后面会换一种局面。能不能成，要看你有没有按风险走。`,
    trendEn: `${input.changedName} suggests the matter shifts into a different shape. Whether it works depends on how the risk is handled now.`,
    tensionZh: '你想要结论，但卦先要你验条件。',
    tensionEn: 'You want a conclusion, but the pattern asks for the missing condition to be tested first.',
    avoidZh: ['不要把起卦当行动许可。', '不要忽略已经露出的阻力。'],
    avoidEn: ['Do not treat the reading as permission to act immediately.', 'Do not ignore the resistance that has already appeared.'],
    doZh: ['把事实、推测、期待分开。', '找一个最能验证成败的条件。'],
    doEn: ['Separate fact, assumption, and hope.', 'Identify the one condition that would test whether this can move.'],
    signalZh: '三日内看是否有明确回复、时间、资源、关键人表态或阻力减少。',
    signalEn: 'Within three days, watch for a clear reply, a timeline, a resource, a key person taking a position, or a reduction in resistance.',
    pushZh: '只推进一个最小动作，用它验局势。',
    pushEn: 'Make only the smallest useful move, and use it to test the situation.',
    closingZh: '此事半成；先验条件，再动手。',
    closingEn: 'This is not closed, but it is not ready for pressure. Test the condition first, then move.',
  }
}

const renderZh = (input: ParsedPrompt, theme: JudgmentTheme) => `（模拟判断：尚未接入真实模型服务）

${theme.tendencyZh}

本卦为${input.primaryName}卦。${theme.currentZh}${theme.movingZh}

变卦为${input.changedName}卦。${theme.trendZh}${theme.tensionZh}

先别做的：${theme.avoidZh.join('')}可以做的：${theme.doZh.join('')}

${theme.signalZh}

> ${theme.closingZh}`

const renderEn = (input: ParsedPrompt, theme: JudgmentTheme) => `(Mock reading: the live model service is not connected.)

${theme.tendencyEn}

The primary gua is ${input.primaryName}. ${theme.currentEn} ${theme.movingEn}

The changed gua is ${input.changedName}. ${theme.trendEn} ${theme.tensionEn}

Better avoided for now: ${theme.avoidEn.join(' ')} Worth doing: ${theme.doEn.join(' ')}

${theme.signalEn}

> ${theme.closingEn}`

export const mockProvider: AIProvider = {
  async interpret(prompt) {
    await new Promise((resolve) => window.setTimeout(resolve, 650))

    const input = parsePrompt(prompt)
    const theme = themeFor(input)

    return {
      markdown: input.language === 'en' ? renderEn(input, theme) : renderZh(input, theme),
    }
  },
}
