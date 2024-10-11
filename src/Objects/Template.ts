import { type Canvas, createCanvas, registerFont } from 'canvas'
import type { Font } from './Font'
import { type LayerType, type Layer, type Size, FillLayer, TextLayer, ImageLayer, GroupLayer } from './Layer'
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

  static fromJSONString (jsonString: string): Template {
    const jsonObject = JSON.parse(jsonString)
    const layers: Layer[] = new Array<Layer>()
    jsonObject.layers.forEach((layer: any) => {
      switch (layer.type as LayerType) {
        case 'fill':
          layers.push(new FillLayer(layer.type, layer.description, layer.origin, layer.anchor, layer.size, layer.operations, layer.fillStyle))
          break
        case 'image':
          layers.push(new ImageLayer(layer.type, layer.description, layer.origin, layer.anchor, layer.size, layer.operations, layer.url, layer.scale))
          break
        case 'text':
          layers.push(new TextLayer(layer.type, layer.description, layer.origin, layer.anchor, layer.size, layer.operations, layer.text, layer.style, layer.align, layer.wrapText, layer.scaleText, layer.textReplace, layer.styleReplace))
          break
        case 'group':
          layers.push(new GroupLayer(layer.type, layer.description, layer.origin, layer.anchor, layer.size, layer.operations, layer.layers))
          break
      }
    })
    return new Template(jsonObject.name, jsonObject.author, jsonObject.previewImage, jsonObject.size, jsonObject.dpi, jsonObject.fonts, layers)
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
