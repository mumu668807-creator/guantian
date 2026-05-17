import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { readdirSync, statSync } from 'node:fs'

const roots = ['src', 'scripts']
const extensions = new Set(['.ts', '.tsx', '.mjs'])
const forbidden = [
  ['此', '图', '照', '见'].join(''),
  ['此', '图', '照', '荐'].join(''),
  ['此', '挂', '照', '见'].join(''),
  ['此', '挂', '照', '荐'].join(''),
  ['此', '卦', '照', '荐'].join(''),
  ['解', '卦'].join(''),
  ['意', '义'].join(''),
]

const files = []

function walk(path) {
  for (const entry of readdirSync(path)) {
    const next = join(path, entry)
    const stat = statSync(next)
    if (stat.isDirectory()) {
      walk(next)
      continue
    }
    if (extensions.has(extname(next))) files.push(next)
  }
}

for (const root of roots) walk(root)

const failures = []

for (const file of files) {
  if (file.endsWith('scripts/assertCopy.mjs')) continue

  const text = readFileSync(file, 'utf8')
  for (const word of forbidden) {
    if (text.includes(word)) failures.push(`${file}: ${word}`)
  }
}

if (failures.length) {
  console.error(`文案防回退检查失败：\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('copy assertions passed')
