import { Layer, layerProperties } from './Layer'
import { Template, LayerType } from '../Template'
import { type Canvas } from 'canvas'
import { FillLayer } from './FillLayer'
import { ImageLayer } from './ImageLayer'
import { TextLayer } from './TextLayer'

export interface GroupLayerProperties extends layerProperties {
  layers: Layer[]
}

export class GroupLayer extends Layer {
  layers: Layer[]

  constructor (properties: GroupLayerProperties) {
    super(properties)
    this.layers = properties.layers
  }

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

  draw = async (): Promise<Canvas> => {
    return await Template.drawLayerGroup(this.layers, this.size)
  }
}
