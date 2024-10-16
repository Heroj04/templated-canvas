import { type Canvas } from 'canvas'

/**
 * Any object that can be drawn to a canvas
 */
export interface DrawableElement {
  /**
   * Draws the object to a canvas
   * @returns A canvas with the object drawn to it
   */
  draw: () => Promise<Canvas>
}
