import { describeLine } from '../domain/dayan'
import { COPY } from '../constants/copy'
import type { RitualSnapshot } from '../state/useRitualMachine'

type RitualOverlayProps = {
  question: string
  setQuestion: (value: string) => void
  snapshot: RitualSnapshot
  onBegin: () => void
  onReset: () => void
}

export function RitualOverlay({
  question,
  setQuestion,
  snapshot,
  onBegin,
  onReset,
}: RitualOverlayProps) {
  const canBegin = question.trim().length > 0 && !snapshot.isRunning

  return (
    <div className="ritual-overlay">
      <header className="topbar">
        <div>
          <p className="eyebrow">MVP 0.3 / 观天</p>
          <h1>大衍筮法</h1>
        </div>
        <div className="mode-note">问夜预留</div>
      </header>

      <section className="question-panel" aria-label="所问何事">
        <label htmlFor="question">所问何事</label>
        <div className="question-row">
          <input
            id="question"
            value={question}
            disabled={snapshot.isRunning}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onBegin()
            }}
            placeholder="将问题留在案前"
          />
          <button type="button" onClick={onBegin} disabled={!canBegin}>
            起筮
          </button>
        </div>
      </section>

      <section className="status-panel" aria-live="polite">
        <div className="progress-track">
          <span style={{ width: `${snapshot.progress * 100}%` }} />
        </div>
        <p>{snapshot.stepLabel}</p>
        {snapshot.lineIndex > 0 && snapshot.phase !== 'hexagramComplete' ? (
          <small>
            第 {snapshot.lineIndex} 爻 · 第 {snapshot.changeIndex || 1} 变 · 左 {snapshot.groupCounts.left} · 右{' '}
            {snapshot.groupCounts.right} · 挂 {snapshot.groupCounts.takenOne} · 余 {snapshot.groupCounts.remainder}
            {snapshot.countBatchTotal ? ` · 第 ${snapshot.countBatchIndex}/${snapshot.countBatchTotal} 组` : ''}
          </small>
        ) : null}
      </section>

      {snapshot.result && snapshot.phase === 'hexagramComplete' ? (
        <section className="result-panel" aria-label="筮法结果">
          <div className="result-heading">
            <div>
              <p className="eyebrow">结构化结果</p>
              <h2>卦象已成</h2>
            </div>
            <button type="button" onClick={onReset}>
              {COPY.resetButton}
            </button>
          </div>
          <p className="asked">问：{snapshot.result.question}</p>
          <div className="hexagram-lines">
            {[...snapshot.result.lines].reverse().map((line) => (
              <div className="line-row" key={line.index}>
                <span>第 {line.index} 爻</span>
                <b className={line.isYang ? 'yang' : 'yin'}>{line.isYang ? '━━━━━━' : '━━  ━━'}</b>
                <em>{describeLine(line.value)}</em>
              </div>
            ))}
          </div>
          <dl>
            <div>
              <dt>本卦</dt>
              <dd>{snapshot.result.primaryBinary}</dd>
            </div>
            <div>
              <dt>变爻</dt>
              <dd>{snapshot.result.changedLines.length ? snapshot.result.changedLines.join('、') : '无'}</dd>
            </div>
            <div>
              <dt>之卦</dt>
              <dd>{snapshot.result.changedBinary}</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  )
}
