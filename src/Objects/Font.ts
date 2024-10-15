export interface FontFace {
  family: string
  weight?: string
  style?: string
}

export class Font {
  url: URL
  fontFace: FontFace

  constructor (url: URL, fontFace: FontFace) {
    this.url = url
    this.fontFace = fontFace
  }
}
