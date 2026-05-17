export type AIInterpretationInput = {
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
  movingLineTexts: {
    line: number
    title: string
    text: string
  }[]
  divinationRule: string
}

export type AIInterpretationOutput = {
  markdown: string
}
