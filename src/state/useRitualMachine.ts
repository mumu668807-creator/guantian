import { useCallback, useEffect, useMemo, useState } from 'react'
import { castHexagram, type ChangeRecord, type HexagramResult } from '../domain/dayan'
import { phaseDurations, phaseLabels, type RitualPhase } from '../domain/ritualTimeline'
import {
  countStalkGroups,
  makeStalksForPlayback,
  type YarrowGroup,
  type YarrowStalk,
} from '../domain/yarrowStalks'

export type { RitualPhase } from '../domain/ritualTimeline'

export type RitualSnapshot = {
  phase: RitualPhase
  lineIndex: number
  changeIndex: number
  stepLabel: string
  result: HexagramResult | null
  isRunning: boolean
  progress: number
  currentChange: ChangeRecord | null
  stalks: YarrowStalk[]
  groupCounts: Record<YarrowGroup, number>
  countBatchIndex: number
  countBatchTotal: number
  manualSplitMode: boolean
}

type UseRitualOptions = {
  manualSplitMode?: boolean
}

const changeProgressBase = (lineIndex: number, changeIndex: number) =>
  (lineIndex - 1) * 3 + (changeIndex - 1)

export function useRitualMachine(options: UseRitualOptions = {}) {
  const manualSplitMode = options.manualSplitMode ?? false
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<HexagramResult | null>(null)
  const [phase, setPhase] = useState<RitualPhase>('idle')
  const [lineIndex, setLineIndex] = useState(0)
  const [changeIndex, setChangeIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [splitVisibleCount, setSplitVisibleCount] = useState(0)
  const [countLeftBatches, setCountLeftBatches] = useState(0)
  const [countRightBatches, setCountRightBatches] = useState(0)

  const currentChange = useMemo(() => {
    if (!result || lineIndex < 1 || changeIndex < 1) return null
    return result.lines[lineIndex - 1]?.changes[changeIndex - 1] ?? null
  }, [changeIndex, lineIndex, result])

  const startSplit = useCallback(() => {
    setSplitVisibleCount(0)
    setCountLeftBatches(0)
    setCountRightBatches(0)
    setPhase('splitToLeftRight')
  }, [])

  const start = useCallback(() => {
    const normalized = question.trim()
    if (!normalized || isRunning) return

    setResult(castHexagram(normalized))
    setLineIndex(1)
    setChangeIndex(1)
    setSplitVisibleCount(0)
    setCountLeftBatches(0)
    setCountRightBatches(0)
    setPhase('beginRitual')
    setIsRunning(true)
  }, [isRunning, question])

  const updateQuestion = useCallback(
    (value: string) => {
      setQuestion(value)
      if (!isRunning && !result) setPhase(value.trim() ? 'questionReady' : 'idle')
    },
    [isRunning, result],
  )

  const onUserChooseSplit = useCallback((leftCount: number) => {
    // Reserved manual entry point. The automatic timeline still owns the split in MVP 0.3.
    void leftCount
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setPhase(question.trim() ? 'questionReady' : 'idle')
    setLineIndex(0)
    setChangeIndex(0)
    setSplitVisibleCount(0)
    setCountLeftBatches(0)
    setCountRightBatches(0)
    setIsRunning(false)
  }, [question])

  useEffect(() => {
    if (!isRunning || !currentChange) return

    if (phase === 'beginRitual') {
      const timer = window.setTimeout(startSplit, phaseDurations.beginRitual)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'splitToLeftRight') {
      if (splitVisibleCount >= currentChange.startCount) {
        const timer = window.setTimeout(() => setPhase('pauseAfterSplit'), 250)
        return () => window.clearTimeout(timer)
      }

      const stepMs = Math.max(58, Math.floor(phaseDurations.splitToLeftRight / currentChange.startCount))
      const timer = window.setTimeout(() => {
        setSplitVisibleCount((current) => Math.min(current + 1, currentChange.startCount))
      }, stepMs)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'pauseAfterSplit') {
      const timer = window.setTimeout(() => setPhase('takeOneFromRight'), phaseDurations.pauseAfterSplit)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'takeOneFromRight') {
      const timer = window.setTimeout(() => setPhase('pauseAfterTakeOne'), phaseDurations.takeOneFromRight)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'pauseAfterTakeOne') {
      const timer = window.setTimeout(() => {
        setCountLeftBatches(0)
        setPhase('countLeftByFour')
      }, phaseDurations.pauseAfterTakeOne)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'countLeftByFour') {
      const total = Math.floor((currentChange.leftPile - currentChange.leftRemainder) / 4)
      const timer = window.setTimeout(() => {
        if (countLeftBatches < total) {
          setCountLeftBatches((current) => current + 1)
        } else {
          setPhase('pauseAfterCountLeft')
        }
      }, phaseDurations.countLeftByFour)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'pauseAfterCountLeft') {
      const timer = window.setTimeout(() => {
        setCountRightBatches(0)
        setPhase('countRightByFour')
      }, phaseDurations.pauseAfterCountLeft)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'countRightByFour') {
      const total = Math.floor((currentChange.rightAfterTake - currentChange.rightRemainder) / 4)
      const timer = window.setTimeout(() => {
        if (countRightBatches < total) {
          setCountRightBatches((current) => current + 1)
        } else {
          setPhase('pauseAfterCountRight')
        }
      }, phaseDurations.countRightByFour)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'pauseAfterCountRight') {
      const timer = window.setTimeout(() => setPhase('changeComplete'), phaseDurations.pauseAfterCountRight)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'changeComplete') {
      const timer = window.setTimeout(() => {
        if (changeIndex < 3) {
          setPhase('pauseBeforeNextChange')
        } else {
          setPhase('lineComplete')
        }
      }, phaseDurations.changeComplete)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'pauseBeforeNextChange') {
      const timer = window.setTimeout(() => {
        setChangeIndex((current) => current + 1)
        startSplit()
      }, phaseDurations.pauseBeforeNextChange)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'lineComplete') {
      const timer = window.setTimeout(() => {
        if (lineIndex < 6) {
          setPhase('pauseBeforeNextLine')
        } else {
          setPhase('hexagramComplete')
          setIsRunning(false)
        }
      }, phaseDurations.lineComplete)
      return () => window.clearTimeout(timer)
    }

    if (phase === 'pauseBeforeNextLine') {
      const timer = window.setTimeout(() => {
        setLineIndex((current) => current + 1)
        setChangeIndex(1)
        setSplitVisibleCount(0)
        setCountLeftBatches(0)
        setCountRightBatches(0)
        setPhase('beginRitual')
      }, phaseDurations.pauseBeforeNextLine)
      return () => window.clearTimeout(timer)
    }
  }, [
    changeIndex,
    countLeftBatches,
    countRightBatches,
    currentChange,
    isRunning,
    lineIndex,
    phase,
    splitVisibleCount,
    startSplit,
  ])

  const stalks = useMemo(
    () =>
      makeStalksForPlayback({
        phase,
        change: currentChange,
        splitVisibleCount,
        countLeftBatches,
        countRightBatches,
      }),
    [countLeftBatches, countRightBatches, currentChange, phase, splitVisibleCount],
  )

  const groupCounts = useMemo(() => countStalkGroups(stalks), [stalks])

  const countBatchTotal = useMemo(() => {
    if (!currentChange) return 0
    if (phase === 'countLeftByFour') {
      return Math.floor((currentChange.leftPile - currentChange.leftRemainder) / 4)
    }
    if (phase === 'countRightByFour') {
      return Math.floor((currentChange.rightAfterTake - currentChange.rightRemainder) / 4)
    }
    return 0
  }, [currentChange, phase])

  const countBatchIndex =
    phase === 'countLeftByFour' ? countLeftBatches : phase === 'countRightByFour' ? countRightBatches : 0

  const progress = useMemo(() => {
    if (phase === 'hexagramComplete') return 1
    if (!isRunning || lineIndex === 0 || changeIndex === 0) return 0
    return Math.min(0.99, changeProgressBase(lineIndex, changeIndex) / 18)
  }, [changeIndex, isRunning, lineIndex, phase])

  const snapshot: RitualSnapshot = {
    phase,
    lineIndex,
    changeIndex,
    stepLabel: phaseLabels[phase],
    result,
    isRunning,
    progress,
    currentChange,
    stalks,
    groupCounts,
    countBatchIndex,
    countBatchTotal,
    manualSplitMode,
  }

  return {
    question,
    setQuestion: updateQuestion,
    start,
    reset,
    onUserChooseSplit,
    snapshot,
  }
}
