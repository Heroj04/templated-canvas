import { type Canvas } from 'canvas'

export interface DrawableElement {
  draw: () => Promise<Canvas>
}
