import { type Canvas, createCanvas, registerFont } from 'canvas'
import type { Font } from './Font'
import { type Layer, type Size, FillLayer, TextLayer, ImageLayer, GroupLayer } from './Layer'
import { type DrawableElement } from './DrawableElement'
import { isBrowser } from 'browser-or-node'
/**
 * A basic enum with string representations of each layer type.
 * Used for creating layers from JSON.
 */
export type LayerType =
  | 'group'
  | 'text'
  | 'image'
  | 'fill'

/**
 * A class representing an exportable image template
 */
export class Template implements DrawableElement {
  name: string
  author: string
  previewImage: URL
  size: Size
  dpi: number
  fonts: Font[]
  layers: Layer[]

  /**
   * Create a new template
   * @param name A descriptive name of the template
   * @param author The name of the template author
   * @param previewImage A URL or path to a preview image
   * @param size The height and width of the final generated image
   * @param dpi The DPI to the exported image is saved with
   * @param fonts An array of fonts to be loaded before generating the template
   * @param layers An array of layers to be drawn
   */
  constructor (name: string, author: string, previewImage: URL, size: Size, dpi: number, fonts: Font[], layers: Layer[]) {
    this.name = name
    this.author = author
    this.previewImage = previewImage
    this.size = size
    this.dpi = dpi
    this.fonts = fonts
    this.layers = layers
  }

  /**
   * Create a template from a json string.
   * @param jsonString a string representing a json object
   * @returns a template
   */
  static fromJSONString (jsonString: string): Template {
    const jsonObject = JSON.parse(jsonString)
    const layers: Layer[] = new Array<Layer>()
    jsonObject.layers.forEach((layer: any) => {
      switch (layer.type as LayerType) {
        case 'fill':
          layers.push(new FillLayer(layer))
          break
        case 'image':
          layers.push(new ImageLayer(layer))
          break
        case 'text':
          layers.push(new TextLayer(layer))
          break
        case 'group':
          layers.push(new GroupLayer(layer))
          break
      }
    })
    return new Template(jsonObject.name, jsonObject.author, jsonObject.previewImage, jsonObject.size, jsonObject.dpi, jsonObject.fonts, layers)
  }

  /**
   * Registers all fonts of current template on the system to be drawn.
   */
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

  /**
   * Draw a group of layers and return the result as a canvas
   * @param layers An array of layers to be drawn
   * @param size The size of the overall group of layers
   * @returns A canvas witht he layers drawn to it
   */
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
