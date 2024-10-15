import { type Canvas } from 'canvas'
import { type DrawableElement } from '../DrawableElement'

export type FillStyle =
  | string
  | CanvasGradient
  | CanvasPattern

export interface Anchor {
  horizontal: 'Left' | 'Center' | 'Right'
  vertical: 'Top' | 'Middle' | 'Bottom'
}

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface layerProperties {
  origin?: Point
  anchor?: Anchor
  size: Size
  operations?: GlobalCompositeOperation[]
}

export abstract class Layer implements DrawableElement {
  origin: Point
  anchor: Anchor
  size: Size
  operations: GlobalCompositeOperation[]

  constructor (properties: layerProperties) {
    this.origin = properties.origin ?? { x: 0, y: 0 }
    this.anchor = properties.anchor ?? { vertical: 'Top', horizontal: 'Left' }
    this.size = properties.size
    this.operations = properties.operations ?? ['source-over']
  }

  abstract draw: () => Promise<Canvas>

  getCorrectedOrigin = (): Point => {
    let x, y

    switch (this.anchor.horizontal) {
      case 'Left':
        x = this.origin.x
        break
      case 'Center':
        x = this.origin.x - (this.size.width / 2)
        break
      case 'Right':
        x = this.origin.x - this.size.width
        break
    }

    switch (this.anchor.vertical) {
      case 'Top':
        y = this.origin.y
        break
      case 'Middle':
        y = this.origin.y - (this.size.height / 2)
        break
      case 'Bottom':
        y = this.origin.y - this.size.height
        break
    }

    return { x, y }
  }
}
