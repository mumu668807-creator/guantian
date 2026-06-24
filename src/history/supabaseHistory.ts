import { supabase } from '../auth/supabaseClient'
import type { LocalHistoryLineSummary, LocalHistoryRecord } from './localHistory'

const maxHistoryRecords = 12

type HexagramSummary = LocalHistoryRecord['originalHexagram']

type SupabaseHistoryRow = {
  id: string
  user_id: string
  created_at: string
  question: string
  original_hexagram: HexagramSummary
  changed_hexagram: HexagramSummary
  moving_lines: number[]
  interpretation_text: string
  lines: LocalHistoryLineSummary[]
  note: string | null
}

const toSupabaseRow = (record: LocalHistoryRecord, userId: string): SupabaseHistoryRow => ({
  id: record.id,
  user_id: userId,
  created_at: record.createdAt,
  question: record.question,
  original_hexagram: record.originalHexagram,
  changed_hexagram: record.changedHexagram,
  moving_lines: record.movingLines,
  interpretation_text: record.interpretationText,
  lines: record.lines,
  note: record.note ?? null,
})

const fromSupabaseRow = (row: SupabaseHistoryRow): LocalHistoryRecord => ({
  id: row.id,
  createdAt: row.created_at,
  question: row.question,
  originalHexagram: row.original_hexagram,
  changedHexagram: row.changed_hexagram,
  movingLines: row.moving_lines,
  interpretationText: row.interpretation_text,
  lines: row.lines,
  note: row.note ?? undefined,
})

export async function readSupabaseHistory(): Promise<LocalHistoryRecord[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('guantian_readings')
    .select('id,user_id,created_at,question,original_hexagram,changed_hexagram,moving_lines,interpretation_text,lines,note')
    .order('created_at', { ascending: false })
    .limit(maxHistoryRecords)
    .returns<SupabaseHistoryRow[]>()

  if (error) throw error
  return (data ?? []).map(fromSupabaseRow)
}

export async function saveSupabaseHistoryRecord(
  record: LocalHistoryRecord,
  userId: string,
): Promise<LocalHistoryRecord[]> {
  if (!supabase) return []

  const { error } = await supabase
    .from('guantian_readings')
    .upsert(toSupabaseRow(record, userId), { onConflict: 'id' })

  if (error) throw error
  return readSupabaseHistory()
}

export async function updateSupabaseHistoryNote(id: string, note: string): Promise<void> {
  if (!supabase) return

  const normalizedNote = note.trim().slice(0, 140)
  const { error } = await supabase
    .from('guantian_readings')
    .update({ note: normalizedNote || null })
    .eq('id', id)

  if (error) throw error
}
