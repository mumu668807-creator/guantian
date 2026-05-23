import { useEffect, useState } from 'react'

export const stageDesign = {
  width: 1600,
  height: 900,
}

const getScale = () => {
  if (typeof window === 'undefined') return 1

  return Math.max(window.innerWidth / stageDesign.width, window.innerHeight / stageDesign.height)
}

export function useStageScale() {
  const [scale, setScale] = useState(getScale)

  useEffect(() => {
    const updateScale = () => setScale(getScale())

    updateScale()
    window.addEventListener('resize', updateScale)

    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return scale
}
