import type { LineValue, YaoRecord } from './dayan'

export type ManualYarrowGroup =
  | 'available'
  | 'unusedOne'
  | 'left'
  | 'right'
  | 'takenOne'
  | 'countedLeft'
  | 'countedRight'
  | 'remainder'
  | 'spent'

export type ManualYarrowStalk = {
  id: number
  group: ManualYarrowGroup
  order: number
  position: {
    x: number
    y: number
    rotation: number
  }
}

export type ManualChangeRecord = {
  lineIndex: number
  changeIndex: number
  availableBefore: number
  splitIndex: number
  leftCount: number
  rightCount: number
  takenOne: 1
  rightAfterTake: number
  leftRemainder: number
  rightRemainder: number
  removedCount: number
  availableAfter: number
  takenOneId: number
  leftRemainderIds: number[]
  rightRemainderIds: number[]
}

export type ManualLineRecord = Omit<YaoRecord, 'changes'> & {
  changes: ManualChangeRecord[]
}

export type ManualHexagramResult = {
  question: string
  lines: ManualLineRecord[]
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

const debugQuestion = '什么事'
const debugLineValues = [7, 7, 7, 8, 9, 8] as const

export const normalizeRemainder = (count: number) => {
  const remainder = count % 4
  return remainder === 0 ? 4 : remainder
}

const takeTail = (ids: number[], count: number) => ids.slice(-count)

export const clampSplitIndex = (splitIndex: number, availableCount: number) =>
  Math.min(availableCount - 1, Math.max(1, splitIndex))

export function splitIndexFromStalkPositions(stalks: ManualYarrowStalk[], clickX: number) {
  const available = stalks
    .filter((stalk) => stalk.group === 'available')
    .sort((a, b) => a.position.x - b.position.x || a.order - b.order || a.id - b.id)

  if (available.length < 2) return 1

  let nearestSplitIndex = 1
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < available.length - 1; index += 1) {
    const gapX = (available[index].position.x + available[index + 1].position.x) / 2
    const distance = Math.abs(clickX - gapX)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestSplitIndex = index + 1
    }
  }

  return clampSplitIndex(nearestSplitIndex, available.length)
}

export function createManualStalks(count = 50): ManualYarrowStalk[] {
  return Array.from({ length: count }, (_, index) => makeStalk(index + 1, 'available', index))
}

export function makeStalk(
  id: number,
  group: ManualYarrowGroup,
  order: number,
): ManualYarrowStalk {
  return {
    id,
    group,
    order,
    position: positionFor(group, order, id),
  }
}

export function positionFor(group: ManualYarrowGroup, order: number, id: number) {
  const sway = ((id % 7) - 3) * 0.75
  const smallScatter = ((id * 17) % 9) - 4
  const softScatter = smallScatter * 0.55

  if (group === 'available') {
    const fan = order - 24
    return {
      x: 80 + order * 12.05,
      y: 262 + Math.abs(fan) * 0.58,
      rotation: fan * 0.55 + sway,
    }
  }

  if (group === 'unusedOne') {
    return {
      x: 380,
      y: 100,
      rotation: 90,
    }
  }

  if (group === 'left') {
    const row = Math.floor(order / 9)
    const column = order % 9
    const fan = column - 4
    return {
      x: 126 + column * 11.2 + row * 7 + softScatter,
      y: 186 + row * 15 + Math.abs(fan) * 1.4 + ((id * 5) % 4),
      rotation: -16 + fan * 1.1 + sway,
    }
  }

  if (group === 'right') {
    const row = Math.floor(order / 9)
    const column = order % 9
    const fan = column - 4
    return {
      x: 496 + column * 11.2 - row * 7 + softScatter,
      y: 186 + row * 15 + Math.abs(fan) * 1.4 + ((id * 3) % 4),
      rotation: 16 + fan * 1.1 + sway,
    }
  }

  if (group === 'takenOne') {
    return {
      x: 666 + softScatter,
      y: 126 + ((id * 7) % 5),
      rotation: 30 + sway,
    }
  }

  if (group === 'countedLeft') {
    const bundle = Math.floor(order / 4)
    const inBundle = order % 4
    return {
      x: 78 + inBundle * 8.2 + (bundle % 5) * 47 + Math.floor(bundle / 5) * 9 + softScatter,
      y: 326 + Math.floor(bundle / 5) * 24 + (bundle % 2) * 4 + inBundle * 1.2,
      rotation: -18 + inBundle * 2.6 + sway,
    }
  }

  if (group === 'countedRight') {
    const bundle = Math.floor(order / 4)
    const inBundle = order % 4
    return {
      x: 468 + inBundle * 8.2 + (bundle % 5) * 47 - Math.floor(bundle / 5) * 9 + softScatter,
      y: 326 + Math.floor(bundle / 5) * 24 + (bundle % 2) * 4 + inBundle * 1.2,
      rotation: 18 - inBundle * 2.6 + sway,
    }
  }

  if (group === 'remainder') {
    const row = Math.floor(order / 8)
    const column = order % 8
    return {
      x: 322 + column * 14.2 + row * 8 + softScatter,
      y: 354 + row * 11 + Math.abs(column - 3.5) * 0.9,
      rotation: -5 + column * 1.4 + sway,
    }
  }

  const row = Math.floor(order / 11)
  const column = order % 11
  return {
    x: 296 + column * 12.6 + row * 5 + softScatter,
    y: 392 + row * 7 + ((id * 5) % 3),
    rotation: -2 + sway,
  }
}

