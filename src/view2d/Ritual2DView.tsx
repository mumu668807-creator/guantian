import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { toPng } from 'html-to-image'
import { localApiProvider } from '../ai/localApiProvider'
import { mockProvider } from '../ai/mockProvider'
import { claimDailyCast, sendMagicLink, signOut, SupabasePublicError } from '../auth/supabaseClient'
import { useGuantianAuth } from '../auth/useGuantianAuth'
import { createNatureAudioController } from '../audio/natureAudio'
import { COPY_BY_LANGUAGE, type Language } from '../constants/copy'
import { selectInterpretation, type InterpretationSelection } from '../domain/interpretation'
import { getHexagramByBinary, getYaoText } from '../domain/hexagramLookup'
import { buildAIInterpretationInput } from '../interpretation/interpretationInput'
import { buildInterpretationPrompt } from '../interpretation/interpretationPrompt'
import { renderInterpretationMarkdown } from '../interpretation/interpretationRenderer'
import tabletopBackgroundLightWebp from '../assets/tabletop-ritual-space-1280.webp'
import tabletopBackgroundWebp from '../assets/tabletop-ritual-space.webp'
import {
  makeLocalHistoryRecord,
  readLocalHistory,
  saveLocalHistoryRecord,
  updateLocalHistoryRecordNote,
  type LocalHistoryRecord,
} from '../history/localHistory'
import {
  readSupabaseHistory,
  saveSupabaseHistoryRecord,
  updateSupabaseHistoryNote,
} from '../history/supabaseHistory'
import { useStageScale } from '../hooks/useStageScale'
import { useManualRitualMachine } from '../state/useManualRitualMachine'
import { InkLandscape } from './InkLandscape'
import { YarrowSvg } from './YarrowSvg'
import type { ManualRitualSnapshot } from '../state/useManualRitualMachine'
import type { ManualHexagramResult, ManualLineRecord } from '../domain/manualDayan'

type RitualCopy = (typeof COPY_BY_LANGUAGE)[Language]

const languageStorageKey = 'guantian:language'

const readInitialLanguage = (): Language => {
  const queryLanguage = new URLSearchParams(window.location.search).get('lang')
  if (queryLanguage === 'zh' || queryLanguage === 'en') return queryLanguage

  const storedLanguage = window.localStorage.getItem(languageStorageKey)
  if (storedLanguage === 'zh' || storedLanguage === 'en') return storedLanguage

  return 'en'
}

function StageShell({ children, smallScreenText }: { children: ReactNode; smallScreenText: string }) {
  const stageScale = useStageScale()

  return (
    <main className="stage-shell" style={{ '--stage-scale': stageScale } as CSSProperties}>
      <div className="ritual-stage">{children}</div>
      {stageScale < 0.62 ? <p className="small-screen-note">{smallScreenText}</p> : null}
    </main>
  )
}

function YaoMark({ isYang, copy }: { isYang: boolean; copy: RitualCopy }) {
  return (
    <i className={isYang ? 'yao-mark yao-yang' : 'yao-mark yao-yin'} aria-label={isYang ? copy.yangLine : copy.yinLine}>
      <span />
      {!isYang ? <span /> : null}
    </i>
  )
}

function HexagramMark({ binary, copy }: { binary: string; copy: RitualCopy }) {
  return (
    <i className="hexagram-mark" aria-label={binary}>
      {[...binary].reverse().map((bit, index) => (
        <YaoMark key={`${bit}-${index}`} isYang={bit === '1'} copy={copy} />
      ))}
    </i>
  )
}

function ShareHexagramMark({ binary }: { binary: string }) {
  return (
    <div className="share-hexagram-mark" aria-hidden="true">
      {[...binary].reverse().map((bit, index) => (
        <i key={`${bit}-${index}`} className={bit === '1' ? 'is-yang' : 'is-yin'}>
          <span />
          {bit === '0' ? <span /> : null}
        </i>
      ))}
    </div>
  )
}

function stripMarkdownLine(line: string) {
  return line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*]\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim()
}

function getShareCoreText(markdown: string, language: Language) {
  const lines = markdown
    .split('\n')
    .map(stripMarkdownLine)
    .filter(Boolean)
  const coreLine = lines.find((line) => {
    if (line.length < 18) return false
    if (/^[一二三四五六七八九十]+[、.．]/.test(line)) return false
    if (/^\d+[.．]/.test(line)) return false
    return true
  })

  if (!coreLine) return language === 'zh' ? '此刻先把问题放稳，再看变化往哪里去。' : 'Hold the question steady, then watch where change turns.'
  return coreLine.length > 92 ? `${coreLine.slice(0, 92)}…` : coreLine
}

function SharePoster({
  result,
  markdown,
  copy,
  language,
}: {
  result: ManualHexagramResult
  markdown: string
  copy: RitualCopy
  language: Language
}) {
  const originalName = getHexagramName(result.primaryBinary, language)
  const changedName = getHexagramName(result.changedBinary, language)
  const movingLines = formatMovingLines(result, language, copy)
  const coreText = getShareCoreText(markdown, language)

  return (
    <div className="share-poster">
      <div className="share-poster-mist" />
      <div className="share-poster-inner">
        <header>
          <p>{copy.appKicker}</p>
          <h2>{copy.sharePosterTitle}</h2>
        </header>
        <section className="share-question">
          <span>{copy.resultQuestion}</span>
          <p>{result.question}</p>
        </section>
        <section className="share-gua-row">
          <article>
            <span>{copy.primaryGua}</span>
            <ShareHexagramMark binary={result.primaryBinary} />
            <strong>{originalName}</strong>
          </article>
          <article>
            <span>{copy.movingLines}</span>
            <em>{movingLines}</em>
          </article>
          <article>
            <span>{copy.changedGua}</span>
            <ShareHexagramMark binary={result.changedBinary} />
            <strong>{changedName}</strong>
          </article>
        </section>
        <blockquote>{coreText}</blockquote>
        <footer>
          <span>www.guantian.xyz</span>
        </footer>
      </div>
    </div>
  )
}

