import { mkdir, writeFile } from 'fs/promises'
import { FillLayer, Template, ImageLayer } from '../index'

module.exports = {
  test: async function () {
    console.log('TEST[image] Started')

    const layers = [
      new FillLayer('fill', 'Background', { x: 0, y: 0 }, { vertical: 'Top', horizontal: 'Left' }, { width: 100, height: 100 }, ['source-over'], 'white'),
      new ImageLayer('image', 'Test PNG', { x: 0, y: 0 }, { vertical: 'Top', horizontal: 'Left' }, { width: 75, height: 75 }, ['source-over'], new URL('https://avatars.githubusercontent.com/u/9601343?v=4'), 'fit')
    ]

    const template = new Template('Test Image Template', 'Mr Hero', new URL('https://example.com'), { width: 100, height: 100 }, 300, [], layers)
    return await mkdir('dist/test/output', { recursive: true })
      .then(async () => {
        return await template.draw()
      })
      .then(async canvas => {
        await writeFile('dist/test/output/image.png', canvas.toBuffer())
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
