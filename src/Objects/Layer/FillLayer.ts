import { type Canvas, createCanvas } from 'canvas'
import { Layer, type FillStyle, layerProperties } from './Layer'

export interface FillLayerProperties extends layerProperties {
  fillStyle?: FillStyle
}

export class FillLayer extends Layer {
  fillStyle: FillStyle

  constructor (properties: FillLayerProperties) {
    super(properties)
    this.fillStyle = properties.fillStyle ?? 'white'
  }

  static fromJSONObject = (jsonObject: any): FillLayer => {
    return new FillLayer(jsonObject)
  }

  draw = async (): Promise<Canvas> => {
    const canvas = createCanvas(this.size.width, this.size.height)
    const context = canvas.getContext('2d')

    context.fillStyle = this.fillStyle
    context.fillRect(0, 0, this.size.width, this.size.height)

    return canvas
  }
}
