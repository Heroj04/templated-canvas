import { type Anchor, Layer, type Point, type Size, type LayerType } from './Layer'
import { Template } from '../Template'
import { type Canvas } from 'canvas'
import { FillLayer } from './FillLayer'
import { ImageLayer } from './ImageLayer'
import { TextLayer } from './TextLayer'

export class GroupLayer extends Layer {
  layers: Layer[]

  constructor (type: LayerType, description: string, origin: Point, anchor: Anchor, size: Size, operations: GlobalCompositeOperation[], layers: Layer[]) {
    super(type, description, origin, anchor, size, operations)
    this.layers = layers
  }

  static fromJSONObject = (jsonObject: any): GroupLayer => {
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
    return new GroupLayer(jsonObject.type, jsonObject.description, jsonObject.origin, jsonObject.anchor, jsonObject.size, jsonObject.operations, layers)
  }

  draw = async (): Promise<Canvas> => {
    return await Template.drawLayerGroup(this.layers, this.size)
  }
}
