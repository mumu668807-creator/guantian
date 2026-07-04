import type { LlmEnv } from './env.ts'

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export async function interpretWithLlm(prompt: string, env: LlmEnv) {
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
      temperature: 1.0,
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
