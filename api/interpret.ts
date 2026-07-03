import { getLlmEnv } from '../server/env.ts'
import { interpretWithLlm } from '../server/llmClient.ts'

const json = (payload: unknown, init?: ResponseInit) =>
  Response.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  })

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const body = (await request.json()) as { prompt?: unknown }

    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return json({ error: 'prompt is required' }, { status: 400 })
    }

    const env = getLlmEnv()
    const output = await interpretWithLlm(body.prompt, env)

    return json(output)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown LLM proxy error'
    console.error('[llm:function]', message)

    return json({ error: message }, { status: 502 })
  }
}
