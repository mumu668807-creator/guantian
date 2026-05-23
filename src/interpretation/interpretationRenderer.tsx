export function renderInterpretationMarkdown(markdown: string) {
  return markdown.split('\n').map((line, index) => {
    const cleanLine = line.replace(/\*/g, '')
    const key = `${index}-${cleanLine}`

    if (cleanLine.startsWith('# ')) return <h2 key={key}>{cleanLine.slice(2)}</h2>
    if (cleanLine.startsWith('## ')) return <h3 key={key}>{cleanLine.slice(3)}</h3>
    if (!cleanLine.trim()) return <br key={key} />
    return <p key={key}>{cleanLine}</p>
  })
}
