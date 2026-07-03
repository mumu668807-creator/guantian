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

const healthPayload = () => {
  const env = getLlmEnv()

  return {
    ok: true,
    provider: env.provider,
    model: env.model,
    hasKey: Boolean(env.apiKey),
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 })
}

export function GET() {
  return json(healthPayload())
}

export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
