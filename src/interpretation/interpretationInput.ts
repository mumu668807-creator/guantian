import type { HexagramText } from '../data/iching64.ts'
import { selectInterpretation } from '../domain/interpretation.ts'
import { getHexagramByBinary, missingText } from '../domain/hexagramLookup.ts'
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
): AIInterpretationInput {
  const selection = selectInterpretation({
    originalHexagramBinary: result.primaryBinary,
    changedHexagramBinary: result.changedBinary,
    movingLines: result.changedLines,
  })
  const allItems = [...selection.primary, ...selection.secondary]
  const primaryHexagram = findHexagram(result.primaryBinary)
  const changedHexagram = findHexagram(result.changedBinary)

  return {
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
    movingLineTexts: allItems
      .filter((item) => item.type === 'yao')
      .map((item) => ({
        line: item.line ?? 1,
        title: item.title,
        text: item.text,
      })),
    divinationRule: selection.ruleLabel,
  }
}
