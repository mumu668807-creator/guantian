import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import metadataJson from '../src/data/iching64.json' with { type: 'json' }

type MetadataHexagram = {
  id: number
  title: string
  fullName: string
  upperLower: string
}

type BuiltYaoText = {
  title: string
  text: string
}

type BuiltHexagram = MetadataHexagram & {
  binary: string
  judgment: string
  yaoTexts: BuiltYaoText[]
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

const yaoTitlePattern = '(?:初[九六]|[九六][二三四五]|上[九六])'
const lineYaoTitleRegExp = new RegExp(`(?:^|\\n)\\s*(${yaoTitlePattern})\\s*[：:、，,.．]?\\s*`, 'g')

const metadata = (metadataJson as MetadataHexagram[]).map((item) => ({
  id: item.id,
  title: item.title,
  fullName: item.fullName,
  upperLower: item.upperLower,
}))

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u3000/g, ' ')
    .replace(/[ \t]+/g, ' ')
}

function cleanText(text: string): string {
  return text
    .replace(/\n+/g, '\n')
    .replace(/^[\s:：、，。.\-—]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function deriveBinary(upperLower: string): string {
  const match = upperLower.match(/([乾坤震巽坎离艮兑])上([乾坤震巽坎离艮兑])下/)
  if (!match) throw new Error(`无法从上下卦推导 binary：${upperLower}`)

  const upper = trigramBinaryBottomUp[match[1]]
  const lower = trigramBinaryBottomUp[match[2]]
  return `${lower}${upper}`
}

function findHeading(text: string, meta: MetadataHexagram, fromIndex: number): { start: number; end: number } | null {
  const title = escapeRegExp(meta.title)
  const fullName = escapeRegExp(meta.fullName)
  const upperLower = escapeRegExp(meta.upperLower)
  const headingRegExp = new RegExp(
    `(?:^|\\n)[^\\n]{0,40}(?:${title}|${fullName})[^\\n]{0,60}(?:${upperLower})?[^\\n]*`,
    'g',
  )
  headingRegExp.lastIndex = fromIndex
  const match = headingRegExp.exec(text)

  if (match) {
    return {
      start: match.index + (match[0].startsWith('\n') ? 1 : 0),
      end: match.index + match[0].length,
    }
  }

  const fallbackIndex = text.indexOf(meta.title, fromIndex)
  if (fallbackIndex < 0) return null

  return {
    start: fallbackIndex,
    end: fallbackIndex + meta.title.length,
  }
}

function stripHeadingPrefix(section: string, meta: MetadataHexagram): string {
  const firstYao = section.search(new RegExp(yaoTitlePattern))
  const searchEnd = firstYao >= 0 ? firstYao : Math.min(section.length, 240)
  const head = section.slice(0, searchEnd)
  const tokens = [meta.upperLower, meta.fullName, meta.title, meta.title.replace(/卦$/, '')]
  let cutAt = 0

  for (const token of tokens) {
    const index = head.lastIndexOf(token)
    if (index >= 0) cutAt = Math.max(cutAt, index + token.length)
  }

  return section.slice(cutAt)
}

function parseYaoTexts(yaoBlock: string): BuiltYaoText[] {
  const matches = [...yaoBlock.matchAll(lineYaoTitleRegExp)]

  return matches.map((match, index) => {
    const next = matches[index + 1]
    const textStart = (match.index ?? 0) + match[0].length
    const textEnd = next?.index ?? yaoBlock.length

    return {
      title: match[1],
      text: cleanText(yaoBlock.slice(textStart, textEnd)),
    }
  })
}

function parseHexagrams(sourceText: string): BuiltHexagram[] {
  const text = normalizeText(sourceText)
  const headings: Array<{ meta: MetadataHexagram; heading: { start: number; end: number } | null }> = []
  let cursor = 0

  for (const meta of metadata) {
    const heading = findHeading(text, meta, cursor)
    headings.push({ meta, heading })
    if (heading) cursor = heading.end
  }

  return headings.map(({ meta, heading }, index) => {
    if (!heading) {
      return {
        ...meta,
        binary: deriveBinary(meta.upperLower),
        judgment: '',
        yaoTexts: [],
      }
    }

    const nextHeading = headings[index + 1]?.heading
    const section = stripHeadingPrefix(text.slice(heading.start, nextHeading?.start ?? text.length), meta)
    const firstYaoRegExp = new RegExp(`(?:^|\\n)\\s*(${yaoTitlePattern})\\s*[：:、，,.．]?\\s*`)
    const firstYao = section.search(firstYaoRegExp)
    const judgment = firstYao >= 0 ? cleanText(section.slice(0, firstYao)) : cleanText(section)
    const yaoBlock = firstYao >= 0 ? section.slice(firstYao) : ''

    return {
      ...meta,
      binary: deriveBinary(meta.upperLower),
      judgment,
      yaoTexts: parseYaoTexts(yaoBlock),
    }
  })
}

function validate(hexagrams: BuiltHexagram[]) {
  const missingHexagrams = hexagrams.filter((hexagram) => !hexagram.judgment && hexagram.yaoTexts.length === 0)
  const emptyJudgments = hexagrams.filter((hexagram) => !hexagram.judgment)
  const missingYaoTexts = hexagrams.filter((hexagram) => hexagram.yaoTexts.length !== 6)
  const errors: string[] = []

  if (hexagrams.length !== 64) errors.push(`必须生成 64 卦，当前为 ${hexagrams.length}`)

  const binarySet = new Set(hexagrams.map((hexagram) => hexagram.binary))
  if (binarySet.size !== 64) errors.push(`binary 必须唯一，当前唯一值为 ${binarySet.size}`)

  if (hexagrams.find((hexagram) => hexagram.id === 1)?.binary !== '111111') {
    errors.push('乾卦 binary 必须为 111111')
  }

  if (hexagrams.find((hexagram) => hexagram.id === 2)?.binary !== '000000') {
    errors.push('坤卦 binary 必须为 000000')
  }

  if (emptyJudgments.length) {
    errors.push(`存在空 judgment：${emptyJudgments.map((hexagram) => hexagram.title).join('、')}`)
  }

  if (missingYaoTexts.length) {
    errors.push(
      `存在爻辞数量异常：${missingYaoTexts
        .map((hexagram) => `${hexagram.title}(${hexagram.yaoTexts.length})`)
        .join('、')}`,
    )
  }

  return { errors, missingHexagrams, emptyJudgments, missingYaoTexts }
}

function main() {
  const [, , sourceArg, outputArg = 'src/data/iching64.json'] = process.argv

  if (!sourceArg) {
    console.error('用法：npm run build:iching-json -- <原始txt或markdown路径> [输出JSON路径]')
    process.exit(1)
  }

  const sourcePath = resolve(sourceArg)
  const outputPath = resolve(outputArg)
  const sourceText = readFileSync(sourcePath, 'utf8')
  const hexagrams = parseHexagrams(sourceText)
  const { errors, missingHexagrams, emptyJudgments, missingYaoTexts } = validate(hexagrams)

  console.log(`缺失卦列表：${missingHexagrams.map((hexagram) => hexagram.title).join('、') || '无'}`)
  console.log(`空 judgment 列表：${emptyJudgments.map((hexagram) => hexagram.title).join('、') || '无'}`)
  console.log(
    `缺失爻辞列表：${
      missingYaoTexts.map((hexagram) => `${hexagram.title}(${hexagram.yaoTexts.length}/6)`).join('、') || '无'
    }`,
  )

  if (errors.length) {
    console.error(`《易经》原文解析失败：\n${errors.join('\n')}`)
    process.exit(1)
  }

  writeFileSync(outputPath, `${JSON.stringify(hexagrams, null, 2)}\n`, 'utf8')
  console.log(`已生成：${outputPath}`)
}

main()
