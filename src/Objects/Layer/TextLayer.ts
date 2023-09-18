import { type Canvas, createCanvas } from 'canvas'
import { Layer, type LayerType, type FillStyle, type Anchor, type Point, type Size } from './Layer'

export interface TextStyle {
  font: string
  fillStyle: FillStyle
}

export interface StyleReplace {
  startSymbol: string
  endSymbol: string
  style: TextStyle
}

export class TextLayer extends Layer {
  text: string
  style: TextStyle
  align: Anchor
  wrapText: boolean
  scaleText: boolean
  textReplace: Map<string, string>
  styleReplace: StyleReplace[]

  constructor (type: LayerType, description: string, origin: Point, anchor: Anchor, size: Size, operations: GlobalCompositeOperation[], text: string, style: TextStyle, align: Anchor, wrapText: boolean, scaleText: boolean, textReplace: Map<string, string>, styleReplace: StyleReplace[]) {
    super(type, description, origin, anchor, size, operations)
    this.text = text
    this.style = style
    this.align = align
    this.wrapText = wrapText
    this.scaleText = scaleText
    this.textReplace = textReplace
    this.styleReplace = styleReplace
  }

  draw = async (): Promise<Canvas> => {
    const canvas = createCanvas(this.size.width, this.size.height)
    const context = canvas.getContext('2d')

    // Perform text replacements
    const replacedText = this.getReplacedText()

    // Sperate and Perform style replacements
    const styledText = this.getReplacedStyles(replacedText)

    // Seperate paragraphs and line breaks

    // Perform Word Wrapping and Scaling

    // Draw text to canvas

    return canvas
  }

  getReplacedText = (): string => {
    let output = this.text

    for (const mapArray of this.textReplace) {
      const search = mapArray[0]
      const replace = mapArray[1]
      output = output.split(search).join(replace)
    }

    return output
  }

  getReplacedStyles = (text: string): Array<{ text: string, style: TextStyle }> => {
    const styledText: Array<{ text: string, style: TextStyle }> = [{ text, style: this.style }]
    for (let index = 0; index < this.styleReplace.length; index++) {
      const styleReplacer = this.styleReplace[index]
      for (let textIndex = 0; textIndex < styledText.length; textIndex++) {
        const styledTextItem = styledText[textIndex]
        const splitText = styledTextItem.text.split(styleReplacer.startSymbol)
        styledText[textIndex] = { text: splitText[0], style: styledTextItem.style }
        styledText[textIndex] = { text: splitText.slice(1).join(styleReplacer.startSymbol), style: styleReplacer.style }
      }
    }
  }
}
