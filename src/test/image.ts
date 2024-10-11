import { mkdir, writeFile } from 'fs/promises'
import { FillLayer, Template, ImageLayer } from '../index'

module.exports = {
  test: async function () {
    console.log('TEST[image] Started')

    const layers = [
      new ImageLayer('image', 'Test PNG', { x: 0, y: 0 }, { vertical: 'Top', horizontal: 'Left' }, { width: 100, height: 100 }, ['source-over'], 'test/test_image_1.png', 'fit'),
      new ImageLayer('image', 'Test PNG', { x: 0, y: 0 }, { vertical: 'Top', horizontal: 'Left' }, { width: 100, height: 100 }, ['source-over'], 'test/test_image_2.png', 'fit')
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
