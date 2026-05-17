export type ThemeId = 'guantian' | 'wenye'

export type RitualTheme = {
  id: ThemeId
  label: string
  palette: {
    sky: string
    fog: string
    grass: string
    grassDark: string
    mountainNear: string
    mountainFar: string
    water: string
    robe: string
    robeShadow: string
    hand: string
    wood: string
    woodTop: string
    text: string
    warmLight: string
  }
}

export const themes: Record<ThemeId, RitualTheme> = {
  guantian: {
    id: 'guantian',
    label: '观天',
    palette: {
      sky: '#9aa6ad',
      fog: '#c4c7bf',
      grass: '#5f6f4c',
      grassDark: '#3f5138',
      mountainNear: '#6c756f',
      mountainFar: '#8c9693',
      water: '#566f78',
      robe: '#9aa5aa',
      robeShadow: '#667177',
      hand: '#b18a6f',
      wood: '#4b3425',
      woodTop: '#6b4b34',
      text: '#e8ddc8',
      warmLight: '#d7b273',
    },
  },
  wenye: {
    id: 'wenye',
    label: '问夜',
    palette: {
      sky: '#10141b',
      fog: '#34404a',
      grass: '#1d2b2f',
      grassDark: '#111a1e',
      mountainNear: '#1c2630',
      mountainFar: '#2e3d4a',
      water: '#233d4d',
      robe: '#2f3c49',
      robeShadow: '#141c24',
      hand: '#9c7562',
      wood: '#2a211f',
      woodTop: '#40322d',
      text: '#d8dee3',
      warmLight: '#7ea8b8',
    },
  },
}

export const activeTheme = themes.guantian
