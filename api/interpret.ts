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

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const interpretWithLlm = async (prompt: string, env: ReturnType<typeof getLlmEnv>) => {
  if (!env.apiKey) throw new Error('Missing required environment variable: LLM_API_KEY')
  if (!env.baseUrl) throw new Error('Missing required environment variable: LLM_BASE_URL')
  if (!env.model) throw new Error('Missing required environment variable: LLM_MODEL')

  const response = await fetch(`${env.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${env.provider} LLM request failed: ${response.status} ${errorText.slice(0, 300)}`)
  }

  const data = (await response.json()) as ChatCompletionResponse
  const markdown = data.choices?.[0]?.message?.content?.trim()

  if (!markdown) {
    throw new Error(`${env.provider} LLM response did not include choices[0].message.content`)
  }

  return { markdown }
}

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
