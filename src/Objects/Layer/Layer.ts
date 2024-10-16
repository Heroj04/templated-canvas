import { type Canvas } from 'canvas'
import { type DrawableElement } from '../DrawableElement'

/**
 * A helper interface which represents the options used as fill styles in a canvas
 */
export type FillStyle =
  | string
  | CanvasGradient
  | CanvasPattern

/**
 * A generic anchor point on a rectangle
 */
export interface Anchor {
  horizontal: 'Left' | 'Center' | 'Right'
  vertical: 'Top' | 'Middle' | 'Bottom'
}

/**
 * An x, y coordinate point
 */
export interface Point {
  x: number
  y: number
}

/**
 * The size of a rectangle using Height and Width
 */
export interface Size {
  width: number
  height: number
}

/**
 * Properties passed to the generic layer constructor
 */
export interface layerProperties {
  /** @defaultValue `{ x: 0, y: 0 }` */
  origin?: Point
  /** @defaultValue `{ vertical: 'Top', horizontal: 'Left' }` */
  anchor?: Anchor
  size: Size
  /** @defaultValue `['source-over']` */
  operations?: GlobalCompositeOperation[]
}

/**
 * An abstract class representing a generic drawable layer  
 * Other classes must extend this class
 */
export abstract class Layer implements DrawableElement {
  origin: Point
  anchor: Anchor
  size: Size
  operations: GlobalCompositeOperation[]

  /**
   * Create a new layer object
   * @param properties The properties to define this layer
   */
  constructor (properties: layerProperties) {
    this.origin = properties.origin ?? { x: 0, y: 0 }
    this.anchor = properties.anchor ?? { vertical: 'Top', horizontal: 'Left' }
    this.size = properties.size
    this.operations = properties.operations ?? ['source-over']
  }

  /**
   * Draw the layer to a canvas  
   * This must be implemented on extnded classes
   */
  abstract draw: () => Promise<Canvas>

  /**
   * Gets the actual origin of the layer using the specified origin point and the anchor
   * @returns A point for the top left of the layer
   */
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
