import type { HexagramText } from '../data/iching64.ts'
import { selectInterpretation } from '../domain/interpretation.ts'
import { getHexagramByBinary, getYaoText, missingText } from '../domain/hexagramLookup.ts'
import type { ManualHexagramResult } from '../domain/manualDayan.ts'
import type { AIInterpretationInput } from './interpretationTypes'

const findHexagram = (binary: string): HexagramText =>
  getHexagramByBinary(binary) ?? {
    id: 0,
    name: '未录入卦',
    binary,
    judgment: missingText,
    yaoTexts: [],
  }

export function buildAIInterpretationInput(
  question: string,
  result: ManualHexagramResult,
  language: AIInterpretationInput['language'] = 'zh',
): AIInterpretationInput {
  const selection = selectInterpretation({
    originalHexagramBinary: result.primaryBinary,
    changedHexagramBinary: result.changedBinary,
    movingLines: result.changedLines,
  })
  const primaryHexagram = findHexagram(result.primaryBinary)
  const changedHexagram = findHexagram(result.changedBinary)
  const movingLineTexts = result.changedLines.map((line) => {
    const yao = getYaoText(result.primaryBinary, line)
    return {
      line,
      title: yao?.name ?? `第 ${line} 爻`,
      text: yao?.text || missingText,
    }
  })

  return {
    language,
    userQuestion: question,
    primaryHexagram: {
      name: primaryHexagram.name,
      binary: result.primaryBinary,
      judgment: primaryHexagram.judgment || missingText,
    },
    changedHexagram: {
      name: changedHexagram.name,
      binary: result.changedBinary,
      judgment: changedHexagram.judgment || missingText,
    },
    movingLines: result.changedLines,
    movingLineNames: movingLineTexts.map((line) => line.title),
    movingLineTexts,
    divinationRule: selection.ruleLabel,
    mainTexts: selection.primary.map((item) => ({ title: item.title, text: item.text })),
    supportTexts: selection.secondary.map((item) => ({ title: item.title, text: item.text })),
  }
}
