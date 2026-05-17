export function renderInterpretationMarkdown(markdown: string) {
  return markdown.split('\n').map((line, index) => {
    const key = `${index}-${line}`

    if (line.startsWith('# ')) return <h2 key={key}>{line.slice(2)}</h2>
    if (line.startsWith('## ')) return <h3 key={key}>{line.slice(3)}</h3>
    if (!line.trim()) return <br key={key} />
    return <p key={key}>{line}</p>
  })
}
