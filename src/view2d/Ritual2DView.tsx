import { useState } from 'react'
import { describeLine } from '../domain/dayan'
import { localApiProvider } from '../ai/localApiProvider'
import { mockProvider } from '../ai/mockProvider'
import { COPY } from '../constants/copy'
import { selectInterpretation, type InterpretationSelection } from '../domain/interpretation'
import { getHexagramByBinary } from '../domain/hexagramLookup'
import { buildAIInterpretationInput } from '../interpretation/interpretationInput'
import { buildInterpretationPrompt } from '../interpretation/interpretationPrompt'
import { renderInterpretationMarkdown } from '../interpretation/interpretationRenderer'
import { useManualRitualMachine } from '../state/useManualRitualMachine'
import { InkLandscape } from './InkLandscape'
import { YarrowSvg } from './YarrowSvg'
import type { ManualRitualSnapshot } from '../state/useManualRitualMachine'

function YaoMark({ isYang }: { isYang: boolean }) {
  return (
    <i className={isYang ? 'yao-mark yao-yang' : 'yao-mark yao-yin'} aria-label={isYang ? '阳爻' : '阴爻'}>
      <span />
      {!isYang ? <span /> : null}
    </i>
  )
}

function HexagramMark({ binary }: { binary: string }) {
  return (
    <i className="hexagram-mark" aria-label={binary}>
      {[...binary].reverse().map((bit, index) => (
        <YaoMark key={`${bit}-${index}`} isYang={bit === '1'} />
      ))}
    </i>
  )
}

