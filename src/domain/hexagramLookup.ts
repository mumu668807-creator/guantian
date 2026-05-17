import rawHexagrams from '../data/iching64.json' with { type: 'json' }
import type { HexagramText, YaoText } from '../data/iching64.ts'

type RawYaoText = {
  title?: string
  name?: string
  text?: string
}

type RawHexagram = {
  id: number
  title?: string
  name?: string
  fullName?: string
  upperLower?: string
  binary?: string
  judgment?: string
  yaoTexts?: RawYaoText[]
}

const trigramBinaryBottomUp: Record<string, string> = {
  乾: '111',
  兑: '110',
  离: '101',
  震: '100',
  巽: '011',
  坎: '010',
  艮: '001',
  坤: '000',
}

const missingText = '该卦辞/爻辞尚未录入资料库。'

const normalizeName = (raw: RawHexagram): string => {
  const title = raw.title || raw.name || raw.fullName || `第 ${raw.id} 卦`
  return title.replace(/卦$/, '')
}

const deriveBinary = (raw: RawHexagram): string => {
  if (raw.binary) return raw.binary

  const match = raw.upperLower?.match(/([乾坤震巽坎离艮兑])上([乾坤震巽坎离艮兑])下/)
  if (!match) {
    throw new Error(`第 ${raw.id} 卦缺少可解析的上下卦信息`)
  }

  const upper = trigramBinaryBottomUp[match[1]]
  const lower = trigramBinaryBottomUp[match[2]]
  return `${lower}${upper}`
}

const normalizeHexagram = (raw: RawHexagram): HexagramText => ({
  id: raw.id,
  name: normalizeName(raw),
  binary: deriveBinary(raw),
  judgment: raw.judgment?.trim() || '',
  yaoTexts: (raw.yaoTexts ?? []).map((yao, index) => ({
    line: (index + 1) as YaoText['line'],
    name: yao.title || yao.name || `第 ${index + 1} 爻`,
    text: yao.text?.trim() || '',
  })),
})

const assertHexagramDatabase = (hexagrams: HexagramText[]) => {
  const errors: string[] = []

  if (hexagrams.length !== 64) {
    errors.push(`资料库必须正好 64 卦，当前为 ${hexagrams.length} 卦`)
  }

  const binaries = new Set<string>()
  for (const hexagram of hexagrams) {
    if (!/^[01]{6}$/.test(hexagram.binary)) {
      errors.push(`${hexagram.name} 的 binary 非法：${hexagram.binary}`)
    }

    if (binaries.has(hexagram.binary)) {
      errors.push(`binary 重复：${hexagram.binary}`)
    }
    binaries.add(hexagram.binary)

    if (hexagram.yaoTexts.length !== 6) {
      errors.push(`${hexagram.name} 必须有 6 条爻辞，当前为 ${hexagram.yaoTexts.length} 条`)
    }

    if (!hexagram.judgment.trim()) {
      errors.push(`${hexagram.name} 的 judgment 不能为空`)
    }
  }

  const qian = hexagrams.find((hexagram) => hexagram.name === '乾' || hexagram.id === 1)
  const kun = hexagrams.find((hexagram) => hexagram.name === '坤' || hexagram.id === 2)

  if (qian?.binary !== '111111') {
    errors.push(`乾卦 binary 必须为 111111，当前为 ${qian?.binary ?? '未找到乾卦'}`)
  }

  if (kun?.binary !== '000000') {
    errors.push(`坤卦 binary 必须为 000000，当前为 ${kun?.binary ?? '未找到坤卦'}`)
  }

  if (errors.length) {
    throw new Error(errors.join('\n'))
  }
}

const loadHexagrams = (): HexagramText[] => {
  try {
    const hexagrams = (rawHexagrams as RawHexagram[]).map(normalizeHexagram)
    assertHexagramDatabase(hexagrams)
    return hexagrams
  } catch (error) {
    console.error('《易经》六十四卦资料库校验失败：', error)
    throw error
  }
}

export const ICHING_64 = loadHexagrams()

const byId = new Map(ICHING_64.map((hexagram) => [hexagram.id, hexagram]))
const byBinary = new Map(ICHING_64.map((hexagram) => [hexagram.binary, hexagram]))

export function getHexagramById(id: number): HexagramText | undefined {
  return byId.get(id)
}

export function getHexagramByBinary(binary: string): HexagramText | undefined {
  return byBinary.get(binary)
}

export function getJudgment(binary: string): string | undefined {
  const judgment = getHexagramByBinary(binary)?.judgment
  return judgment || undefined
}

export function getYaoText(binary: string, line: number): YaoText | undefined {
  return getHexagramByBinary(binary)?.yaoTexts[line - 1]
}

export { missingText }