function formatHistoryDate(createdAt: string, language: Language) {
  try {
    return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(createdAt))
  } catch {
    return createdAt
  }
}

function formatHistoryLines(record: LocalHistoryRecord, copy: RitualCopy, language: Language) {
  return record.lines
    .map((line) => {
      const prefix = language === 'zh' ? `第${line.index}爻` : `${copy.linePrefix} ${line.index}`
      return `${prefix} ${copy.lineValues[line.value as keyof typeof copy.lineValues]}${
        line.isChanging ? ` ${copy.changingLine}` : ''
      }`
    })
    .join(' / ')
}

function HistoryNote({
  record,
  copy,
  onNoteChange,
}: {
  record: LocalHistoryRecord
  copy: RitualCopy
  onNoteChange: (record: LocalHistoryRecord, note: string) => void
}) {
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [draftNote, setDraftNote] = useState(record.note ?? '')

  const commitNote = () => {
    const nextNote = draftNote.trim().slice(0, 140)
    setDraftNote(nextNote)
    setIsEditingNote(false)
    if (nextNote === (record.note ?? '')) return
    onNoteChange(record, nextNote)
  }

  return (
    <div className="history-note">
      {isEditingNote ? (
        <textarea
          autoFocus
          maxLength={140}
          value={draftNote}
          aria-label={copy.historyNotePlaceholder}
          onChange={(event) => setDraftNote(event.target.value.slice(0, 140))}
          onBlur={commitNote}
        />
      ) : (
        <button type="button" onClick={() => setIsEditingNote(true)}>
          {record.note || copy.historyNotePlaceholder}
        </button>
      )}
    </div>
  )
}

function HistoryPanel({
  records,
  activeRecordId,
  copy,
  language,
  onSelect,
  onNoteChange,
  onClose,
}: {
  records: LocalHistoryRecord[]
  activeRecordId: string | null
  copy: RitualCopy
  language: Language
  onSelect: (record: LocalHistoryRecord) => void
  onNoteChange: (record: LocalHistoryRecord, note: string) => void
  onClose: () => void
}) {
  const activeRecord = records.find((record) => record.id === activeRecordId) ?? records[0] ?? null

  return (
    <section className="history-panel" aria-label={copy.historyTitle}>
      <div className="history-panel-heading">
        <div>
          <p>{copy.historyKicker}</p>
          <h2>{copy.historyTitle}</h2>
        </div>
        <button type="button" aria-label={copy.historyClose} onClick={onClose}>
          ×
        </button>
      </div>
      {!records.length ? (
        <p className="history-empty">{copy.historyEmpty}</p>
      ) : (
        <>
          <div className="history-list">
            {records.map((record) => (
              <button
                type="button"
                key={record.id}
                className={record.id === activeRecord?.id ? 'is-active' : undefined}
                onClick={() => onSelect(record)}
              >
                <span>{formatHistoryDate(record.createdAt, language)}</span>
                <strong>{record.question}</strong>
                <small>
                  {record.originalHexagram.name} → {record.changedHexagram.name}
                </small>
              </button>
            ))}
          </div>
          {activeRecord ? (
            <article className="history-detail">
              <p>{copy.resultQuestion}: {activeRecord.question}</p>
              <dl>
                <div>
                  <dt>{copy.primaryGua}</dt>
                  <dd>{activeRecord.originalHexagram.name}</dd>
                </div>
                <div>
                  <dt>{copy.changedGua}</dt>
                  <dd>{activeRecord.changedHexagram.name}</dd>
                </div>
                <div>
                  <dt>{copy.movingLines}</dt>
                  <dd>{activeRecord.movingLines.length ? activeRecord.movingLines.join('、') : copy.noMovingLine}</dd>
                </div>
              </dl>
              <small>{formatHistoryLines(activeRecord, copy, language)}</small>
              <HistoryNote
                key={activeRecord.id}
                record={activeRecord}
                copy={copy}
                onNoteChange={onNoteChange}
              />
              <div className="history-interpretation">
                {renderInterpretationMarkdown(activeRecord.interpretationText)}
              </div>
            </article>
          ) : null}
        </>
      )}
    </section>
  )
}

function AboutPanel({ copy, onClose }: { copy: RitualCopy; onClose: () => void }) {
  return (
    <section className="about-veil" aria-label={copy.aboutTitle} onClick={onClose}>
      <article className="about-panel" onClick={(event) => event.stopPropagation()}>
        <div className="about-panel-heading">
          <div>
            <p>{copy.appKicker}</p>
            <h2>{copy.aboutTitle}</h2>
          </div>
          <button type="button" aria-label={copy.aboutClose} onClick={onClose}>
            ×
          </button>
        </div>
        <p>Guantian is made by 周锦年 / zjn.</p>
        <p>
          I build slow digital spaces, AI rituals, and small tools that try to make the internet feel human again.
        </p>
        <div className="about-contact">
          <h3>Contact:</h3>
          <ul>
            <li>X: 周锦年zjn</li>
            <li>Reddit: 周锦年zjn</li>
            <li>Email: zhoujinnian2000@qq.com</li>
            <li>Xiaohongshu: 周锦年zjn</li>
          </ul>
        </div>
      </article>
    </section>
  )
}

