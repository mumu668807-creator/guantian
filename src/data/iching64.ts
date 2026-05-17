export type YaoText = {
  line: 1 | 2 | 3 | 4 | 5 | 6
  name: string
  text: string
}

export type HexagramText = {
  id: number
  name: string
  binary: string
  judgment: string
  yaoTexts: YaoText[]
}
