import type { ThemeId } from '../theme/themes'

export type NatureAudioController = {
  start: () => void
  stop: () => void
  setMuted: (muted: boolean) => void
}

export function createNatureAudioController(themeId: ThemeId): NatureAudioController {
  void themeId
  let audioContext: AudioContext | null = null
  let masterGain: GainNode | null = null
  let windSource: AudioBufferSourceNode | null = null
  let streamSource: AudioBufferSourceNode | null = null
  let birdTimer: number | null = null
  let muted = false

  const createNoiseBuffer = (context: AudioContext, seconds: number, softness: number) => {
    const length = Math.floor(context.sampleRate * seconds)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0

    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1
      last = last * softness + white * (1 - softness)
      data[index] = last
    }

    return buffer
  }

  const ensureContext = () => {
    if (audioContext) return audioContext

    const context = new AudioContext()
    const gain = context.createGain()
    gain.gain.value = muted ? 0 : 0.045
    gain.connect(context.destination)

    const windFilter = context.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 520
    windFilter.Q.value = 0.45

    const streamFilter = context.createBiquadFilter()
    streamFilter.type = 'bandpass'
    streamFilter.frequency.value = 920
    streamFilter.Q.value = 0.58

    const windGain = context.createGain()
    windGain.gain.value = 0.32

    const streamGain = context.createGain()
    streamGain.gain.value = 0.18

    windSource = context.createBufferSource()
    windSource.buffer = createNoiseBuffer(context, 7, 0.985)
    windSource.loop = true
    windSource.connect(windFilter).connect(windGain).connect(gain)
    windSource.start()

    streamSource = context.createBufferSource()
    streamSource.buffer = createNoiseBuffer(context, 5, 0.82)
    streamSource.loop = true
    streamSource.connect(streamFilter).connect(streamGain).connect(gain)
    streamSource.start()

    const scheduleBird = () => {
      if (!audioContext || !masterGain) return
      const delay = 9000 + Math.random() * 17000
      birdTimer = window.setTimeout(() => {
        if (!audioContext || !masterGain || muted) {
          scheduleBird()
          return
        }

        const now = audioContext.currentTime
        const oscillator = audioContext.createOscillator()
        const birdGain = audioContext.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(1880 + Math.random() * 260, now)
        oscillator.frequency.exponentialRampToValueAtTime(2460 + Math.random() * 340, now + 0.18)
        birdGain.gain.setValueAtTime(0, now)
        birdGain.gain.linearRampToValueAtTime(0.018, now + 0.04)
        birdGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42)
        oscillator.connect(birdGain).connect(masterGain)
        oscillator.start(now)
        oscillator.stop(now + 0.48)
        scheduleBird()
      }, delay)
    }

    audioContext = context
    masterGain = gain
    scheduleBird()
    return context
  }

  return {
    start: () => {
      const context = ensureContext()
      void context.resume().catch(() => undefined)
    },
    stop: () => {
      if (birdTimer) window.clearTimeout(birdTimer)
      birdTimer = null
      windSource?.stop()
      streamSource?.stop()
      void audioContext?.close()
      audioContext = null
      masterGain = null
      windSource = null
      streamSource = null
    },
    setMuted: (value: boolean) => {
      muted = value
      if (masterGain) masterGain.gain.value = muted ? 0 : 0.045
    },
  }
}
