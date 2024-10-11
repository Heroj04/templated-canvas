export interface FontFace {
  family: string
  weight: string | undefined
  style: string | undefined
}

export class Font {
  url: URL
  fontFace: FontFace

  constructor (url: URL, fontFace: FontFace) {
    this.url = url
    this.fontFace = fontFace
  }
}
