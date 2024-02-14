import { mkdir, writeFile } from 'fs/promises'
import { FillLayer, Template } from '../index'

module.exports = {
  test: async function () {
    console.log('TEST[fill] Started')

    const layers = [
      new FillLayer('fill', 'Background', { x: 0, y: 0 }, { vertical: 'Top', horizontal: 'Left' }, { width: 100, height: 100 }, ['source-over'], 'green'),
      new FillLayer('fill', 'Center Square', { x: 50, y: 50 }, { vertical: 'Middle', horizontal: 'Center' }, { width: 80, height: 80 }, ['source-over'], 'red'),
      new FillLayer('fill', 'Top Right Square', { x: 100, y: 100 }, { vertical: 'Bottom', horizontal: 'Right' }, { width: 20, height: 20 }, ['source-over'], 'blue')
    ]

    const template = new Template('Test Fill Template', 'Mr Hero', new URL('https://example.com'), { width: 100, height: 100 }, 300, [], layers)
    return await mkdir('dist/test/output', { recursive: true })
      .then(async () => {
        return await template.draw()
      })
      .then(async canvas => {
        await writeFile('dist/test/output/fill.png', canvas.toBuffer())
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
