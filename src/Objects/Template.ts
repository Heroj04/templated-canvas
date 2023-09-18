import { type Canvas, createCanvas, registerFont } from 'canvas'
import type { Font } from './Font'
import { type Layer, type Size } from './Layer'
import { type DrawableElement } from './DrawableElement'
import { isBrowser } from 'browser-or-node'

export class Template implements DrawableElement {
  name: string
  author: string
  previewImage: URL
  size: Size
  dpi: number
  fonts: Font[]
  layers: Layer[]

  constructor (name: string, author: string, previewImage: URL, size: Size, dpi: number, fonts: Font[], layers: Layer[]) {
    this.name = name
    this.author = author
    this.previewImage = previewImage
    this.size = size
    this.dpi = dpi
    this.fonts = fonts
    this.layers = layers
  }

  static fromJSON (jsonString: string): Template {
    const jsonObject = JSON.parse(jsonString)
    return new Template(jsonObject.name, jsonObject.author, jsonObject.previewImage, jsonObject.size, jsonObject.dpi, jsonObject.fonts, jsonObject.layers)
  }

  async registerFonts (): Promise<void> {
    if (isBrowser) {
      for await (const font of this.fonts) {
        const newFont = new FontFace(font.fontFace.family, font.url.toString(), { weight: font.fontFace.weight, style: font.fontFace.style })
        const loadedFont = await newFont.load()
        document.fonts.add(loadedFont)
      }
    } else {
      // TODO - We are going to need to download remote fonts to a temp file
      this.fonts.forEach(font => {
        registerFont(font.url.toString(), font.fontFace)
      })
    }
  }

  draw = async (): Promise<Canvas> => {
    await this.registerFonts()
    return await Template.drawLayerGroup(this.layers, this.size)
  }

  static drawLayerGroup = async (layers: Layer[], size: Size): Promise<Canvas> => {
    const canvas = createCanvas(size.width, size.height)
    const context = canvas.getContext('2d')

    const layerCanvases = await Promise.all(layers.map(async (layer) => await layer.draw()))

    for (let index = 0; index < layerCanvases.length; index++) {
      const layerCanvas = layerCanvases[index]
      const layer = layers[index]
      const getCorrectedOrigin = layer.getCorrectedOrigin()
      layer.operations.forEach(operation => {
        context.globalCompositeOperation = operation
        context.drawImage(layerCanvas, getCorrectedOrigin.x, getCorrectedOrigin.y)
      })
    }

    return canvas
  }
}
