import { mkdir, writeFile } from 'fs/promises'
import { FillLayer, TextLayer, Template } from '../index'

module.exports = {
  test: async function () {
    console.log('TEST[text] Started')

    const layers = [
      new TextLayer({ size: { width: 100, height: 100 }, text: 'Testing', style: { fillStyle: 'white', font: 'Bold 20px Serif' }, align: { vertical: 'Middle', horizontal: 'Center' } }), // Center Static
      new TextLayer({ size: { width: 100, height: 100 }, text: 'abcdefghijklmnopqrstuvwxyz\nABCDEFGHIJKLMNOPQRSTUVWXYZ', wrapText: true }) // Top Wrapped
    ]

    const template = new Template('Test Text Template', 'Mr Hero', new URL('https://example.com'), { width: 100, height: 100 }, 300, [], layers)
    return await mkdir('test/output', { recursive: true })
      .then(async () => {
        return await template.draw()
      })
      .then(async canvas => {
        await writeFile('test/output/text.png', canvas.toBuffer())
      })
      .then(async () => {
        console.log('TEST[text] Passed')
        return true
      })
      .catch(e => {
        console.log('TEST[text] Failed')
        console.error(e)
        return false
      })
  }
}
