import { type Canvas, createCanvas, loadImage } from 'canvas'
import { type Anchor, Layer, type Point, type Size, type LayerType } from './Layer'

export type ScaleType =
  | 'fill'
  | 'fit'
  | 'stretch'

export class ImageLayer extends Layer {
  url: URL
  scale: ScaleType

  constructor (type: LayerType, description: string, origin: Point, anchor: Anchor, size: Size, operations: GlobalCompositeOperation[], url: URL, scale: ScaleType) {
    super(type, description, origin, anchor, size, operations)
    this.url = url
    this.scale = scale
  }

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
