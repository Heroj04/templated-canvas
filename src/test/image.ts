import { mkdir, writeFile } from 'fs/promises'
import { FillLayer, Template, ImageLayer } from '../index'

module.exports = {
  test: async function () {
    console.log('TEST[image] Started')

    const layers = [
      new ImageLayer({ size: { width: 100, height: 100 }, url: 'test/test_image_1.png' }), // Under Image
      new ImageLayer({ size: { width: 100, height: 100 }, url: 'test/test_image_2.png' }) // Over Image
    ]

    const template = new Template('Test Image Template', 'Mr Hero', new URL('https://example.com'), { width: 100, height: 100 }, 300, [], layers)
    return await mkdir('test/output', { recursive: true })
      .then(async () => {
        return await template.draw()
      })
      .then(async canvas => {
        await writeFile('test/output/image.png', canvas.toBuffer())
      })
      .then(async () => {
        console.log('TEST[image] Passed')
        return true
      })
      .catch(e => {
        console.log('TEST[image] Failed')
        console.error(e)
        return false
      })
  }
}
