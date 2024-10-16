import { type Canvas, createCanvas, loadImage } from 'canvas'
import { Layer, layerProperties } from './Layer'

/**
 * A basic enum with the image fill types  
 * - `fill`: Sets the image to fill the entire canvas (May cut off parts of the image)
 * - `fit`: Sets the image to fit into the canvas (May include whitespace letter/pillar boxing)
 * - `stretch`: Sets the image to the same dimensions as the canvas (May casue the image to become distorted)
 */
export type ScaleType =
  | 'fill'
  | 'fit'
  | 'stretch'

/**
 * The layer properties used for the constructor
 */
export interface ImageLayerProperties extends layerProperties {
  url: string
  /** @defaultValue `'fill'` */
  scale?: ScaleType
}

/**
 * A class representing an Image Layer
 */
export class ImageLayer extends Layer {
  url: string
  scale: ScaleType

  /**
   * Create an ImageLayer object
   * @param properties The properties of the Image Layer
   */
  constructor (properties: ImageLayerProperties) {
    super(properties)
    this.url = properties.url
    this.scale = properties.scale ?? 'fill'
  }

  /**
   * Create an ImageLayer from a JSON Object
   * @param jsonObject A JSON Object representing an ImageLayer
   * @returns An ImageLayer
   */
  static fromJSONObject = (jsonObject: any): ImageLayer => {
    if (jsonObject.type !== 'image') throw new Error('JSON Object is not an "image" layer')
    return new ImageLayer(jsonObject)
  }

  /**
   * Draw the Image Layer to a canvas
   * @returns A canvas with the image drawn to it
   */
  draw = async (): Promise<Canvas> => {
    const canvas = createCanvas(this.size.width, this.size.height)
    const context = canvas.getContext('2d')

    const image = await loadImage(this.url)
    const ratio = image.width / image.height

    let x, y, width, height

    switch (this.scale) {
      case 'fill':
        // Fill the layer bounds with image (image may go outside of bounds and be cropped)
        // Scale the image to match width
        width = this.size.width
        height = width / ratio
        x = 0
        y = (height - this.size.height) / -2
        if (height < this.size.height) {
          // If height is not enough, scale to match
          height = this.size.height
          width = height * ratio
          x = (width - this.size.width) / -2
          y = 0
        }
        break
      case 'fit':
        // Fit the image to layer bounds (Image may have whitespace on edge)
        // Scale image to match width
        width = this.size.width
        height = width / ratio
        x = 0
        y = (height - this.size.height) / 2
        if (height > this.size.height) {
          // If height is too much, scale to match
          height = this.size.height
          width = height * ratio
          x = (width - this.size.width) / 2
          y = 0
        }
        break
      case 'stretch':
        // Stretch the image to match the layer bounds (Image may be distorted)
        // Just straight up set the width and height to match
        x = 0
        y = 0
        width = this.size.width
        height = this.size.height
        break
    }

    // Write the image to the canvas (crops the image)
    context.drawImage(image, x, y, width, height)

    return canvas
  }
}
