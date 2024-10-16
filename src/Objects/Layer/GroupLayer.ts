import { Layer, layerProperties } from './Layer'
import { Template, LayerType } from '../Template'
import { type Canvas } from 'canvas'
import { FillLayer } from './FillLayer'
import { ImageLayer } from './ImageLayer'
import { TextLayer } from './TextLayer'

/**
 * The properties of the Group Layer used in the constructor
 */
export interface GroupLayerProperties extends layerProperties {
  layers: Layer[]
}

/**
 * A class representing a Group Layer
 */
export class GroupLayer extends Layer {
  layers: Layer[]

  /**
   * Create a GroupLayer object
   * @param properties The properties of the GroupLayer
   */
  constructor (properties: GroupLayerProperties) {
    super(properties)
    this.layers = properties.layers
  }

  /**
   * Create a GroupLayer from a JSON Object  
   * Also creates all layers in the `jsonObject.layers` key
   * @param jsonObject A JSON Object representing a GroupLayer
   * @returns A GroupLayer
   */
  static fromJSONObject = (jsonObject: any): GroupLayer => {
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
    return new GroupLayer(jsonObject)
  }

  /**
   * Draw the group layer including all underlying layers
   * @returns A canvas with the group layer drawn to it
   */
  draw = async (): Promise<Canvas> => {
    return await Template.drawLayerGroup(this.layers, this.size)
  }
}
