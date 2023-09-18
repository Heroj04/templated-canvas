import { type Anchor, Layer, type Point, type Size, type LayerType } from './Layer'
import { Template } from '../Template'
import { type Canvas } from 'canvas'

export class GroupLayer extends Layer {
  layers: Layer[]

  constructor (type: LayerType, description: string, origin: Point, anchor: Anchor, size: Size, operations: GlobalCompositeOperation[], layers: Layer[]) {
    super(type, description, origin, anchor, size, operations)
    this.layers = layers
  }

  draw = async (): Promise<Canvas> => {
    return await Template.drawLayerGroup(this.layers, this.size)
  }
}
