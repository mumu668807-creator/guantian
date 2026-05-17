import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type LlmEnv = {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  port: number
}

const envPath = resolve(process.cwd(), '.env')

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex < 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}

export function getLlmEnv(): LlmEnv {
  return {
    provider: process.env.LLM_PROVIDER?.trim() || 'custom',
    apiKey: process.env.LLM_API_KEY?.trim() || '',
    baseUrl: (process.env.LLM_BASE_URL?.trim() || '').replace(/\/+$/, ''),
    model: process.env.LLM_MODEL?.trim() || '',
    port: Number(process.env.PORT || process.env.LLM_SERVER_PORT || 8787),
  }
}
