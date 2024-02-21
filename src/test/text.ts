import { mkdir, writeFile } from 'fs/promises'
import { FillLayer, TextLayer, Template } from '../index'

module.exports = {
  test: async function () {
    console.log('TEST[text] Started')

    const layers = [
      new FillLayer('fill', 'Background', { x: 0, y: 0 }, { vertical: 'Top', horizontal: 'Left' }, { width: 100, height: 100 }, ['source-over'], 'white'),
      new TextLayer('text', 'Test1', { x: 0, y: 0 }, { vertical: 'Top', horizontal: 'Left' }, { width: 100, height: 100 }, ['source-over'], 'Testing', { fillStyle: 'black', font: '10px' }, { vertical: 'Middle', horizontal: 'Center' }, false, false, new Map(), [])
    ]

    const template = new Template('Test Text Template', 'Mr Hero', new URL('https://example.com'), { width: 100, height: 100 }, 300, [], layers)
    return await mkdir('dist/test/output', { recursive: true })
      .then(async () => {
        return await template.draw()
      })
      .then(async canvas => {
        await writeFile('dist/test/output/text.png', canvas.toBuffer())
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
