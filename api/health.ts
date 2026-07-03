const json = (payload: unknown, init?: ResponseInit) =>
  Response.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  })

const getLlmEnv = () => ({
  provider: process.env.LLM_PROVIDER?.trim() || 'custom',
  apiKey: process.env.LLM_API_KEY?.trim() || '',
  baseUrl: (process.env.LLM_BASE_URL?.trim() || '').replace(/\/+$/, ''),
  model: process.env.LLM_MODEL?.trim() || '',
})

export default function handler(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  const env = getLlmEnv()
  const payload = {
    ok: true,
    provider: env.provider,
    model: env.model,
    hasKey: Boolean(env.apiKey),
  }

  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return json(payload)
}
