export type LineValue = 6 | 7 | 8 | 9

export type ChangeRecord = {
  index: number
  startCount: number
  reservedOne: boolean
  leftPile: number
  rightPile: number
  rightAfterTake: number
  leftRemainder: number
  rightRemainder: number
  removed: number
  remaining: number
}

export type YaoRecord = {
  index: number
  changes: ChangeRecord[]
  value: LineValue
  nature: 'old-yin' | 'young-yang' | 'young-yin' | 'old-yang'
  isYang: boolean
  isChanging: boolean
}

export type HexagramResult = {
  question: string
  lines: YaoRecord[]
  changedLines: number[]
  primaryBinary: string
  changedBinary: string
  generatedAt: string
}

const natureByValue: Record<LineValue, YaoRecord['nature']> = {
  6: 'old-yin',
  7: 'young-yang',
  8: 'young-yin',
  9: 'old-yang',
}

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const remainderOfFour = (count: number) => {
  const remainder = count % 4
  return remainder === 0 ? 4 : remainder
}

export function makeChange(startCount: number, index: number): ChangeRecord {
  const leftPile = randomInt(1, startCount - 1)
  const rightPile = startCount - leftPile
  const rightAfterTake = rightPile - 1
  const leftRemainder = remainderOfFour(leftPile)
  const rightRemainder = remainderOfFour(rightAfterTake)
  const removed = 1 + leftRemainder + rightRemainder

  return {
    index,
    startCount,
    reservedOne: index === 1,
    leftPile,
    rightPile,
    rightAfterTake,
    leftRemainder,
    rightRemainder,
    removed,
    remaining: startCount - removed,
  }
}

export function makeYao(index: number): YaoRecord {
  const changes: ChangeRecord[] = []
  let count = 49

  for (let changeIndex = 1; changeIndex <= 3; changeIndex += 1) {
    const change = makeChange(count, changeIndex)
    changes.push(change)
    count = change.remaining
  }

  const value = (count / 4) as LineValue

  return {
    index,
    changes,
    value,
    nature: natureByValue[value],
    isYang: value === 7 || value === 9,
    isChanging: value === 6 || value === 9,
  }
}

export function castHexagram(question: string): HexagramResult {
  const lines = Array.from({ length: 6 }, (_, lineIndex) => makeYao(lineIndex + 1))
  const changedLines = lines
    .filter((line) => line.isChanging)
    .map((line) => line.index)

  const primaryBinary = lines.map((line) => (line.isYang ? '1' : '0')).join('')
  const changedBinary = lines
    .map((line) => {
      const changedYang = line.isChanging ? !line.isYang : line.isYang
      return changedYang ? '1' : '0'
    })
    .join('')

  return {
    question,
    lines,
    changedLines,
    primaryBinary,
    changedBinary,
    generatedAt: new Date().toISOString(),
  }
}

export function describeLine(value: LineValue) {
  if (value === 6) return '老阴，变'
  if (value === 7) return '少阳'
  if (value === 8) return '少阴'
  return '老阳，变'
}
