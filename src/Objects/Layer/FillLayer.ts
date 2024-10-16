import { type Canvas, createCanvas } from 'canvas'
import { Layer, type FillStyle, layerProperties } from './Layer'

/**
 * The properties of a FillLayer used by the constructor
 */
export interface FillLayerProperties extends layerProperties {
  fillStyle?: FillStyle
}

/**
 * A class representing a Fill Layer
 */
export class FillLayer extends Layer {
  fillStyle: FillStyle

  /**
   * Create a FillLayer object
   * @param properties The properties of the FillLayer
   */
  constructor (properties: FillLayerProperties) {
    super(properties)
    this.fillStyle = properties.fillStyle ?? 'white'
  }

  /**
   * Create a FillLayer from a JSON Object
   * @param jsonObject A JSON Object representing a FillLayer
   * @returns A FillLayer
   */
  static fromJSONObject = (jsonObject: any): FillLayer => {
    if (jsonObject.type !== 'fill') throw new Error('JSON Object is not a "fill" layer')
    return new FillLayer(jsonObject)
  }

  /**
   * Draw the FillLayer to a canvas
   * @returns a canvas filled with FillStyle
   */
  draw = async (): Promise<Canvas> => {
    const canvas = createCanvas(this.size.width, this.size.height)
    const context = canvas.getContext('2d')

    context.fillStyle = this.fillStyle
    context.fillRect(0, 0, this.size.width, this.size.height)

    return canvas
  }
}
