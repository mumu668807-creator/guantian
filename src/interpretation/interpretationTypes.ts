export type AIInterpretationInput = {
  language: 'en' | 'zh'
  userQuestion: string
  primaryHexagram: {
    name: string
    binary: string
    judgment: string
  }
  changedHexagram: {
    name: string
    binary: string
    judgment: string
  }
  movingLines: number[]
  movingLineNames: string[]
  movingLineTexts: {
    line: number
    title: string
    text: string
  }[]
  divinationRule: string
  mainTexts: {
    title: string
    text: string
  }[]
  supportTexts: {
    title: string
    text: string
  }[]
}

export type AIInterpretationOutput = {
  markdown: string
}
