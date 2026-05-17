import type { AIProvider } from './provider'

const getInterpretEndpoint = () => {
  if (!import.meta.env.PROD) return '/api/interpret'

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')
  if (!apiBaseUrl) {
    throw new Error('Missing VITE_API_BASE_URL for production interpretation API')
  }

  return `${apiBaseUrl}/api/interpret`
}

export const localApiProvider: AIProvider = {
  async interpret(prompt) {
    const response = await fetch(getInterpretEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      throw new Error(`Local LLM proxy failed: ${response.status}`)
    }

    const output = (await response.json()) as { markdown?: unknown }
    if (typeof output.markdown !== 'string' || !output.markdown.trim()) {
      throw new Error('Local LLM proxy returned an empty interpretation')
    }

    return { markdown: output.markdown }
  },
}