export function makeManualChange(
  availableIds: number[],
  splitIndex: number,
  lineIndex: number,
  changeIndex: number,
): ManualChangeRecord {
  const availableBefore = availableIds.length
  const normalizedSplit = clampSplitIndex(splitIndex, availableBefore)
  if (availableBefore < 2) {
    throw new Error(`Invalid available count ${availableBefore}`)
  }

  const leftIds = availableIds.slice(0, normalizedSplit)
  const rightIds = availableIds.slice(normalizedSplit)
  const takenOneId = rightIds[0]
  const rightAfterTakeIds = rightIds.slice(1)
  const leftRemainder = normalizeRemainder(leftIds.length)
  const rightRemainder = normalizeRemainder(rightAfterTakeIds.length)
  const leftRemainderIds = takeTail(leftIds, leftRemainder)
  const rightRemainderIds = takeTail(rightAfterTakeIds, rightRemainder)
  const removedCount = 1 + leftRemainder + rightRemainder
  const availableAfter = availableBefore - removedCount
  assertChangeLegality(changeIndex, availableBefore, removedCount, availableAfter)

  return {
    lineIndex,
    changeIndex,
    availableBefore,
    splitIndex: normalizedSplit,
    leftCount: leftIds.length,
    rightCount: rightIds.length,
    takenOne: 1,
    rightAfterTake: rightAfterTakeIds.length,
    leftRemainder,
    rightRemainder,
    removedCount,
    availableAfter,
    takenOneId,
    leftRemainderIds,
    rightRemainderIds,
  }
}

export function makeManualLine(index: number, changes: ManualChangeRecord[]): ManualLineRecord {
  const lastChange = changes[changes.length - 1]
  const value = (lastChange.availableAfter / 4) as LineValue
  if (!([6, 7, 8, 9] as number[]).includes(value)) {
    throw new Error(`Invalid line value ${value} from ${lastChange.availableAfter}`)
  }

  return {
    index,
    changes,
    value,
    nature: natureByValue[value],
    isYang: value === 7 || value === 9,
    isChanging: value === 6 || value === 9,
  }
}

const debugRemainderIds = (start: number, count: number) =>
  Array.from({ length: count }, (_, index) => start + index)

const makeDebugChange = (
  lineIndex: number,
  changeIndex: number,
  availableBefore: number,
  availableAfter: number,
  splitIndex: number,
  leftRemainder: number,
  rightRemainder: number,
): ManualChangeRecord => {
  const rightCount = availableBefore - splitIndex
  const removedCount = availableBefore - availableAfter

  return {
    lineIndex,
    changeIndex,
    availableBefore,
    splitIndex,
    leftCount: splitIndex,
    rightCount,
    takenOne: 1,
    rightAfterTake: rightCount - 1,
    leftRemainder,
    rightRemainder,
    removedCount,
    availableAfter,
    takenOneId: 1000 + lineIndex * 10 + changeIndex,
    leftRemainderIds: debugRemainderIds(1100 + lineIndex * 20 + changeIndex * 4, leftRemainder),
    rightRemainderIds: debugRemainderIds(1300 + lineIndex * 20 + changeIndex * 4, rightRemainder),
  }
}

const makeDebugChangesForLine = (lineIndex: number, lineValue: (typeof debugLineValues)[number]) => {
  if (lineValue === 9) {
    return [
      makeDebugChange(lineIndex, 1, 49, 44, 23, 3, 1),
      makeDebugChange(lineIndex, 2, 44, 40, 17, 1, 2),
      makeDebugChange(lineIndex, 3, 40, 36, 17, 1, 2),
    ]
  }

  if (lineValue === 8) {
    return [
      makeDebugChange(lineIndex, 1, 49, 40, 24, 4, 4),
      makeDebugChange(lineIndex, 2, 40, 36, 17, 1, 2),
      makeDebugChange(lineIndex, 3, 36, 32, 17, 1, 2),
    ]
  }

  return [
    makeDebugChange(lineIndex, 1, 49, 40, 24, 4, 4),
    makeDebugChange(lineIndex, 2, 40, 32, 20, 4, 3),
    makeDebugChange(lineIndex, 3, 32, 28, 17, 1, 2),
  ]
}

export const makeDebugHexagramFixture = () => {
  const changeRecords = debugLineValues.flatMap((value, index) => makeDebugChangesForLine(index + 1, value))
  const lineRecords: ManualLineRecord[] = debugLineValues.map((value, index) => ({
    index: index + 1,
    changes: changeRecords.filter((change) => change.lineIndex === index + 1),
    value,
    nature: natureByValue[value],
    isYang: value === 7 || value === 9,
    isChanging: value === 9,
  }))

  return {
    question: debugQuestion,
    changeRecords,
    lineRecords,
    result: makeManualHexagram(debugQuestion, lineRecords),
  }
}

export function assertChangeLegality(
  changeIndex: number,
  availableBefore: number,
  removedCount: number,
  availableAfter: number,
) {
  const removedOptions = changeIndex === 1 ? [5, 9] : [4, 8]
  const beforeOptions =
    changeIndex === 1 ? [49] : changeIndex === 2 ? [44, 40] : [40, 36, 32]
  const afterOptions =
    changeIndex === 1 ? [44, 40] : changeIndex === 2 ? [40, 36, 32] : [36, 32, 28, 24]

  if (!beforeOptions.includes(availableBefore)) {
    throw new Error(`Invalid availableBefore ${availableBefore} for change ${changeIndex}`)
  }

  if (!removedOptions.includes(removedCount)) {
    throw new Error(`Invalid removedCount ${removedCount} for change ${changeIndex}`)
  }

  if (!afterOptions.includes(availableAfter)) {
    throw new Error(`Invalid availableAfter ${availableAfter} for change ${changeIndex}`)
  }
}

export function makeManualHexagram(question: string, lines: ManualLineRecord[]): ManualHexagramResult {
  const changedLines = lines.filter((line) => line.isChanging).map((line) => line.index)
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
