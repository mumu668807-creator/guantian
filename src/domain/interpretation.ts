import type { HexagramText, YaoText } from '../data/iching64.ts'
import { getHexagramByBinary, getYaoText, missingText } from './hexagramLookup.ts'

export type InterpretationItem = {
  source: 'original' | 'changed'
  hexagramName: string
  hexagramBinary: string
  type: 'judgment' | 'yao'
  line?: number
  title: string
  text: string
  role: 'main' | 'support'
}

export type InterpretationSelection = {
  movingLineCount: number
  ruleLabel: string
  primary: InterpretationItem[]
  secondary: InterpretationItem[]
}

type SelectInterpretationInput = {
  originalHexagramBinary: string
  changedHexagramBinary: string
  movingLines: number[]
}

const findHexagram = (binary: string): HexagramText => {
  const found = getHexagramByBinary(binary)
  return (
    found ?? {
      id: 0,
      name: '未录入卦',
      binary,
      judgment: '',
      yaoTexts: [],
    }
  )
}

const findYaoText = (hexagram: HexagramText, line: number): YaoText => {
  const found = getYaoText(hexagram.binary, line)
  return {
    line: line as YaoText['line'],
    name: found?.name || `第 ${line} 爻`,
    text: found?.text || '',
  }
}

const judgmentItem = (
  source: InterpretationItem['source'],
  hexagram: HexagramText,
  role: InterpretationItem['role'],
): InterpretationItem => ({
  source,
  hexagramName: hexagram.name,
  hexagramBinary: hexagram.binary,
  type: 'judgment',
  title: `${hexagram.name}卦卦辞`,
  text: hexagram.judgment || missingText,
  role,
})

const yaoItem = (
  source: InterpretationItem['source'],
  hexagram: HexagramText,
  line: number,
  role: InterpretationItem['role'],
): InterpretationItem => {
  const yao = findYaoText(hexagram, line)

  return {
    source,
    hexagramName: hexagram.name,
    hexagramBinary: hexagram.binary,
    type: 'yao',
    line,
    title: `${hexagram.name}卦 ${yao.name}`,
    text: yao.text || missingText,
    role,
  }
}

export function selectInterpretation({
  originalHexagramBinary,
  changedHexagramBinary,
  movingLines,
}: SelectInterpretationInput): InterpretationSelection {
  const original = findHexagram(originalHexagramBinary)
  const changed = findHexagram(changedHexagramBinary)
  const sortedMovingLines = [...movingLines].sort((a, b) => a - b)
  const movingLineCount = sortedMovingLines.length

  if (movingLineCount === 0) {
    return {
      movingLineCount,
      ruleLabel: '无动爻：取本卦卦辞。',
      primary: [judgmentItem('original', original, 'main')],
      secondary: [],
    }
  }

  if (movingLineCount === 1) {
    return {
      movingLineCount,
      ruleLabel: '一动爻：取本卦该动爻爻辞。',
      primary: [yaoItem('original', original, sortedMovingLines[0], 'main')],
      secondary: [],
    }
  }

  if (movingLineCount === 2) {
    const [lower, upper] = sortedMovingLines
    return {
      movingLineCount,
      ruleLabel: '二动爻：取本卦两个动爻爻辞，上动爻为主，下动爻为辅。',
      primary: [yaoItem('original', original, upper, 'main')],
      secondary: [yaoItem('original', original, lower, 'support')],
    }
  }

  if (movingLineCount === 3) {
    return {
      movingLineCount,
      ruleLabel: '三动爻：本卦卦辞为主，变卦卦辞为辅。',
      primary: [judgmentItem('original', original, 'main')],
      secondary: [judgmentItem('changed', changed, 'support')],
    }
  }

  if (movingLineCount === 4) {
    const stableLines = [1, 2, 3, 4, 5, 6].filter((line) => !sortedMovingLines.includes(line))
    const [lowerStable, upperStable] = stableLines
    return {
      movingLineCount,
      ruleLabel: '四动爻：取变卦两个未变爻爻辞，下未变爻为主，上未变爻为辅。',
      primary: [yaoItem('changed', changed, lowerStable, 'main')],
      secondary: [yaoItem('changed', changed, upperStable, 'support')],
    }
  }

  if (movingLineCount === 5) {
    const stableLine = [1, 2, 3, 4, 5, 6].find((line) => !sortedMovingLines.includes(line)) ?? 1
    return {
      movingLineCount,
      ruleLabel: '五动爻：取变卦唯一未变爻爻辞。',
      primary: [yaoItem('changed', changed, stableLine, 'main')],
      secondary: [],
    }
  }

  return {
    movingLineCount,
    ruleLabel: '六动爻：取变卦卦辞。',
    primary: [judgmentItem('changed', changed, 'main')],
    secondary: [],
  }
}
