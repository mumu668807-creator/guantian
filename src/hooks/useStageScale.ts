import { useEffect, useState } from 'react'

export const stageDesign = {
  width: 1600,
  height: 900,
}

const compactQuery = '(max-width: 760px)'

const getScale = () => {
  if (typeof window === 'undefined') return 1

  return Math.max(window.innerWidth / stageDesign.width, window.innerHeight / stageDesign.height)
}

const getIsCompact = () => {
  if (typeof window === 'undefined') return false

  return window.matchMedia(compactQuery).matches
}

export function useStageScale() {
  const [scale, setScale] = useState(getScale)
  const [isCompact, setIsCompact] = useState(getIsCompact)

  useEffect(() => {
    const update = () => {
      setScale(getScale())
      setIsCompact(getIsCompact())
    }

    update()
    window.addEventListener('resize', update)

    return () => window.removeEventListener('resize', update)
  }, [])

  return { scale, isCompact }
}