function TopToolBar({
  copy,
  languageToggle,
  hasEnteredSpace,
  isAccountVisible,
  isAccountOpen,
  accountEmail,
  onToggleLanguage,
  onToggleAccount,
  onSignOut,
  onOpenAbout,
  onOpenHistory,
  onOpenOnboarding,
}: {
  copy: RitualCopy
  languageToggle: string
  hasEnteredSpace: boolean
  isAccountVisible: boolean
  isAccountOpen: boolean
  accountEmail?: string
  onToggleLanguage: () => void
  onToggleAccount: () => void
  onSignOut: () => void
  onOpenAbout: () => void
  onOpenHistory: () => void
  onOpenOnboarding: () => void
}) {
  return (
    <nav className="top-tool-bar" aria-label="quiet tools">
      {isAccountVisible ? (
        <div className="account-menu">
          <button
            type="button"
            className="account-button"
            aria-label={copy.account}
            onClick={onToggleAccount}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a3.6 3.6 0 1 0 0-7.2A3.6 3.6 0 0 0 12 12Z" />
              <path d="M5.6 19.4c.8-3.1 3.1-4.8 6.4-4.8s5.6 1.7 6.4 4.8" />
            </svg>
          </button>
          {isAccountOpen ? (
            <div className="account-popover">
              <span>{accountEmail ?? copy.authSignedIn}</span>
              <button type="button" onClick={onSignOut}>
                {copy.authLeave}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {hasEnteredSpace ? (
        <>
          <button type="button" className="history-open-button" aria-label={copy.historyTitle} onClick={onOpenHistory}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.8h8" />
              <path d="M8 10.1h8" />
              <path d="M8 14.4h5.8" />
              <path d="M5.5 4.2h13v15.6l-2.6-1.4-2.6 1.4-2.8-1.4-2.7 1.4-2.7-1.4Z" />
            </svg>
          </button>
          <button type="button" className="onboarding-book-button" aria-label={copy.book} onClick={onOpenOnboarding}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5.4c2.7-.8 4.9-.5 7 1.1 2.1-1.6 4.3-1.9 7-1.1v13.2c-2.7-.8-4.9-.5-7 1.1-2.1-1.6-4.3-1.9-7-1.1Z" />
              <path d="M12 6.5v13.2" />
            </svg>
          </button>
        </>
      ) : null}
      <button type="button" className="about-open-button" aria-label={copy.aboutTitle} onClick={onOpenAbout}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 17.2v-5.4" />
          <path d="M12 7.4h.01" />
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        </svg>
      </button>
      <button type="button" className="language-switch-button" aria-label={languageToggle} onClick={onToggleLanguage}>
        {languageToggle}
      </button>
    </nav>
  )
}

function InterpretationSourcePanel({
  selection,
  primaryBinary,
  changedBinary,
  movingLines,
  copy,
  language,
}: {
  selection: InterpretationSelection
  primaryBinary: string
  changedBinary: string
  movingLines: number[]
  copy: RitualCopy
  language: Language
}) {
  const original = getHexagramByBinary(primaryBinary)
  const changed = getHexagramByBinary(changedBinary)
  const primary = selection.primary
  const secondary = selection.secondary
  const displayItemTitle = (item: (typeof primary)[number]) =>
    item.line
      ? `${item.hexagramName}${language === 'zh' ? '卦' : ' gua'} · ${item.title.replace(`${item.hexagramName}卦 `, '')}`
      : `${item.hexagramName}${language === 'zh' ? '卦辞' : ' gua text'}`
  const movingLineNames = movingLines.length
    ? movingLines
        .map((line) => {
          const yaoName = getYaoText(primaryBinary, line)?.name
          if (language === 'zh') return yaoName ? `${yaoName}动` : `${line}爻动`
          return yaoName ? `${yaoName} moving` : `line ${line} moving`
        })
        .join('、')
    : copy.noMovingLine

  return (
    <div className="interpretation-source">
      <p>
        {copy.sourceTaken}: {selection.movingLineCount} {language === 'zh' ? '动爻' : 'moving line(s)'}
      </p>
      <dl>
        {original ? (
          <div>
            <dt>{copy.originalGua}</dt>
            <dd>
              {original.name}
              <span>{original.judgment}</span>
            </dd>
          </div>
        ) : null}
        {changed ? (
          <div>
            <dt>{copy.transformedGua}</dt>
            <dd>
              {changed.name}
              <span>{changed.judgment}</span>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{copy.movingLines}</dt>
          <dd>{movingLineNames}</dd>
        </div>
        {import.meta.env.DEV ? (
          <div className="interpretation-debug">
            <dt>debug</dt>
            <dd>
              primary {primaryBinary} · changed {changedBinary}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="interpretation-source-grid">
        <div>
          <h3>{copy.mainText}</h3>
          {primary.map((item) => (
            <article key={`primary-${item.source}-${item.type}-${item.line ?? item.hexagramBinary}`}>
              <h4>{displayItemTitle(item)}</h4>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        {secondary.length ? (
          <div>
            <h3>{copy.supportText}</h3>
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

const getHexagramName = (binary: string, language: Language) => {
  const hexagram = getHexagramByBinary(binary)
  if (!hexagram) return language === 'zh' ? '未录入卦' : 'unrecorded gua'
  return language === 'zh' ? `${hexagram.name}卦` : `${hexagram.name} gua`
}

const formatMovingLines = (result: ManualHexagramResult, language: Language, copy: RitualCopy) => {
  if (!result.changedLines.length) return copy.noMovingLine

  return result.changedLines
    .map((line) => {
      const yaoName = getYaoText(result.primaryBinary, line)?.name
      if (language === 'zh') return yaoName ? `${yaoName}动` : `${line}爻动`
      return yaoName ? `${yaoName} moving` : `line ${line} moving`
    })
    .join('、')
}

const formatLineValue = (value: ManualLineRecord['value'], copy: RitualCopy) => copy.lineValues[value]

const formatChangeDetail = (change: ManualRitualSnapshot['changeRecords'][number], copy: RitualCopy) =>
  `${copy.detail.left} ${change.leftCount} / ${copy.detail.right} ${change.rightCount} / ${copy.detail.takeOne} / ${copy.detail.leftRemainder} ${change.leftRemainder} / ${copy.detail.rightRemainder} ${change.rightRemainder} / ${copy.detail.removed} ${change.removedCount} / ${copy.detail.remaining} ${change.availableAfter}`

function makeStatusCard(snapshot: ManualRitualSnapshot, copy: RitualCopy) {
  const latestLineRecord = snapshot.lineRecords.at(-1) ?? null
  const isWaitingForSplit = snapshot.step === 'chooseSplit'
  const isLineComplete = snapshot.step === 'lineComplete'

  if (isWaitingForSplit) {
    return {
      lineIndex: snapshot.lineIndex,
      changeIndex: snapshot.changeIndex,
      title: copy.status.chooseSplit,
      detail: copy.status.waitingSplitDetail,
    }
  }

  if (isLineComplete && latestLineRecord) {
    return {
      lineIndex: latestLineRecord.index,
      changeIndex: 3,
      title: copy.status.lineComplete,
      detail: `${formatLineValue(latestLineRecord.value, copy)} / ${latestLineRecord.value} / ${
        latestLineRecord.isChanging ? copy.changingLine : copy.unchangedLine
      }`,
    }
  }

  return {
    lineIndex: snapshot.lineIndex,
    changeIndex: snapshot.changeIndex,
    title: copy.status[snapshot.step],
    detail: null,
  }
}

export function Ritual2DView() {
  const ritual = useManualRitualMachine()
  const auth = useGuantianAuth()
  const { snapshot } = ritual
  const [language, setLanguage] = useState<Language>(() => readInitialLanguage())
  const copy = COPY_BY_LANGUAGE[language]
  const statusCard = makeStatusCard(snapshot, copy)
  const [isSeeingHexagram, setIsSeeingHexagram] = useState(false)
  const [seenMarkdown, setSeenMarkdown] = useState<string | null>(null)
  const [seenSelection, setSeenSelection] = useState<InterpretationSelection | null>(null)
  const [showChangeDetails, setShowChangeDetails] = useState(false)
  const [isEnteringRitual, setIsEnteringRitual] = useState(false)
  const [isClaimingCast, setIsClaimingCast] = useState(false)
  const [isResultRevealed, setIsResultRevealed] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isLocalAuthBypassed, setIsLocalAuthBypassed] = useState(false)
  const [hasEnteredRitualSpace, setHasEnteredRitualSpace] = useState(!auth.isAuthEnabled)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<LocalHistoryRecord[]>(() => readLocalHistory())
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [isShareGenerating, setIsShareGenerating] = useState(false)
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null)
  const sharePosterRef = useRef<HTMLDivElement | null>(null)
  const [onboardingPage, setOnboardingPage] = useState(0)
  const enterTimerRef = useRef<number | null>(null)
  const savedHistoryKeyRef = useRef<string | null>(null)
  const currentLineComplete = snapshot.lineRecords.some((line) => line.index === snapshot.lineIndex)
  const canShowCurrentChangeRecord = (change: ManualRitualSnapshot['changeRecords'][number]) => {
    if (change.lineIndex !== snapshot.lineIndex) return false
    if (change.changeIndex < snapshot.changeIndex) return true
    return change.changeIndex === snapshot.changeIndex && snapshot.step === 'changeComplete'
  }
  const currentLineChanges =
    snapshot.step === 'hexagramComplete' || currentLineComplete
      ? []
      : snapshot.changeRecords.filter(canShowCurrentChangeRecord)
  const canBegin =
    ritual.question.trim().length > 0 &&
    (snapshot.step === 'idle' || snapshot.step === 'awaitingQuestion')
  const resetInterpretation = () => {
    setSeenMarkdown(null)
    setSeenSelection(null)
    setIsSeeingHexagram(false)
    setIsShareGenerating(false)
    setShareImageUrl(null)
  }
  const isEntrance = snapshot.step === 'idle' || snapshot.step === 'awaitingQuestion'
  const isReadingHexagram = isSeeingHexagram || seenMarkdown !== null
  const isObservingHexagram = isSeeingHexagram && seenMarkdown === null
  const hasEnteredSpace = !auth.isAuthEnabled || hasEnteredRitualSpace || isLocalAuthBypassed
  const toggleLanguage = () =>
    setLanguage((current) => {
      const nextLanguage = current === 'en' ? 'zh' : 'en'
      window.localStorage.setItem(languageStorageKey, nextLanguage)
      return nextLanguage
    })
  const onboardingStorageKey = auth.user?.id
    ? `guantian:onboarding:${auth.user.id}`
    : isLocalAuthBypassed
      ? 'guantian:onboarding:local-dev'
      : null
  const closeOnboarding = useCallback(() => {
    if (onboardingStorageKey) window.localStorage.setItem(onboardingStorageKey, 'seen')
    setIsOnboardingOpen(false)
    setOnboardingPage(0)
  }, [onboardingStorageKey])
  const openOnboarding = useCallback(() => {
    setOnboardingPage(0)
    setIsHistoryOpen(false)
    setIsAboutOpen(false)
    setIsOnboardingOpen(true)
  }, [])
  const openHistory = useCallback(() => {
    const localRecords = readLocalHistory()
    setHistoryRecords(localRecords)
    setSelectedHistoryId((current) => current ?? localRecords[0]?.id ?? null)
    setIsOnboardingOpen(false)
    setIsAboutOpen(false)
    setIsHistoryOpen((current) => !current)

    if (!auth.session) return

    readSupabaseHistory()
      .then((records) => {
        setHistoryRecords(records)
        setSelectedHistoryId((current) => current ?? records[0]?.id ?? null)
      })
      .catch((error) => {
        console.warn('Failed to read Supabase guantian history.', error)
      })
  }, [auth.session])
  const openAbout = useCallback(() => {
    setIsHistoryOpen(false)
    setIsOnboardingOpen(false)
    setIsAboutOpen((current) => !current)
  }, [])
  const advanceOnboarding = useCallback(() => {
    if (onboardingPage >= copy.onboardingPages.length - 1) {
      closeOnboarding()
      return
    }
    setOnboardingPage((current) => current + 1)
  }, [closeOnboarding, copy.onboardingPages.length, onboardingPage])
  const enterRitualSpace = () => {
    if (auth.isAuthEnabled && !auth.session && !isLocalAuthBypassed) {
      setAuthNotice(copy.authRequired)
      return
    }
    setAuthNotice(null)
    setHasEnteredRitualSpace(true)
  }
  const beginFromEntrance = async () => {
    if (!canBegin || isEnteringRitual) return
    if (auth.isAuthEnabled && !auth.session && !isLocalAuthBypassed) {
      setAuthNotice(copy.authRequired)
      return
    }

    if (auth.isAuthEnabled && !import.meta.env.DEV) {
      setIsClaimingCast(true)
      setAuthNotice(null)
      try {
        const canCast = await claimDailyCast()
        if (!canCast) {
          setAuthNotice(copy.dailyAlreadyCast)
          return
        }
      } catch (error) {
        console.warn('Daily cast check failed.', error)
        setAuthNotice(copy.dailyCheckFailed)
        return
      } finally {
        setIsClaimingCast(false)
      }
    }

    setIsEnteringRitual(true)
    enterTimerRef.current = window.setTimeout(() => {
      ritual.start()
      setIsEnteringRitual(false)
      enterTimerRef.current = null
    }, 700)
  }

  const formatAuthError = (error: unknown) => {
    if (error instanceof SupabasePublicError) {
      const detail = [error.message, error.status ? `status ${error.status}` : null, error.code ?? null]
        .filter(Boolean)
        .join(' · ')
      return `${copy.authError}\n${copy.authErrorPrefix}: ${detail}`
    }
    if (error instanceof Error) return `${copy.authError}\n${copy.authErrorPrefix}: ${error.message}`
    return copy.authError
  }

  const handleMagicLink = async () => {
    if (!authEmail.trim()) return
    setAuthNotice(null)
    try {
      window.localStorage.setItem(languageStorageKey, language)
      await sendMagicLink(authEmail.trim(), language)
      setAuthNotice(copy.authCheckMail)
    } catch (error) {
      console.warn('Magic link failed.', error)
      setAuthNotice(formatAuthError(error))
    }
  }

  const handleSignOut = async () => {
    await signOut()
    resetInterpretation()
    setShowChangeDetails(false)
    setIsResultRevealed(false)
    setIsAccountOpen(false)
    setIsLocalAuthBypassed(false)
    setHasEnteredRitualSpace(false)
    setAuthNotice(null)
    setIsHistoryOpen(false)
    setIsAboutOpen(false)
    ritual.reset()
  }

  const handleShareReading = async () => {
    if (!sharePosterRef.current || !snapshot.result || !seenMarkdown || isShareGenerating) return

    setIsShareGenerating(true)
    setShareImageUrl(null)
    try {
      await document.fonts?.ready
      const dataUrl = await toPng(sharePosterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#111512',
      })
      setShareImageUrl(dataUrl)
    } catch (error) {
      console.warn('Share image generation failed.', error)
    } finally {
      setIsShareGenerating(false)
    }
  }

  const handleHistoryNoteChange = (record: LocalHistoryRecord, note: string) => {
    const nextRecords = updateLocalHistoryRecordNote(record.id, note)
    setHistoryRecords((current) => {
      const localRecord = nextRecords.find((item) => item.id === record.id)
      const nextRecord = localRecord ?? { ...record, note: note || undefined }
      return current.map((item) => (item.id === record.id ? nextRecord : item))
    })

    if (!auth.session) return

    updateSupabaseHistoryNote(record.id, note).catch((error) => {
      console.warn('Failed to update Supabase guantian history note.', error)
    })
  }

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language)
  }, [language])

  useEffect(() => {
    if (!isAboutOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAboutOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAboutOpen])

  useEffect(() => {
    const preload = new Image()
    preload.decoding = 'async'
    preload.src = window.matchMedia('(max-width: 760px)').matches
      ? tabletopBackgroundLightWebp
      : tabletopBackgroundWebp
  }, [])

  useEffect(() => {
    const audio = createNatureAudioController('guantian')
    audio.start()

    const resumeAudio = () => audio.start()
    window.addEventListener('pointerdown', resumeAudio, { once: true })
    window.addEventListener('keydown', resumeAudio, { once: true })

    return () => {
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current)
      window.removeEventListener('pointerdown', resumeAudio)
      window.removeEventListener('keydown', resumeAudio)
      audio.stop()
    }
  }, [])

  useEffect(() => {
    if (!snapshot.result) return undefined

    const timer = window.setTimeout(() => setIsResultRevealed(true), 1000)
    return () => window.clearTimeout(timer)
  }, [snapshot.result])

  useEffect(() => {
    if (!snapshot.result || !seenMarkdown) return

    const historyKey = `${snapshot.result.generatedAt}:${seenMarkdown}`
    if (savedHistoryKeyRef.current === historyKey) return

    const record = makeLocalHistoryRecord(snapshot.result, seenMarkdown)
    const records = saveLocalHistoryRecord(record)
    savedHistoryKeyRef.current = historyKey
    setHistoryRecords(records)
    setSelectedHistoryId(record.id)

    if (!auth.session?.user.id) return

    saveSupabaseHistoryRecord(record, auth.session.user.id)
      .then((remoteRecords) => {
        setHistoryRecords(remoteRecords)
        setSelectedHistoryId(record.id)
      })
      .catch((error) => {
        console.warn('Failed to save Supabase guantian history.', error)
      })
  }, [auth.session, seenMarkdown, snapshot.result])

  useEffect(() => {
    if (!hasEnteredSpace) return undefined
    if (!onboardingStorageKey) return undefined
    if (window.localStorage.getItem(onboardingStorageKey) === 'seen') return undefined

    const timer = window.setTimeout(() => {
      setOnboardingPage(0)
      setIsOnboardingOpen(true)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [hasEnteredSpace, onboardingStorageKey])

  useEffect(() => {
    if (!isOnboardingOpen || onboardingPage !== copy.onboardingPages.length - 1) return undefined

    const timer = window.setTimeout(() => {
      closeOnboarding()
    }, 5700)

    return () => window.clearTimeout(timer)
  }, [closeOnboarding, copy.onboardingPages.length, isOnboardingOpen, onboardingPage])

  if (isEntrance) {
    return (
      <StageShell smallScreenText={copy.smallScreen}>
        <div
          className={[
            'ritual-2d-shell',
            'ritual-entrance-shell',
            hasEnteredSpace ? 'is-entered-space' : 'is-before-entry',
            isEnteringRitual ? 'is-entering-ritual' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <TopToolBar
            copy={copy}
            languageToggle={copy.languageToggle}
            hasEnteredSpace={hasEnteredSpace}
            isAccountVisible={Boolean(auth.isAuthEnabled && auth.session)}
            isAccountOpen={isAccountOpen}
            accountEmail={auth.user?.email}
            onToggleLanguage={toggleLanguage}
            onToggleAccount={() => setIsAccountOpen((current) => !current)}
            onSignOut={() => void handleSignOut()}
            onOpenAbout={openAbout}
            onOpenHistory={openHistory}
            onOpenOnboarding={openOnboarding}
          />
          <div className="entrance-scene" aria-hidden="true">
            <div className="entrance-photo" />
            <div className="entrance-air entrance-air-a" />
            <div className="entrance-air entrance-air-b" />
            <div className="entrance-curtain-breath" />
            <div className="entrance-smoke entrance-smoke-a" />
            <div className="entrance-smoke entrance-smoke-b" />
            <div className="entrance-vignette" />
          </div>

          <section className="ritual-entrance" aria-label={copy.appTitle}>
            <p className="entrance-kicker">{copy.appKicker}</p>
            <h1>{copy.appTitle}</h1>
            <p className="entrance-subtitle">{copy.appSubtitle}</p>
            {auth.isAuthEnabled && !auth.session && !isLocalAuthBypassed ? (
              <div className="entrance-auth" aria-live="polite">
                <div className="entrance-auth-email">
                  <input
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder={copy.authEmailPlaceholder}
                    inputMode="email"
                    autoComplete="email"
                  />
                  <button type="button" onClick={() => void handleMagicLink()} disabled={!authEmail.trim()}>
                    {copy.authSendLink}
                  </button>
                </div>
                {import.meta.env.DEV ? (
                  <button
                    type="button"
                    className="entrance-auth-local"
                    onClick={() => {
                      setIsLocalAuthBypassed(true)
                      setAuthNotice(null)
                    }}
                  >
                    {copy.authLocalBypass}
                  </button>
                ) : null}
                {authNotice ? <p className="entrance-auth-notice">{authNotice}</p> : null}
              </div>
            ) : null}
            {auth.isAuthEnabled && auth.session && !hasEnteredSpace ? (
              <div className="entrance-auth entrance-auth-return" aria-live="polite">
                <p className="entrance-auth-session">
                  <span>{copy.authSignedIn}</span>
                  <strong>{auth.user?.email}</strong>
                </p>
                <button type="button" className="entrance-auth-enter" onClick={enterRitualSpace}>
                  {copy.authEnterWithEmail}
                </button>
                {authNotice ? <p className="entrance-auth-notice">{authNotice}</p> : null}
              </div>
            ) : null}
            {hasEnteredSpace ? (
              <form
              className="entrance-question"
              onSubmit={(event) => {
                event.preventDefault()
                beginFromEntrance()
              }}
            >
              <label htmlFor="entrance-question">{copy.questionLabel}</label>
              <div>
                <input
                  id="entrance-question"
                  value={ritual.question}
                  onChange={(event) => ritual.setQuestion(event.target.value)}
                  placeholder={copy.questionPlaceholder}
                  autoComplete="off"
                />
                <button type="submit" disabled={!canBegin || isEnteringRitual || isClaimingCast || auth.isAuthLoading}>
                  {copy.beginButton}
                </button>
              </div>
              {authNotice ? <p className="entrance-question-notice">{authNotice}</p> : null}
              </form>
            ) : null}
          </section>
          {isOnboardingOpen ? (
            <section className="onboarding-veil" aria-label={copy.book} onClick={advanceOnboarding}>
              <button
                type="button"
                className="onboarding-language-button"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleLanguage()
                }}
              >
                {copy.languageToggle}
              </button>
              <div className="onboarding-page">
                <p>{copy.onboardingPages[onboardingPage]}</p>
              </div>
              <button
                type="button"
                className="onboarding-home-button"
                aria-label={copy.home}
                onClick={(event) => {
                  event.stopPropagation()
                  closeOnboarding()
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4.8 11.2 12 5l7.2 6.2" />
                  <path d="M7.3 10.4v8.1h9.4v-8.1" />
                  <path d="M10 18.5v-4.6h4v4.6" />
                </svg>
              </button>
            </section>
          ) : null}
          {isHistoryOpen ? (
            <HistoryPanel
              records={historyRecords}
              activeRecordId={selectedHistoryId}
              copy={copy}
              language={language}
              onSelect={(record) => setSelectedHistoryId(record.id)}
              onNoteChange={handleHistoryNoteChange}
              onClose={() => setIsHistoryOpen(false)}
            />
          ) : null}
          {isAboutOpen ? <AboutPanel copy={copy} onClose={() => setIsAboutOpen(false)} /> : null}

          {import.meta.env.DEV ? (
            <button
              type="button"
              className="debug-complete-button"
              onClick={() => {
                resetInterpretation()
                setShowChangeDetails(false)
                ritual.completeDebugHexagram()
              }}
            >
              {copy.testComplete}
            </button>
          ) : null}
        </div>
      </StageShell>
    )
  }

  return (
    <StageShell smallScreenText={copy.smallScreen}>
      <div
        className={[
          'ritual-2d-shell',
          isResultRevealed ? 'is-result-revealed' : '',
          isReadingHexagram ? 'is-reading-hexagram' : '',
          isObservingHexagram ? 'is-observing-hexagram' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <InkLandscape />
        <TopToolBar
          copy={copy}
          languageToggle={copy.languageToggle}
          hasEnteredSpace={hasEnteredSpace}
          isAccountVisible={Boolean(auth.isAuthEnabled && auth.session)}
          isAccountOpen={isAccountOpen}
          accountEmail={auth.user?.email}
          onToggleLanguage={toggleLanguage}
          onToggleAccount={() => setIsAccountOpen((current) => !current)}
          onSignOut={() => void handleSignOut()}
          onOpenAbout={openAbout}
          onOpenHistory={openHistory}
          onOpenOnboarding={openOnboarding}
        />

        <header className="ritual-2d-header">
          <div>
            <p>{copy.appKicker}</p>
            <h1>{copy.appTitle}</h1>
          </div>
          <span>{copy.modePaused}</span>
        </header>

        {import.meta.env.DEV ? (
          <button
            type="button"
            className="debug-complete-button"
            onClick={() => {
              resetInterpretation()
              setShowChangeDetails(false)
              setIsResultRevealed(false)
              ritual.completeDebugHexagram()
            }}
          >
            {copy.testComplete}
          </button>
        ) : null}

        <section className="ritual-2d-table" aria-label="yarrow stalks on the table">
        <div className="wood-table">
          {snapshot.step === 'chooseSplit' && snapshot.lineIndex === 1 && snapshot.changeIndex === 1 ? (
            <p className="split-choice-hint">{copy.splitChoiceHint}</p>
          ) : null}
          <YarrowSvg
            stalks={snapshot.stalks}
            canChooseSplit={snapshot.canChooseSplit}
            isReservingOne={snapshot.step === 'reserveOne'}
            onChooseSplit={ritual.chooseSplit}
          />
        </div>
        </section>

        {!(snapshot.result && isResultRevealed) ? (
        <section className="manual-records" aria-label={copy.recordsTitle}>
        <div className="record-heading">
          <h2>{copy.recordsTitle}</h2>
          {snapshot.changeRecords.length ? (
            <button type="button" onClick={() => setShowChangeDetails((current) => !current)}>
              {showChangeDetails ? copy.collapseChanges : copy.expandChanges}
            </button>
          ) : null}
        </div>
        <div className="record-current-status" aria-live="polite">
          <span>
            {copy.currentPrefix}: {language === 'zh' ? '第 ' : ''}{statusCard.lineIndex} {language === 'zh' ? '爻' : copy.linePrefix} · {language === 'zh' ? '第 ' : ''}{statusCard.changeIndex} {copy.changePrefix}
          </span>
          <strong>{statusCard.title}</strong>
          {statusCard.detail ? <small>{statusCard.detail}</small> : null}
        </div>
        <div className="line-summary-list">
          {snapshot.lineRecords.map((line) => (
            <p key={`line-summary-${line.index}`}>
              <span>{language === 'zh' ? `第 ${line.index} 爻` : `${copy.linePrefix} ${line.index}`}</span>
              <YaoMark isYang={line.isYang} copy={copy} />
              {formatLineValue(line.value, copy)} / {line.value} / {line.isChanging ? copy.changingLine : copy.unchangedLine}
            </p>
          ))}
          {!snapshot.lineRecords.length ? <p className="empty-record">{copy.noLineYet}</p> : null}
        </div>
        {currentLineChanges.length ? (
          <div className="current-line-records" aria-label={copy.currentLineInProgress}>
            <h3>{language === 'zh' ? `第 ${snapshot.lineIndex} ${copy.currentLineInProgress}` : `${copy.linePrefix} ${snapshot.lineIndex} ${copy.currentLineInProgress}`}</h3>
            {currentLineChanges.map((change) => (
              <p key={`current-${change.lineIndex}-${change.changeIndex}`}>
                <span>
                  {language === 'zh' ? `第 ${change.lineIndex} 爻 · 第 ${change.changeIndex} 变` : `${copy.linePrefix} ${change.lineIndex} · ${copy.changePrefix} ${change.changeIndex}`}
                </span>
                {formatChangeDetail(change, copy)}
              </p>
            ))}
          </div>
        ) : null}
        {showChangeDetails ? (
          <div className="record-scroll" aria-label={copy.expandChanges}>
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
                  {language === 'zh' ? `第 ${change.lineIndex} 爻 / 第 ${change.changeIndex} 变` : `${copy.linePrefix} ${change.lineIndex} / ${copy.changePrefix} ${change.changeIndex}`}
                </span>
                {formatChangeDetail(change, copy)}
              </p>
            ))}
          </div>
        ) : null}
        </section>
        ) : null}

        {snapshot.result && !isResultRevealed ? <p className="hexagram-settling">{copy.hexagramComplete}</p> : null}

        {snapshot.result && isResultRevealed ? (
          <section className="manual-result" aria-label={copy.hexagramComplete}>
          <div>
            <p>{copy.resultQuestion}: {snapshot.result.question}</p>
            <div className="manual-result-actions">
              <button
                type="button"
                onClick={() => {
                  resetInterpretation()
                  setShowChangeDetails(false)
                  setIsResultRevealed(false)
                  ritual.reset()
                }}
              >
                {copy.resetButton}
              </button>
            </div>
          </div>
          <div className="manual-lines">
            {[...snapshot.result.lines].reverse().map((line) => (
              <p key={line.index}>
                <span>{language === 'zh' ? `第 ${line.index} 爻` : `${copy.linePrefix} ${line.index}`}</span>
                <YaoMark isYang={line.isYang} copy={copy} />
                <em>{formatLineValue(line.value, copy)}</em>
              </p>
            ))}
          </div>
          <dl>
            <div className="result-summary-item">
              <dt>{copy.primaryGua}</dt>
              <dd>
                <strong>{getHexagramName(snapshot.result.primaryBinary, language)}</strong>
                <HexagramMark binary={snapshot.result.primaryBinary} copy={copy} />
              </dd>
            </div>
            <div className="result-summary-item">
              <dt>{copy.movingLines}</dt>
              <dd>
                <strong>{formatMovingLines(snapshot.result, language, copy)}</strong>
              </dd>
            </div>
            <div className="result-summary-item">
              <dt>{copy.changedGua}</dt>
              <dd>
                <strong>{getHexagramName(snapshot.result.changedBinary, language)}</strong>
                <HexagramMark binary={snapshot.result.changedBinary} copy={copy} />
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="manual-insight-button"
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
              const input = buildAIInterpretationInput(snapshot.result.question, snapshot.result, language)
              const prompt = buildInterpretationPrompt(input)
              try {
                const startedAt = window.performance.now()
                const output = await (async () => {
                  try {
                    return await localApiProvider.interpret(prompt)
                  } catch (error) {
                    console.warn('Local LLM proxy failed; falling back to mockProvider.', error)
                    return mockProvider.interpret(prompt)
                  }
                })()
                const elapsed = window.performance.now() - startedAt
                const remainingWait = Math.max(0, 4800 - elapsed)
                if (remainingWait > 0) {
                  await new Promise((resolve) => window.setTimeout(resolve, remainingWait))
                }
                setSeenMarkdown(output.markdown)
              } finally {
                setIsSeeingHexagram(false)
              }
            }}
          >
            {copy.insightButton}
          </button>
          </section>
        ) : null}

        {snapshot.result && isResultRevealed && isReadingHexagram ? (
          <>
          {isObservingHexagram ? <p className="reading-observing">{copy.observing}</p> : null}
          {seenMarkdown ? (
            <>
            <section className="interpretation-note reading-paper" aria-label={copy.insightButton}>
                <h2>{copy.insightButton}</h2>
                {seenSelection ? (
                  <InterpretationSourcePanel
                    selection={seenSelection}
                    primaryBinary={snapshot.result.primaryBinary}
                    changedBinary={snapshot.result.changedBinary}
                    movingLines={snapshot.result.changedLines}
                    copy={copy}
                    language={language}
                  />
                ) : null}
                {renderInterpretationMarkdown(seenMarkdown)}
                <div className="share-reading-actions">
                  <button type="button" onClick={() => void handleShareReading()} disabled={isShareGenerating}>
                    {isShareGenerating ? copy.shareWriting : copy.shareButton}
                  </button>
                </div>
          </section>
          <div className="share-render-host" aria-hidden="true">
            <div ref={sharePosterRef}>
              <SharePoster result={snapshot.result} markdown={seenMarkdown} copy={copy} language={language} />
            </div>
          </div>
          {shareImageUrl ? (
            <section className="share-preview" aria-label={copy.sharePreviewTitle}>
              <div>
                <p>{copy.sharePreviewTitle}</p>
                <a href={shareImageUrl} download={`guantian-${snapshot.result.generatedAt.slice(0, 10)}.png`}>
                  {copy.shareSave}
                </a>
              </div>
              <img src={shareImageUrl} alt={copy.sharePreviewTitle} />
              <small>{copy.shareSaveHint}</small>
            </section>
          ) : null}
          <button
            type="button"
            className="reading-home-button"
            aria-label={copy.home}
            onClick={() => {
              resetInterpretation()
              setShowChangeDetails(false)
              setIsResultRevealed(false)
              ritual.reset()
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.8 11.2 12 5l7.2 6.2" />
              <path d="M7.3 10.4v8.1h9.4v-8.1" />
              <path d="M10 18.5v-4.6h4v4.6" />
            </svg>
          </button>
          </>
          ) : null}
          </>
        ) : null}
        {isOnboardingOpen ? (
          <section className="onboarding-veil" aria-label={copy.book} onClick={advanceOnboarding}>
            <button
              type="button"
              className="onboarding-language-button"
              onClick={(event) => {
                event.stopPropagation()
                toggleLanguage()
              }}
            >
              {copy.languageToggle}
            </button>
            <div className="onboarding-page">
              <p>{copy.onboardingPages[onboardingPage]}</p>
            </div>
            <button
              type="button"
              className="onboarding-home-button"
              aria-label={copy.home}
              onClick={(event) => {
                event.stopPropagation()
                closeOnboarding()
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4.8 11.2 12 5l7.2 6.2" />
                <path d="M7.3 10.4v8.1h9.4v-8.1" />
                <path d="M10 18.5v-4.6h4v4.6" />
              </svg>
            </button>
          </section>
        ) : null}
        {isHistoryOpen ? (
          <HistoryPanel
            records={historyRecords}
            activeRecordId={selectedHistoryId}
            copy={copy}
            language={language}
            onSelect={(record) => setSelectedHistoryId(record.id)}
            onNoteChange={handleHistoryNoteChange}
            onClose={() => setIsHistoryOpen(false)}
          />
        ) : null}
        {isAboutOpen ? <AboutPanel copy={copy} onClose={() => setIsAboutOpen(false)} /> : null}
      </div>
    </StageShell>
  )
}
