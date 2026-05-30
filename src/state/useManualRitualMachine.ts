import { useCallback, useMemo, useRef, useState } from 'react'
import {
  createManualStalks,
  clampSplitIndex,
  makeDebugHexagramFixture,
  makeManualChange,
  makeManualHexagram,
  makeManualLine,
  makeStalk,
  type ManualChangeRecord,
  type ManualHexagramResult,
  type ManualLineRecord,
  type ManualYarrowGroup,
  type ManualYarrowStalk,
} from '../domain/manualDayan'
import { COPY } from '../constants/copy'

export type ManualStep =
  | 'idle'
  | 'awaitingQuestion'
  | 'reserveOne'
  | 'chooseSplit'
  | 'split'
  | 'takeOne'
  | 'countLeft'
  | 'countRight'
  | 'changeComplete'
  | 'lineComplete'
  | 'hexagramComplete'

export type ManualRitualSnapshot = {
  step: ManualStep
  stepLabel: string
  lineIndex: number
  changeIndex: number
  stalks: ManualYarrowStalk[]
  availableCount: number
  lastChange: ManualChangeRecord | null
  changeRecords: ManualChangeRecord[]
  lineRecords: ManualLineRecord[]
  result: ManualHexagramResult | null
  splitHistory: ManualChangeRecord[]
  canChooseSplit: boolean
}

const stepLabels: Record<ManualStep, string> = {
  idle: '请输入所问之事',
  awaitingQuestion: '问题已置于案前',
  reserveOne: '大衍之数五十，其用四十有九',
  chooseSplit: '请选择分草处',
  split: '分而为二',
  takeOne: '右取一，以象三才',
  countLeft: '左堆四四数之',
  countRight: '右堆四四数之',
  changeComplete: '一变已成',
  lineComplete: '三变成一爻',
  hexagramComplete: COPY.hexagramComplete,
}

const automaticDelays: Record<ManualStep, number> = {
  idle: 0,
  awaitingQuestion: 0,
  reserveOne: 1700,
  chooseSplit: 0,
  split: 720,
  takeOne: 760,
  countLeft: 860,
  countRight: 860,
  changeComplete: 780,
  lineComplete: 1080,
  hexagramComplete: 0,
}

const countBatchDelay = 220
const unusedOneId = 50
const reserveOneLiftDelay = 180

const regroup = (
  stalks: ManualYarrowStalk[],
  groups: Partial<Record<ManualYarrowGroup, number[]>>,
) => {
  const groupById = new Map<number, ManualYarrowGroup>()
  const orderById = new Map<number, number>()

  Object.entries(groups).forEach(([group, ids]) => {
    ids?.forEach((id, order) => {
      groupById.set(id, group as ManualYarrowGroup)
      orderById.set(id, order)
    })
  })

  return stalks.map((stalk) => {
    const group = groupById.get(stalk.id) ?? stalk.group
    const order = orderById.get(stalk.id) ?? stalk.order
    return makeStalk(stalk.id, group, order)
  })
}

const availableIdsOf = (stalks: ManualYarrowStalk[]) =>
  stalks
    .filter((stalk) => stalk.group === 'available' || stalk.group === 'left' || stalk.group === 'right')
    .sort((a, b) => a.order - b.order || a.id - b.id)
    .map((stalk) => stalk.id)

const prepareFortyNine = (stalks: ManualYarrowStalk[]) => {
  const availableIds = stalks
    .filter((stalk) => stalk.id !== unusedOneId)
    .map((stalk) => stalk.id)

  return regroup(stalks, {
    unusedOne: [unusedOneId],
    available: availableIds,
  })
}

