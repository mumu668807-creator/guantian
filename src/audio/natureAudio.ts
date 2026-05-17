import type { ThemeId } from '../theme/themes'

export type NatureAudioController = {
  start: () => void
  stop: () => void
  setMuted: (muted: boolean) => void
}

export function createNatureAudioController(themeId: ThemeId): NatureAudioController {
  // MVP 0.3 placeholder:
  // Later wire quiet wind, distant birds, and stream loops here.
  // Keep user gesture / autoplay restrictions in mind before starting real audio.
  void themeId

  return {
    start: () => undefined,
    stop: () => undefined,
    setMuted: () => undefined,
  }
}
