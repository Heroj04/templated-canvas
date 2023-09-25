import { type Canvas, createCanvas } from 'canvas'
import { Layer, type LayerType, type FillStyle, type Point, type Anchor, type Size } from './Layer'

export class FillLayer extends Layer {
  fillStyle: FillStyle

  constructor (type: LayerType, description: string, origin: Point, anchor: Anchor, size: Size, operations: GlobalCompositeOperation[], fillStyle: FillStyle) {
    super(type, description, origin, anchor, size, operations)
    this.fillStyle = fillStyle
  }

  static fromJSONObject = (jsonObject: any): FillLayer => {
    return new FillLayer(jsonObject.type, jsonObject.description, jsonObject.origin, jsonObject.anchor, jsonObject.size, jsonObject.operations, jsonObject.fillStyle)
  }

  draw = async (): Promise<Canvas> => {
    const canvas = createCanvas(this.size.width, this.size.height)
    const context = canvas.getContext('2d')

    context.fillStyle = this.fillStyle
    context.fillRect(0, 0, this.size.width, this.size.height)

    return canvas
  }
}
