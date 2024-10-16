/**
 * An interface representing a CSS Font Face.  
 * See https://developer.mozilla.org/en-US/docs/Web/API/FontFace
 */
export interface FontFace {
  family: string
  weight?: string
  style?: string
}

/**
 * A class representing a remote font to be loaded
 */
export class Font {
  url: URL
  fontFace: FontFace

  /**
   * Creates a remote font object
   * @param url The remote URL or local path to load the font from
   * @param fontFace A FontFace object defining the properties of the font
   */
  constructor (url: URL, fontFace: FontFace) {
    this.url = url
    this.fontFace = fontFace
  }
}
