import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { getLlmEnv } from './env.ts'
import { interpretWithLlm } from './llmClient.ts'

const readBody = async (request: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })

const sendJson = (response: ServerResponse, statusCode: number, payload: unknown, sendBody = true) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN?.trim() || '*',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(sendBody ? JSON.stringify(payload) : undefined)
}

const env = getLlmEnv()

const getPathname = (request: IncomingMessage) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  return url.pathname.replace(/\/+$/, '') || '/'
}

const server = createServer(async (request, response) => {
  const pathname = getPathname(request)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if ((request.method === 'GET' || request.method === 'HEAD') && pathname === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      provider: env.provider,
      model: env.model,
      hasKey: Boolean(env.apiKey),
    }, request.method !== 'HEAD')
    return
  }

  if (request.method !== 'POST' || pathname !== '/api/interpret') {
    sendJson(response, 404, { error: 'Not found' })
    return
  }

  try {
    const body = JSON.parse(await readBody(request)) as { prompt?: unknown }
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      sendJson(response, 400, { error: 'prompt is required' })
      return
    }

    const output = await interpretWithLlm(body.prompt, env)
    sendJson(response, 200, output)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown LLM proxy error'
    console.error(`[llm:${env.provider}]`, message)
    sendJson(response, 502, { error: message })
  }
})

server.listen(env.port, '0.0.0.0', () => {
  console.log(`LLM proxy listening on 0.0.0.0:${env.port}`)
  console.log(`LLM provider: ${env.provider}`)
})

server.on('error', (error) => {
  console.error('LLM proxy server error:', error)
  process.exitCode = 1
})

process.on('SIGTERM', () => {
  console.log('LLM proxy received SIGTERM, shutting down')
  server.close(() => {
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('LLM proxy received SIGINT, shutting down')
  server.close(() => {
    process.exit(0)
  })
})
