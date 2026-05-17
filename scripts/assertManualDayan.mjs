import {
  createManualStalks,
  makeDebugHexagramFixture,
  makeManualChange,
  makeManualLine,
  normalizeRemainder,
  splitIndexFromStalkPositions,
} from '../src/domain/manualDayan.ts'

const ids = (count) => Array.from({ length: count }, (_, index) => index + 1)

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const assertIncludes = (values, value, message) => {
  assert(values.includes(value), `${message}: got ${value}`)
}

const visibleStalks = createManualStalks(50).filter((stalk) => stalk.id !== 50)
const secondGapX = (visibleStalks[1].position.x + visibleStalks[2].position.x) / 2
const fortySeventhGapX = (visibleStalks[46].position.x + visibleStalks[47].position.x) / 2
assert(splitIndexFromStalkPositions(visibleStalks, secondGapX) === 2, '点击第 2/3 根之间应分为 2 / 47')
assert(
  splitIndexFromStalkPositions(visibleStalks, fortySeventhGapX) === 47,
  '点击第 47/48 根之间应分为 47 / 2',
)

for (let split = 1; split <= 48; split += 1) {
  const change = makeManualChange(ids(49), split, 1, 1)
  assertIncludes([5, 9], change.removedCount, '初变去策只能是 5 或 9')
  assertIncludes([44, 40], change.availableAfter, '初变剩余只能是 44 或 40')
  assert(
    change.rightRemainder === normalizeRemainder(change.rightAfterTake),
    '右余必须用 rightAfterTake 计算',
  )
}

for (const availableBefore of [44, 40]) {
  for (let split = 1; split < availableBefore; split += 1) {
    const change = makeManualChange(ids(availableBefore), split, 1, 2)
    assertIncludes([4, 8], change.removedCount, '二变去策只能是 4 或 8')
    assertIncludes([40, 36, 32], change.availableAfter, '二变剩余只能是 40、36、32')
    assert(
      change.rightRemainder === normalizeRemainder(change.rightAfterTake),
      '二变右余必须用 rightAfterTake 计算',
    )
  }
}

for (const availableBefore of [40, 36, 32]) {
  for (let split = 1; split < availableBefore; split += 1) {
    const change = makeManualChange(ids(availableBefore), split, 1, 3)
    assertIncludes([4, 8], change.removedCount, '三变去策只能是 4 或 8')
    assertIncludes([36, 32, 28, 24], change.availableAfter, '三变剩余只能是 36、32、28、24')
    assert(
      change.rightRemainder === normalizeRemainder(change.rightAfterTake),
      '三变右余必须用 rightAfterTake 计算',
    )
  }
}

const changeRecords = []
const lineRecords = []

for (let lineIndex = 1; lineIndex <= 6; lineIndex += 1) {
  let availableIds = ids(49)
  const lineChanges = []
  assert(availableIds.length === 49, `第 ${lineIndex} 爻开始必须重置为 49`)

  for (let changeIndex = 1; changeIndex <= 3; changeIndex += 1) {
    const split = Math.max(1, Math.floor(availableIds.length / 2) - ((lineIndex + changeIndex) % 3))
    const change = makeManualChange(availableIds, split, lineIndex, changeIndex)
    changeRecords.push(change)
    lineChanges.push(change)
    availableIds = ids(change.availableAfter)
  }

  const finalAvailableCount = availableIds.length
  assertIncludes([24, 28, 32, 36], finalAvailableCount, '每爻最终剩余只能是 24、28、32、36')
  const line = makeManualLine(lineIndex, lineChanges)
  assertIncludes([6, 7, 8, 9], line.value, 'lineValue 只能是 6、7、8、9')
  lineRecords.push(line)
}

assert(changeRecords.length === 18, `changeRecords.length 应为 18，实际 ${changeRecords.length}`)
assert(lineRecords.length === 6, `lineRecords.length 应为 6，实际 ${lineRecords.length}`)
assert(lineRecords[1].index === 2, '第一爻后必须进入第二爻')

const debugFixture = makeDebugHexagramFixture()
assert(debugFixture.changeRecords.length === 18, 'Debug 测试卦应填充 18 条 changeRecords')
assert(debugFixture.lineRecords.length === 6, 'Debug 测试卦应填充 6 条 lineRecords')
assert(debugFixture.result.question === '什么事', 'Debug 测试卦问题应固定为“什么事”')
assert(debugFixture.result.primaryBinary === '111010', `Debug 本卦应为需卦 111010，实际 ${debugFixture.result.primaryBinary}`)
assert(debugFixture.result.changedBinary === '111000', `Debug 之卦应为泰卦 111000，实际 ${debugFixture.result.changedBinary}`)
assert(debugFixture.result.changedLines.join(',') === '5', 'Debug 测试卦应为第 5 爻动')

console.log('manualDayan assertions passed')
