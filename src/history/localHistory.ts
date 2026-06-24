import { getHexagramByBinary } from '../domain/hexagramLookup'
import type { ManualHexagramResult } from '../domain/manualDayan'

export type LocalHistoryLineSummary = {
  index: number
  value: number
  isYang: boolean
  isChanging: boolean
  nature: string
}

export type LocalHistoryRecord = {
  id: string
  createdAt: string
  question: string
  originalHexagram: {
    name: string
    binary: string
  }
  changedHexagram: {
    name: string
    binary: string
  }
  movingLines: number[]
  interpretationText: string
  lines: LocalHistoryLineSummary[]
  note?: string
}

const historyStorageKey = 'guantian:history:v1'
const maxHistoryRecords = 12

const isHistoryRecord = (value: unknown): value is LocalHistoryRecord => {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<LocalHistoryRecord>
  return (
    typeof record.id === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.question === 'string' &&
    typeof record.interpretationText === 'string' &&
    Array.isArray(record.movingLines) &&
    Array.isArray(record.lines) &&
    (typeof record.note === 'undefined' || typeof record.note === 'string')
  )
}

export function readLocalHistory(): LocalHistoryRecord[] {
  try {
    const raw = window.localStorage.getItem(historyStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isHistoryRecord).slice(0, maxHistoryRecords)
  } catch (error) {
    console.warn('Failed to read local guantian history.', error)
    return []
  }
}

export function saveLocalHistoryRecord(record: LocalHistoryRecord) {
  const nextRecords = [
    record,
    ...readLocalHistory().filter((item) => item.id !== record.id),
  ].slice(0, maxHistoryRecords)
  window.localStorage.setItem(historyStorageKey, JSON.stringify(nextRecords))
  return nextRecords
}

export function updateLocalHistoryRecordNote(id: string, note: string): LocalHistoryRecord[] {
  const normalizedNote = note.trim().slice(0, 140)
  const nextRecords = readLocalHistory().map((record) => {
    if (record.id !== id) return record
    if (!normalizedNote) {
      const nextRecord = { ...record }
      delete nextRecord.note
      return nextRecord
    }
    return { ...record, note: normalizedNote }
  })
  window.localStorage.setItem(historyStorageKey, JSON.stringify(nextRecords))
  return nextRecords
}

export function makeLocalHistoryRecord(
  result: ManualHexagramResult,
  interpretationText: string,
): LocalHistoryRecord {
  const original = getHexagramByBinary(result.primaryBinary)
  const changed = getHexagramByBinary(result.changedBinary)
  const createdAt = new Date().toISOString()

  return {
    id: `${createdAt}-${result.primaryBinary}-${result.changedBinary}`,
    createdAt,
    question: result.question,
    originalHexagram: {
      name: original?.name ?? '未录入卦',
      binary: result.primaryBinary,
    },
    changedHexagram: {
      name: changed?.name ?? '未录入卦',
      binary: result.changedBinary,
    },
    movingLines: result.changedLines,
    interpretationText,
    lines: result.lines.map((line) => ({
      index: line.index,
      value: line.value,
      isYang: line.isYang,
      isChanging: line.isChanging,
      nature: line.nature,
    })),
  }
}