export function useManualRitualMachine() {
  const [question, setQuestion] = useState('')
  const [step, setStep] = useState<ManualStep>('idle')
  const [lineIndex, setLineIndex] = useState(1)
  const [changeIndex, setChangeIndex] = useState(1)
  const [stalks, setStalks] = useState<ManualYarrowStalk[]>(createManualStalks)
  const [lastChange, setLastChange] = useState<ManualChangeRecord | null>(null)
  const [lineChanges, setLineChanges] = useState<ManualChangeRecord[]>([])
  const [lines, setLines] = useState<ManualLineRecord[]>([])
  const [result, setResult] = useState<ManualHexagramResult | null>(null)
  const [splitHistory, setSplitHistory] = useState<ManualChangeRecord[]>([])
  const runIdRef = useRef(0)
  const timersRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  const schedule = useCallback((callback: () => void, delay: number, runId: number) => {
    const timer = window.setTimeout(() => {
      if (runIdRef.current !== runId) return
      callback()
    }, delay)
    timersRef.current.push(timer)
  }, [])

  const start = useCallback(() => {
    if (!question.trim()) return
    clearTimers()
    runIdRef.current += 1
    const runId = runIdRef.current
    setLineIndex(1)
    setChangeIndex(1)
    setStalks(createManualStalks())
    setLastChange(null)
    setLineChanges([])
    setLines([])
    setResult(null)
    setSplitHistory([])
    setStep('reserveOne')

    schedule(() => {
      setStalks((current) => prepareFortyNine(current))
    }, reserveOneLiftDelay, runId)

    schedule(() => {
      setStep('chooseSplit')
    }, automaticDelays.reserveOne, runId)
  }, [clearTimers, question, schedule])

  const reset = useCallback(() => {
    clearTimers()
    runIdRef.current += 1
    setQuestion('')
    setStep('idle')
    setLineIndex(1)
    setChangeIndex(1)
    setStalks(createManualStalks())
    setLastChange(null)
    setLineChanges([])
    setLines([])
    setResult(null)
    setSplitHistory([])
  }, [clearTimers])

  const completeDebugHexagram = useCallback(() => {
    clearTimers()
    runIdRef.current += 1
    const fixture = makeDebugHexagramFixture()
    setQuestion(fixture.question)
    setStep('hexagramComplete')
    setLineIndex(6)
    setChangeIndex(3)
    setStalks(prepareFortyNine(createManualStalks()))
    setLastChange(fixture.changeRecords.at(-1) ?? null)
    setLineChanges([])
    setLines(fixture.lineRecords)
    setResult(fixture.result)
    setSplitHistory(fixture.changeRecords)
  }, [clearTimers])

  const updateQuestion = useCallback((value: string) => {
    setQuestion(value)
    setStep(value.trim() ? 'awaitingQuestion' : 'idle')
  }, [])

  const chooseSplit = useCallback(
    (splitIndex: number) => {
      if (step !== 'chooseSplit') return

      const availableIds = availableIdsOf(stalks)
      const normalizedSplit = clampSplitIndex(splitIndex, availableIds.length)

      const change = makeManualChange(availableIds, normalizedSplit, lineIndex, changeIndex)
      const leftIds = availableIds.slice(0, normalizedSplit)
      const rightIds = availableIds.slice(normalizedSplit)
      const leftIdsToCount = leftIds.slice(0, leftIds.length - change.leftRemainder)
      const rightIdsToCount = rightIds.slice(1, rightIds.length - change.rightRemainder)
      const leftBatchCount = Math.ceil(leftIdsToCount.length / 4)
      const rightBatchCount = Math.ceil(rightIdsToCount.length / 4)
      const afterTake = automaticDelays.split + automaticDelays.takeOne
      const afterLeftCount = afterTake + Math.max(1, leftBatchCount) * countBatchDelay + automaticDelays.countLeft
      const afterRightCount = afterLeftCount + Math.max(1, rightBatchCount) * countBatchDelay + automaticDelays.countRight
      const runId = runIdRef.current
      setLastChange(change)
      setSplitHistory((current) => [...current, change])
      setStalks(regroup(stalks, { left: leftIds, right: rightIds }))
      setStep('split')

      schedule(() => {
        setStalks((current) => regroup(current, { takenOne: [change.takenOneId] }))
        setStep('takeOne')
      }, automaticDelays.split, runId)

      schedule(() => {
        setStep('countLeft')
      }, afterTake, runId)

      for (let batch = 1; batch <= leftBatchCount; batch += 1) {
        schedule(() => {
          setStalks((current) => regroup(current, { countedLeft: leftIdsToCount.slice(0, batch * 4) }))
        }, afterTake + batch * countBatchDelay, runId)
      }

      schedule(() => {
        setStep('countRight')
      }, afterLeftCount, runId)

      for (let batch = 1; batch <= rightBatchCount; batch += 1) {
        schedule(() => {
          setStalks((current) => regroup(current, { countedRight: rightIdsToCount.slice(0, batch * 4) }))
        }, afterLeftCount + batch * countBatchDelay, runId)
      }

      schedule(() => {
        const spentIds = [
          change.takenOneId,
          ...change.leftRemainderIds,
          ...change.rightRemainderIds,
        ]
        const remainingIds = availableIds.filter((id) => !spentIds.includes(id)).slice(0, change.availableAfter)
        setStalks((current) =>
          regroup(current, {
            remainder: spentIds,
            available: remainingIds,
          }),
        )
        setStep('changeComplete')
      }, afterRightCount, runId)

      schedule(() => {
        const spentIds = [
          change.takenOneId,
          ...change.leftRemainderIds,
          ...change.rightRemainderIds,
        ]
        const remainingIds = availableIds.filter((id) => !spentIds.includes(id)).slice(0, change.availableAfter)
        const nextLineChanges = [...lineChanges, change]

        if (changeIndex < 3) {
          setLineChanges(nextLineChanges)
          setChangeIndex((current) => current + 1)
          setStalks((current) =>
            regroup(current, {
              spent: spentIds,
              available: remainingIds,
            }),
          )
          setStep('chooseSplit')
          return
        }

        const line = makeManualLine(lineIndex, nextLineChanges)
        const nextLines = [...lines, line]
        setLineChanges([])
        setLines(nextLines)
        setStep('lineComplete')

        schedule(() => {
          if (lineIndex < 6) {
            setLineIndex((current) => current + 1)
            setChangeIndex(1)
            setStalks(prepareFortyNine(createManualStalks()))
            setStep('chooseSplit')
            return
          }

          setResult(makeManualHexagram(question.trim(), nextLines))
          setStep('hexagramComplete')
        }, automaticDelays.lineComplete, runId)
      }, afterRightCount + automaticDelays.changeComplete, runId)
    },
    [changeIndex, lineChanges, lineIndex, lines, question, schedule, stalks, step],
  )

  const snapshot: ManualRitualSnapshot = useMemo(
    () => ({
      step,
      stepLabel: stepLabels[step],
      lineIndex,
      changeIndex,
      stalks,
      availableCount: availableIdsOf(stalks).length,
      lastChange,
      changeRecords: splitHistory,
      lineRecords: lines,
      result,
      splitHistory,
      canChooseSplit: step === 'chooseSplit',
    }),
    [changeIndex, lastChange, lineIndex, lines, result, splitHistory, stalks, step],
  )

  return {
    question,
    setQuestion: updateQuestion,
    start,
    reset,
    chooseSplit,
    completeDebugHexagram,
    snapshot,
  }
}
