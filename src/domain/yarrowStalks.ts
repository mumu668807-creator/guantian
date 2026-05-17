import type { ChangeRecord } from './dayan'
import type { RitualPhase } from './ritualTimeline'

export type Vec3Tuple = [number, number, number]
export type YarrowGroup =
  | 'center'
  | 'left'
  | 'right'
  | 'takenOne'
  | 'countedLeft'
  | 'countedRight'
  | 'remainder'
  | 'removed'

export type YarrowStalk = {
  id: number
  position: Vec3Tuple
  rotation: Vec3Tuple
  group: YarrowGroup
}

export type YarrowPlayback = {
  phase: RitualPhase
  change: ChangeRecord | null
  splitVisibleCount: number
  countLeftBatches: number
  countRightBatches: number
}

const STALK_COUNT = 49
const COUNTED_BATCH_SIZE = 4

const baseStalks = Array.from({ length: STALK_COUNT }, (_, index) => ({
  id: index + 1,
  lean: ((index % 7) - 3) * 0.018,
}))

const gridPosition = (
  centerX: number,
  centerZ: number,
  order: number,
  columns: number,
  spacingX: number,
  spacingZ: number,
): Vec3Tuple => {
  const column = order % columns
  const row = Math.floor(order / columns)
  return [centerX + (column - (columns - 1) / 2) * spacingX, 0.12, centerZ + row * spacingZ]
}

const pilePosition = (group: YarrowGroup, order: number): Vec3Tuple => {
  if (group === 'center') return gridPosition(0, -1.18, order, 7, 0.032, 0.034)
  if (group === 'left') return gridPosition(-0.52, -1.2, order, 7, 0.038, 0.038)
  if (group === 'right') return gridPosition(0.52, -1.2, order, 7, 0.038, 0.038)
  if (group === 'takenOne') return [0.78, 0.13, -1.72]
  if (group === 'countedLeft') return gridPosition(-1.08, -1.5, order, 4, 0.034, 0.038)
  if (group === 'countedRight') return gridPosition(1.08, -1.5, order, 4, 0.034, 0.038)
  if (group === 'remainder') return gridPosition(0, -1.72, order, 8, 0.052, 0.04)
  return gridPosition(0, -1.82, order, 10, 0.048, 0.036)
}

const pileRotation = (id: number, group: YarrowGroup): Vec3Tuple => {
  const sideLean = group === 'left' || group === 'countedLeft' ? -0.12 : group === 'right' || group === 'countedRight' ? 0.12 : 0
  return [1.02 + ((id % 5) - 2) * 0.012, sideLean, ((id % 9) - 4) * 0.018]
}

const build = (
  seed: { id: number; lean: number },
  group: YarrowGroup,
  order: number,
): YarrowStalk => ({
  id: seed.id,
  group,
  position: pilePosition(group, Math.max(order, 0)),
  rotation: group === 'center' ? [1.02 + seed.lean, 0, seed.lean] : pileRotation(seed.id, group),
})

function assignFromPlayback(playback: YarrowPlayback): YarrowStalk[] {
  const { change, phase } = playback
  if (!change) return makeInitialStalks()

  const previousRemoved = STALK_COUNT - change.startCount
  const activeStart = previousRemoved + 1
  const leftStart = activeStart
  const leftEnd = previousRemoved + change.leftPile
  const rightStart = leftEnd + 1
  const rightTakenId = rightStart
  const rightCountStart = rightStart + 1
  const rightEnd = previousRemoved + change.startCount

  const leftCountedTotal = change.leftPile - change.leftRemainder
  const rightCountedTotal = change.rightAfterTake - change.rightRemainder
  const visibleSplit = Math.min(change.startCount, playback.splitVisibleCount)
  const visibleLeft = Math.min(change.leftPile, visibleSplit)
  const visibleRight = Math.max(0, visibleSplit - visibleLeft)
  const leftCountedVisible = Math.min(leftCountedTotal, playback.countLeftBatches * COUNTED_BATCH_SIZE)
  const rightCountedVisible = Math.min(rightCountedTotal, playback.countRightBatches * COUNTED_BATCH_SIZE)
  const leftRemainderVisible = phase === 'pauseAfterCountLeft' || phase === 'countRightByFour' || phase === 'pauseAfterCountRight' || phase === 'changeComplete' || phase === 'pauseBeforeNextChange' || phase === 'lineComplete' || phase === 'pauseBeforeNextLine' || phase === 'hexagramComplete'
  const rightRemainderVisible = phase === 'pauseAfterCountRight' || phase === 'changeComplete' || phase === 'pauseBeforeNextChange' || phase === 'lineComplete' || phase === 'pauseBeforeNextLine' || phase === 'hexagramComplete'

  return baseStalks.map((seed) => {
    if (seed.id <= previousRemoved) return build(seed, 'removed', seed.id - 1)
    if (seed.id < activeStart || seed.id > rightEnd) return build(seed, 'center', seed.id - 1)

    if (phase === 'beginRitual') return build(seed, 'center', seed.id - activeStart)

    if (seed.id >= leftStart && seed.id <= leftEnd) {
      const order = seed.id - leftStart
      if (phase === 'splitToLeftRight' && order >= visibleLeft) return build(seed, 'center', order)

      if (order < leftCountedVisible) return build(seed, 'countedLeft', order)
      if (leftRemainderVisible && order >= leftCountedTotal) {
        return build(seed, 'remainder', seed.id - leftCountedTotal - previousRemoved - 1)
      }

      return build(seed, 'left', order - leftCountedVisible)
    }

    if (seed.id === rightTakenId && phase !== 'splitToLeftRight' && phase !== 'pauseAfterSplit') {
      return build(seed, 'takenOne', change.leftRemainder)
    }

    if (seed.id >= rightStart && seed.id <= rightEnd) {
      const splitOrder = seed.id - rightStart
      if (phase === 'splitToLeftRight' && splitOrder >= visibleRight) return build(seed, 'center', change.leftPile + splitOrder)

      if (seed.id >= rightCountStart) {
        const countOrder = seed.id - rightCountStart
        if (countOrder < rightCountedVisible) return build(seed, 'countedRight', countOrder)
        if (rightRemainderVisible && countOrder >= rightCountedTotal) {
          return build(seed, 'remainder', change.leftRemainder + 1 + countOrder - rightCountedTotal)
        }
        return build(seed, 'right', Math.max(0, countOrder - rightCountedVisible))
      }

      return build(seed, 'right', splitOrder)
    }

    return build(seed, 'center', seed.id - 1)
  })
}

export function makeInitialStalks(): YarrowStalk[] {
  return baseStalks.map((seed, index) => build(seed, 'center', index))
}

export function makeStalksForPlayback(playback: YarrowPlayback): YarrowStalk[] {
  if (playback.phase === 'idle' || playback.phase === 'questionReady') return makeInitialStalks()
  return assignFromPlayback(playback)
}

export function countStalkGroups(stalks: YarrowStalk[]) {
  return stalks.reduce(
    (counts, stalk) => {
      counts[stalk.group] += 1
      return counts
    },
    {
      center: 0,
      left: 0,
      right: 0,
      takenOne: 0,
      countedLeft: 0,
      countedRight: 0,
      remainder: 0,
      removed: 0,
    } satisfies Record<YarrowGroup, number>,
  )
}
