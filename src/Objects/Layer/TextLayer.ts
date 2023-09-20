import { type Canvas, type CanvasRenderingContext2D, createCanvas } from 'canvas'
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

export interface LineMetrics {
  maxAscent: number
  maxDescent: number
  width: number
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
    const styledText = TextLayer.replaceTextStyles(replacedText, this.style, this.styleReplace)

    // Seperate paragraphs and line breaks
    // TODO - Work out how to do paragraphs
    const styledTextLines: Array<Array<{ text: string, style: TextStyle }>> = new Array<Array<{ text: string, style: TextStyle }>>()
    styledTextLines.push(new Array<{ text: string, style: TextStyle }>())
    styledText.forEach(styledTextItem => {
      const lines = TextLayer.seperateLineBreaks(styledTextItem.text)
      styledTextLines[styledTextLines.length - 1].push({ text: lines[0], style: styledTextItem.style })
      for (let index = 1; index < lines.length; index++) {
        const lineText = lines[index]
        styledTextLines.push(new Array<{ text: string, style: TextStyle }>())
        styledTextLines[styledTextLines.length - 1].push({ text: lineText, style: styledTextItem.style })
      }
    })

    // Perform Word Wrapping/Scaling and Get Line Metrics
    // TODO - Word Wrapping/Scaling
    const styledTextLinesWithMetrics: Array<{ metrics: LineMetrics, text: Array<{ text: string, style: TextStyle, metrics?: TextMetrics }> }> = new Array<{ metrics: LineMetrics, text: Array<{ text: string, style: TextStyle, metrics?: TextMetrics }> }>()
    styledTextLines.forEach(line => {
      styledTextLinesWithMetrics.push({ metrics: { maxAscent: 0, maxDescent: 0, width: 0 }, text: line })
    })

    let totalHeight = 0
    styledTextLinesWithMetrics.forEach(line => {
      line.text.forEach(styledText => {
        TextLayer.setContextTextStyle(context, styledText.style)
        styledText.metrics = context.measureText(styledText.text)
        line.metrics.maxAscent = line.metrics.maxAscent > styledText.metrics.fontBoundingBoxAscent ? line.metrics.maxAscent : styledText.metrics.fontBoundingBoxAscent
        line.metrics.maxDescent = line.metrics.maxDescent > styledText.metrics.fontBoundingBoxDescent ? line.metrics.maxDescent : styledText.metrics.fontBoundingBoxDescent
        line.metrics.width += styledText.metrics.width
      })
      totalHeight += line.metrics.maxAscent + line.metrics.maxDescent
    })

    // Draw text to canvas
    // Get start point vertically
    let x = 0
    let y = 0
    switch (this.align.vertical) {
      case 'Top':
        y = 0
        break
      case 'Middle':
        y = (this.size.height / 2) - (totalHeight / 2)
        break
      case 'Bottom':
        y = this.size.height - totalHeight
        break
    }
    // for each line
    for (let index = 0; index < styledTextLinesWithMetrics.length; index++) {
      const line = styledTextLinesWithMetrics[index]

      // Update y baseline
      y += line.metrics.maxAscent

      // get start point horizontally
      switch (this.align.horizontal) {
        case 'Left':
          x = 0
          break
        case 'Center':
          x = (this.size.width / 2) - (line.metrics.width / 2)
          break
        case 'Right':
          x = this.size.width - line.metrics.width
          break
      }

      // for each styled text
      line.text.forEach(styledTextItem => {
        // set context style, draw text, update horizontal position
        TextLayer.setContextTextStyle(context, styledTextItem.style)
        context.fillText(styledTextItem.text, x, y)
        if (styledTextItem.metrics === undefined) throw new Error('Styled Text Item with no metrics')
        x += styledTextItem.metrics.width
      })
      // update veritcal position
      y += line.metrics.maxDescent
    }

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
    return TextLayer.replaceTextStyles(this.text, this.style, this.styleReplace)
  }

  static replaceTextStyles = (text: string, originalStyle: TextStyle, replacementStyles: StyleReplace[]): Array<{ text: string, style: TextStyle }> => {
    const styledText: Array<{ text: string, style: TextStyle }> = [{ text, style: originalStyle }]
    for (let index = 0; index < replacementStyles.length; index++) {
      const styleReplacer = replacementStyles[index]
      for (let textIndex = 0; textIndex < styledText.length; textIndex++) {
        const styledTextItem = styledText[textIndex]
        const startSplitText = styledTextItem.text.split(styleReplacer.startSymbol)
        let endSplitText, preText, contentText, postText
        if (startSplitText.length > 1) {
          endSplitText = startSplitText.slice(1).join(styleReplacer.startSymbol).split(styleReplacer.endSymbol)
          if (endSplitText.length > 1) {
            preText = startSplitText[0]
            contentText = endSplitText[0]
            postText = endSplitText.splice(1).join(styleReplacer.endSymbol)

            styledText[textIndex] = { text: preText, style: styledTextItem.style }
            styledText[textIndex + 1] = { text: contentText, style: styleReplacer.style }
            styledText[textIndex + 2] = { text: postText, style: styledTextItem.style }
          }
        }
      }
    }
    return styledText
  }

  static seperateLineBreaks = (text: string): string[] => {
    return text.split('\n')
  }

  static setContextTextStyle = (context: CanvasRenderingContext2D, style: TextStyle): void => {
    context.fillStyle = style.fillStyle
    context.font = style.font
  }
}
