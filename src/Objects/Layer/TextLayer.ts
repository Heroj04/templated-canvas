import { type Canvas, type CanvasRenderingContext2D, createCanvas, TextMetrics } from 'canvas'
import { Layer, type FillStyle, type Anchor, layerProperties } from './Layer'

/**
 * An object representing the properties of a single piece of rendered text
 */
export interface TextStyle {
  font?: string
  fillStyle?: FillStyle
  opacity?: number
}

/**
 * An object that specifies how to replace styles in text
 */
export interface StyleReplace {
  startSymbol: string
  endSymbol: string
  style: TextStyle
}

/**
 * Temporary fix to add emHeight types to TextMetrics interface until node-canvas is updated
 */
// TODO - Update node-canvas and remove this
export interface fixedTextMetrics extends TextMetrics {
  emHeightAscent: number
  emHeightDescent: number
}

/**
 * An object representing a string and the style used to it  
 * Also includes the metrics of the final rendered text
 */
export interface StyledString {
  string: string
  style: TextStyle
  metrics?: fixedTextMetrics
}

/**
 * Basic Metrics used for rendering a line of text
 */
interface LineMetrics {
  maxAscent: number
  maxDescent: number
  width: number
}

/**
 * Basic Metrics used for rendering a paragraph of text
 */
interface ParagraphMetrics {
  height: number
  width: number
}

/**
 * A single line of text containing multiple text parts and metrics
 */
interface Line {
  text: StyledString[]
  metrics: LineMetrics
}

/**
 * A single paragraph of text containing multiple lines and metrics
 */
interface Paragraph {
  metrics: ParagraphMetrics
  lines: Line[]
}

/**
 * Properties passed to the Text Layer Constructor
 */
export interface TextLayerProperties extends layerProperties {
  text: string
  /** @defaultValue `{ font: 'Regular 10px Sans-Serif', fillStyle: 'black' }` */
  style?: TextStyle
  /** @defaultValue `{ vertical: 'Top', horizontal: 'Left' }` */
  align?: Anchor
  /** @defaultValue `false` */
  wrapText?: boolean
  /** @defaultValue `false` */
  scaleText?: boolean
  textReplace?: Map<string, string>
  styleReplace?: StyleReplace[]
}

/**
 * A class representing a Layer used to render text
 */
export class TextLayer extends Layer {
  text: string
  style: TextStyle
  align: Anchor
  wrapText: boolean
  scaleText: boolean
  textReplace: Map<string, string>
  styleReplace: StyleReplace[]

  /**
   * Create a new TextLayer
   * @param properties The layer properties
   */
  constructor (properties: TextLayerProperties) {
    super(properties)
    this.text = properties.text
    this.style = {
      font: properties.style?.font ?? 'Regular 10px Sans-Serif',
      fillStyle: properties.style?.fillStyle ?? 'black',
      opacity: properties.style?.opacity ?? 1.0
    }
    this.align = properties.align ?? { vertical: 'Top', horizontal: 'Left' }
    this.wrapText = properties.wrapText ?? false
    this.scaleText = properties.scaleText ?? false
    this.textReplace = properties.textReplace ?? new Map<string, string>()
    this.styleReplace = properties.styleReplace ?? []
  }

  /**
   * Create a TextLayer from a JSON Object
   * @param jsonObject A JSON Object representing a TextLayer
   * @returns A TextLayer
   */
  static fromJSONObject = (jsonObject: any): TextLayer => {
    if (jsonObject.type !== 'text') throw new Error('JSON Object is not a "text" layer')
    return new TextLayer(jsonObject)
  }

  /**
   * Draw the Text Layer to a canvas
   * @returns A canvas with the text drawn to it
   */
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
          // TODO - This is temporary until node-canvas supports emHeightAscent/Descent types
          styledLineText.metrics = context.measureText(lineText) as fixedTextMetrics

          // TODO - Change to fontBoundingBox (No Support in node-canvas see https://github.com/Automattic/node-canvas/issues/1940)
          currentLine.metrics.maxAscent = Math.max(currentLine.metrics.maxAscent, styledLineText.metrics.emHeightAscent)
          currentLine.metrics.maxDescent = Math.max(currentLine.metrics.maxDescent, styledLineText.metrics.emHeightDescent)
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

  /**
   * Gets the final text string after all text replacement
   * @returns A string with all text replaced
   */
  getReplacedText = (): string => {
    let output = this.text

    for (const mapArray of this.textReplace) {
      const search = mapArray[0]
      const replace = mapArray[1]
      output = output.split(search).join(replace)
    }

    return output
  }

  /**
   * Get all text strings of this layer after styling
   * @returns An array of StyledStrings
   */
  getReplacedStyles = (): StyledString[] => {
    return TextLayer.replaceTextStyles(this.text, this.style, this.styleReplace)
  }

  /**
   * Get all Styled strings for a given text after styling
   * @param text The original text
   * @param originalStyle The default style to use
   * @param replacementStyles the replacement styles
   * @returns An array of StyledStrings
   */
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

  /**
   * Sets a style to be used on a canvas context
   * @param context The canvas context to set
   * @param style The style to use
   */
  static setContextTextStyle = (context: CanvasRenderingContext2D, style: TextStyle): void => {
    context.fillStyle = style.fillStyle ?? 'black'
    context.font = style.font ?? 'Regular 10px Sans-Serif'
    context.globalAlpha = style.opacity ?? 1.0
  }
}
