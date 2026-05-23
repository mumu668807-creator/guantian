import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { localApiProvider } from '../ai/localApiProvider'
import { mockProvider } from '../ai/mockProvider'
import { claimDailyCast, sendMagicLink, signInWithGoogle } from '../auth/supabaseClient'
import { useGuantianAuth } from '../auth/useGuantianAuth'
import { createNatureAudioController } from '../audio/natureAudio'
import { COPY_BY_LANGUAGE, type Language } from '../constants/copy'
import { selectInterpretation, type InterpretationSelection } from '../domain/interpretation'
import { getHexagramByBinary, getYaoText } from '../domain/hexagramLookup'
import { buildAIInterpretationInput } from '../interpretation/interpretationInput'
import { buildInterpretationPrompt } from '../interpretation/interpretationPrompt'
import { renderInterpretationMarkdown } from '../interpretation/interpretationRenderer'
import { useStageScale } from '../hooks/useStageScale'
import { useManualRitualMachine } from '../state/useManualRitualMachine'
import { InkLandscape } from './InkLandscape'
import { YarrowSvg } from './YarrowSvg'
import type { ManualRitualSnapshot } from '../state/useManualRitualMachine'
import type { ManualHexagramResult, ManualLineRecord } from '../domain/manualDayan'

type RitualCopy = (typeof COPY_BY_LANGUAGE)[Language]

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
  const [language, setLanguage] = useState<Language>('en')
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
  const [isEmailEntryOpen, setIsEmailEntryOpen] = useState(false)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [onboardingPage, setOnboardingPage] = useState(0)
  const enterTimerRef = useRef<number | null>(null)
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
  }
  const isEntrance = snapshot.step === 'idle' || snapshot.step === 'awaitingQuestion'
  const isReadingHexagram = isSeeingHexagram || seenMarkdown !== null
  const isObservingHexagram = isSeeingHexagram && seenMarkdown === null
  const hasEnteredSpace = !auth.isAuthEnabled || Boolean(auth.session)
  const toggleLanguage = () => setLanguage((current) => (current === 'en' ? 'zh' : 'en'))
  const onboardingStorageKey = auth.user?.id ? `guantian:onboarding:${auth.user.id}` : null
  const closeOnboarding = useCallback(() => {
    if (onboardingStorageKey) window.localStorage.setItem(onboardingStorageKey, 'seen')
    setIsOnboardingOpen(false)
    setOnboardingPage(0)
  }, [onboardingStorageKey])
  const openOnboarding = useCallback(() => {
    setOnboardingPage(0)
    setIsOnboardingOpen(true)
  }, [])
  const advanceOnboarding = useCallback(() => {
    if (onboardingPage >= copy.onboardingPages.length - 1) {
      closeOnboarding()
      return
    }
    setOnboardingPage((current) => current + 1)
  }, [closeOnboarding, copy.onboardingPages.length, onboardingPage])
  const beginFromEntrance = async () => {
    if (!canBegin || isEnteringRitual) return
    if (auth.isAuthEnabled && !auth.session) {
      setAuthNotice(copy.authRequired)
      return
    }

    if (auth.isAuthEnabled) {
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

  const handleGoogleSignIn = async () => {
    setAuthNotice(null)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.warn('Google sign in failed.', error)
      setAuthNotice(copy.authError)
    }
  }

  const handleMagicLink = async () => {
    if (!authEmail.trim()) return
    setAuthNotice(null)
    try {
      await sendMagicLink(authEmail.trim())
      setAuthNotice(copy.authCheckMail)
    } catch (error) {
      console.warn('Magic link failed.', error)
      setAuthNotice(copy.authError)
    }
  }

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
    if (!onboardingStorageKey) return undefined
    if (window.localStorage.getItem(onboardingStorageKey) === 'seen') return undefined

    const timer = window.setTimeout(() => {
      setOnboardingPage(0)
      setIsOnboardingOpen(true)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [onboardingStorageKey])

  useEffect(() => {
    if (!isOnboardingOpen || onboardingPage !== copy.onboardingPages.length - 1) return undefined

    const timer = window.setTimeout(() => {
      closeOnboarding()
    }, 4200)

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
          <button type="button" className="language-switch-button" onClick={toggleLanguage}>
            {copy.languageToggle}
          </button>
          {hasEnteredSpace ? (
            <button type="button" className="onboarding-book-button" aria-label={copy.book} onClick={openOnboarding}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5.2c2.7-.8 4.9-.5 7 1.1 2.1-1.6 4.3-1.9 7-1.1v13.5c-2.7-.8-4.9-.5-7 1.1-2.1-1.6-4.3-1.9-7-1.1Z" />
                <path d="M12 6.3v13.5" />
              </svg>
            </button>
          ) : null}
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
            {auth.isAuthEnabled && !auth.session ? (
              <div className="entrance-auth" aria-live="polite">
                <button type="button" className="entrance-auth-google" onClick={() => void handleGoogleSignIn()}>
                  {copy.authEnterWithGoogle}
                </button>
                <button type="button" className="entrance-auth-enter" onClick={() => setIsEmailEntryOpen((current) => !current)}>
                  {copy.authEnterWithEmail}
                </button>
                {isEmailEntryOpen ? (
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
                ) : null}
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
              </form>
            ) : null}
          </section>
          {isOnboardingOpen ? (
            <section className="onboarding-veil" aria-label={copy.book} onClick={advanceOnboarding}>
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
        <button type="button" className="language-switch-button" onClick={toggleLanguage}>
          {copy.languageToggle}
        </button>
        {hasEnteredSpace ? (
          <button type="button" className="onboarding-book-button" aria-label={copy.book} onClick={openOnboarding}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5.2c2.7-.8 4.9-.5 7 1.1 2.1-1.6 4.3-1.9 7-1.1v13.5c-2.7-.8-4.9-.5-7 1.1-2.1-1.6-4.3-1.9-7-1.1Z" />
              <path d="M12 6.3v13.5" />
            </svg>
          </button>
        ) : null}

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
          <YarrowSvg
            stalks={snapshot.stalks}
            canChooseSplit={snapshot.canChooseSplit}
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
          </section>
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
      </div>
    </StageShell>
  )
}
