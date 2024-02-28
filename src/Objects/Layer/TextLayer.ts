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

export interface StyledString {
  string: string
  style: TextStyle
  metrics?: TextMetrics
}

export interface LineMetrics {
  maxAscent: number
  maxDescent: number
  width: number
}

export interface ParagraphMetrics {
  height: number
  width: number
}

export interface Line {
  text: StyledString[]
  metrics: LineMetrics
}

export interface Paragraph {
  metrics: ParagraphMetrics
  lines: Line[]
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

  static fromJSONObject = (jsonObject: any): TextLayer => {
    return new TextLayer(jsonObject.type, jsonObject.description, jsonObject.origin, jsonObject.anchor, jsonObject.size, jsonObject.operations, jsonObject.text, jsonObject.style, jsonObject.align, jsonObject.wrapText, jsonObject.scaleText, jsonObject.textReplace, jsonObject.styleReplace)
  }

  draw = async (): Promise<Canvas> => {
    const canvas = createCanvas(this.size.width, this.size.height)
    const context = canvas.getContext('2d')

    // Perform text replacements
    const replacedText = this.getReplacedText()

    // Sperate and Perform style replacements
    const styledText = TextLayer.replaceTextStyles(replacedText, this.style, this.styleReplace)

    // Seperate paragraphs and line breaks
    const paragraphs = new Array<Paragraph>({ metrics: { height: 0, width: 0 }, lines: new Array<Line>({ metrics: { maxAscent: 0, maxDescent: 0, width: 0 }, text: new Array<StyledString>() }) })
    styledText.forEach(styledTextItem => {
      // Split the text on double new lines for paragraphs
      const paragraphSplits = styledTextItem.string.split('\n\n')
      for (let paragraphTextIndex = 0; paragraphTextIndex < paragraphSplits.length; paragraphTextIndex++) {
        const paragraphText = paragraphSplits[paragraphTextIndex]

        // If this is not the fist index create a new paragraph with an empty line
        if (paragraphTextIndex > 0) {
          paragraphs.push({ metrics: { height: 0, width: 0 }, lines: new Array<Line>({ metrics: { maxAscent: 0, maxDescent: 0, width: 0 }, text: new Array<StyledString>() }) })
        }
        const currentParagraph = paragraphs[paragraphs.length - 1]

        // Split the text on new lines as new lines
        const lineSplits = paragraphText.split('\n')
        for (let lineTextIndex = 0; lineTextIndex < lineSplits.length; lineTextIndex++) {
          const lineText = lineSplits[lineTextIndex]

          // If this is not the first index create a new line
          if (lineTextIndex > 0) {
            currentParagraph.lines.push({ metrics: { maxAscent: 0, maxDescent: 0, width: 0 }, text: new Array<StyledString>() })
          }
          const currentLine = currentParagraph.lines[currentParagraph.lines.length - 1]
          currentLine.text.push({ string: lineText, style: styledTextItem.style })
          const styledLineText = currentLine.text[currentLine.text.length - 1]

          // Calculate new line metrics
          TextLayer.setContextTextStyle(context, styledTextItem.style)
          styledLineText.metrics = context.measureText(lineText)

          // TODO - Change to fontBoundingBox (No Support in node-canvas see https://github.com/Automattic/node-canvas/issues/1940)
          currentLine.metrics.maxAscent = Math.max(currentLine.metrics.maxAscent, styledLineText.metrics.actualBoundingBoxAscent)
          currentLine.metrics.maxDescent = Math.max(currentLine.metrics.maxDescent, styledLineText.metrics.actualBoundingBoxDescent)
          currentLine.metrics.width += styledLineText.metrics.width
        }

        // Calculate paragrpah metrics
        currentParagraph.lines.forEach(line => {
          currentParagraph.metrics.height += (line.metrics.maxAscent + line.metrics.maxDescent)
          currentParagraph.metrics.width = Math.max(currentParagraph.metrics.width, line.metrics.width)
          // TODO - Add height for line spacing and paragraph spacing
        })
      }
    })

    // TODO - Word Wrapping/Scaling

    const totalHeight = paragraphs.reduce((p, c) => p + c.metrics.height, 0)

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

    // for each paragraph
    paragraphs.forEach(paragraph => {
      paragraph.lines.forEach(line => {
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
          context.fillText(styledTextItem.string, x, y)
          if (styledTextItem.metrics === undefined) throw new Error('Styled Text Item with no metrics')
          x += styledTextItem.metrics.width
        })
        // update veritcal position
        y += line.metrics.maxDescent
        // TODO - Add line spacing
      })
      // TODO - Add paragraph spacing
    })

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

  getReplacedStyles = (text: string): StyledString[] => {
    return TextLayer.replaceTextStyles(this.text, this.style, this.styleReplace)
  }

  static replaceTextStyles = (text: string, originalStyle: TextStyle, replacementStyles: StyleReplace[]): StyledString[] => {
    const styledText: StyledString[] = [{ string: text, style: originalStyle }]
    for (let index = 0; index < replacementStyles.length; index++) {
      const styleReplacer = replacementStyles[index]
      for (let textIndex = 0; textIndex < styledText.length; textIndex++) {
        const styledTextItem = styledText[textIndex]
        const startSplitText = styledTextItem.string.split(styleReplacer.startSymbol)
        let endSplitText, preText, contentText, postText
        if (startSplitText.length > 1) {
          endSplitText = startSplitText.slice(1).join(styleReplacer.startSymbol).split(styleReplacer.endSymbol)
          if (endSplitText.length > 1) {
            preText = startSplitText[0]
            contentText = endSplitText[0]
            postText = endSplitText.splice(1).join(styleReplacer.endSymbol)

            styledText[textIndex] = { string: preText, style: styledTextItem.style }
            styledText[textIndex + 1] = { string: contentText, style: styleReplacer.style }
            styledText[textIndex + 2] = { string: postText, style: styledTextItem.style }
          }
        }
      }
    }
    return styledText
  }

  static setContextTextStyle = (context: CanvasRenderingContext2D, style: TextStyle): void => {
    context.fillStyle = style.fillStyle
    context.font = style.font
  }
}