function InterpretationSourcePanel({
  selection,
  primaryBinary,
  changedBinary,
  movingLines,
}: {
  selection: InterpretationSelection
  primaryBinary: string
  changedBinary: string
  movingLines: number[]
}) {
  const original = getHexagramByBinary(primaryBinary)
  const changed = getHexagramByBinary(changedBinary)
  const primary = selection.primary
  const secondary = selection.secondary
  const displayItemTitle = (item: (typeof primary)[number]) =>
    item.line ? `${item.hexagramName}卦 · ${item.title.replace(`${item.hexagramName}卦 `, '')}` : `${item.hexagramName}卦辞`

  return (
    <div className="interpretation-source">
      <p>
        所取之辞：{selection.movingLineCount} 动爻
      </p>
      <dl>
        {original ? (
          <div>
            <dt>本卦</dt>
            <dd>
              {original.name}
              <span>{original.judgment}</span>
            </dd>
          </div>
        ) : null}
        {changed ? (
          <div>
            <dt>变卦</dt>
            <dd>
              {changed.name}
              <span>{changed.judgment}</span>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>动爻</dt>
          <dd>{movingLines.length ? movingLines.join('、') : '无'}</dd>
        </div>
        {import.meta.env.DEV ? (
          <div className="interpretation-debug">
            <dt>debug</dt>
            <dd>
              本卦 {primaryBinary} · 变卦 {changedBinary}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="interpretation-source-grid">
        <div>
          <h3>主辞</h3>
          {primary.map((item) => (
            <article key={`primary-${item.source}-${item.type}-${item.line ?? item.hexagramBinary}`}>
              <h4>{displayItemTitle(item)}</h4>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        {secondary.length ? (
          <div>
            <h3>辅辞</h3>
            {secondary.map((item) => (
              <article key={`secondary-${item.source}-${item.type}-${item.line ?? item.hexagramBinary}`}>
                <h4>{displayItemTitle(item)}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function makeStatusCard(snapshot: ManualRitualSnapshot) {
  const latestChangeRecord = snapshot.changeRecords.at(-1) ?? null
  const latestLineRecord = snapshot.lineRecords.at(-1) ?? null
  const isWaitingForSplit = snapshot.step === 'chooseSplit'
  const isLineComplete = snapshot.step === 'lineComplete'

  if (isWaitingForSplit) {
    return {
      lineIndex: snapshot.lineIndex,
      changeIndex: snapshot.changeIndex,
      title: '等待分草',
      detail: '点击蓍草束任意位置来分而为二',
    }
  }

  if (isLineComplete && latestLineRecord) {
    return {
      lineIndex: latestLineRecord.index,
      changeIndex: 3,
      title: '三变成一爻',
      detail: `${describeLine(latestLineRecord.value)} / ${latestLineRecord.value} / ${
        latestLineRecord.isChanging ? '变爻' : '不变'
      }`,
    }
  }

  if (latestChangeRecord) {
    return {
      lineIndex: latestChangeRecord.lineIndex,
      changeIndex: latestChangeRecord.changeIndex,
      title: snapshot.stepLabel,
      detail: `左 ${latestChangeRecord.leftCount} · 右 ${latestChangeRecord.rightCount} · 去策 ${latestChangeRecord.removedCount} · 余 ${latestChangeRecord.availableAfter}`,
    }
  }

  return {
    lineIndex: snapshot.lineIndex,
    changeIndex: snapshot.changeIndex,
    title: snapshot.stepLabel,
    detail: null,
  }
}

export function Ritual2DView() {
  const ritual = useManualRitualMachine()
  const { snapshot } = ritual
  const statusCard = makeStatusCard(snapshot)
  const [isSeeingHexagram, setIsSeeingHexagram] = useState(false)
  const [seenMarkdown, setSeenMarkdown] = useState<string | null>(null)
  const [seenSelection, setSeenSelection] = useState<InterpretationSelection | null>(null)
  const canBegin =
    ritual.question.trim().length > 0 &&
    (snapshot.step === 'idle' || snapshot.step === 'awaitingQuestion')
  const resetInterpretation = () => {
    setSeenMarkdown(null)
    setSeenSelection(null)
    setIsSeeingHexagram(false)
  }

  return (
    <main className="ritual-2d-shell">
      <InkLandscape />

      <header className="ritual-2d-header">
        <div>
          <p>MVP 0.5 / 平面观天</p>
          <h1>大衍筮法</h1>
        </div>
        <span>3D 暂停</span>
      </header>

      {import.meta.env.DEV ? (
        <button
          type="button"
          className="debug-complete-button"
          onClick={() => {
            resetInterpretation()
            ritual.completeDebugHexagram()
          }}
        >
          测试成卦
        </button>
      ) : null}

      <section className="ritual-2d-table" aria-label="木案与蓍草">
        <div className="wood-table">
          <YarrowSvg
            stalks={snapshot.stalks}
            canChooseSplit={snapshot.canChooseSplit}
            onChooseSplit={ritual.chooseSplit}
          />
        </div>
        <div className="sleeves" aria-hidden="true">
          <i />
          <b />
          <b />
          <i />
        </div>
      </section>

      <section className="ritual-2d-question" aria-label="所问何事">
        <label htmlFor="manual-question">所问何事</label>
        <div>
          <input
            id="manual-question"
            value={ritual.question}
            disabled={snapshot.step !== 'idle' && snapshot.step !== 'awaitingQuestion'}
            onChange={(event) => ritual.setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') ritual.start()
            }}
            placeholder="将问题留在案前"
          />
          <button type="button" onClick={ritual.start} disabled={!canBegin}>
            起筮
          </button>
        </div>
      </section>

      <section className="ritual-2d-status" aria-live="polite">
        <p>
          第 {statusCard.lineIndex} 爻 · 第 {statusCard.changeIndex} 变
        </p>
        <strong>{statusCard.title}</strong>
        {statusCard.detail ? <small>{statusCard.detail}</small> : null}
      </section>

      <section className="manual-records" aria-label="筮法记录">
        <h2>记录</h2>
        <div className="record-scroll">
          {snapshot.changeRecords.map((change) => (
            <p
              key={`${change.lineIndex}-${change.changeIndex}`}
              className={
                change.lineIndex === snapshot.lineIndex && change.changeIndex === snapshot.changeIndex
                  ? 'is-current'
                  : undefined
              }
            >
              <span>
                第 {change.lineIndex} 爻 / 第 {change.changeIndex} 变
              </span>
              左 {change.leftCount} / 右 {change.rightCount} / 右取一 / 左余 {change.leftRemainder} / 右余{' '}
              {change.rightRemainder} / 去策 {change.removedCount} / 余 {change.availableAfter}
            </p>
          ))}
          {snapshot.lineRecords.map((line) => (
            <p className="line-record" key={`line-${line.index}`}>
              <span>第 {line.index} 爻合成</span>
              <YaoMark isYang={line.isYang} />
              {describeLine(line.value)} / {line.value} / {line.isChanging ? '变爻' : '不变'}
            </p>
          ))}
        </div>
      </section>

      {snapshot.result ? (
        <section className="manual-result" aria-label="筮法结果">
          <div>
            <p>问：{snapshot.result.question}</p>
            <div className="manual-result-actions">
              <button
                type="button"
                onClick={async () => {
                  if (!snapshot.result) return
                  setIsSeeingHexagram(true)
                  setSeenMarkdown(null)
                  const selection = selectInterpretation({
                    originalHexagramBinary: snapshot.result.primaryBinary,
                    changedHexagramBinary: snapshot.result.changedBinary,
                    movingLines: snapshot.result.changedLines,
                  })
                  setSeenSelection(selection)
                  const input = buildAIInterpretationInput(snapshot.result.question, snapshot.result)
                  const prompt = buildInterpretationPrompt(input)
                  try {
                    let output
                    try {
                      output = await localApiProvider.interpret(prompt)
                    } catch (error) {
                      console.warn('Local LLM proxy failed; falling back to mockProvider.', error)
                      output = await mockProvider.interpret(prompt)
                    }
                    setSeenMarkdown(output.markdown)
                  } finally {
                    setIsSeeingHexagram(false)
                  }
                }}
              >
                {COPY.insightButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetInterpretation()
                  ritual.reset()
                }}
              >
                {COPY.resetButton}
              </button>
            </div>
          </div>
          {isSeeingHexagram || seenMarkdown ? (
            <section className="interpretation-note" aria-label={COPY.insightButton}>
              <h2>{COPY.insightButton}</h2>
              {isSeeingHexagram ? <p>{COPY.observing}</p> : null}
              {seenSelection && snapshot.result ? (
                <InterpretationSourcePanel
                  selection={seenSelection}
                  primaryBinary={snapshot.result.primaryBinary}
                  changedBinary={snapshot.result.changedBinary}
                  movingLines={snapshot.result.changedLines}
                />
              ) : null}
              {seenMarkdown ? renderInterpretationMarkdown(seenMarkdown) : null}
            </section>
          ) : null}
          <div className="manual-lines">
            {[...snapshot.result.lines].reverse().map((line) => (
              <p key={line.index}>
                <span>第 {line.index} 爻</span>
                <YaoMark isYang={line.isYang} />
                <em>{describeLine(line.value)}</em>
              </p>
            ))}
          </div>
          <dl>
            <div>
              <dt>本卦</dt>
              <dd>
                <HexagramMark binary={snapshot.result.primaryBinary} />
              </dd>
            </div>
            <div>
              <dt>变爻</dt>
              <dd>{snapshot.result.changedLines.length ? snapshot.result.changedLines.join('、') : '无'}</dd>
            </div>
            <div>
              <dt>之卦</dt>
              <dd>
                <HexagramMark binary={snapshot.result.changedBinary} />
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </main>
  )
}
