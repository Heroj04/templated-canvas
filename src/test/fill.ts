import { mkdir, writeFile } from 'fs/promises'
import { FillLayer, Template } from '../index'

module.exports = {
  test: async function () {
    console.log('TEST[fill] Started')

    const layers = [
      new FillLayer({ size: { width: 100, height: 100 } }), // Background
      new FillLayer({ origin: { x: 50, y: 50 }, anchor: { vertical: 'Middle', horizontal: 'Center' }, size: { width: 80, height: 80 }, fillStyle: 'red' }), // Center Square
      new FillLayer({ origin: { x: 100, y: 100 }, anchor: { vertical: 'Bottom', horizontal: 'Right' }, size: { width: 20, height: 20 }, fillStyle: 'blue', opacity: 0.5 }) // Bottom Right Square
    ]

    const template = new Template('Test Fill Template', 'Mr Hero', new URL('https://example.com'), { width: 100, height: 100 }, 300, [], layers)
    return await mkdir('test/output', { recursive: true })
      .then(async () => {
        return await template.draw()
      })
      .then(async canvas => {
        await writeFile('test/output/fill.png', canvas.toBuffer())
      })
      .then(async () => {
        console.log('TEST[fill] Passed')
        return true
      })
      .catch(e => {
        console.log('TEST[fill] Failed')
        console.error(e)
        return false
      })
  }
}
