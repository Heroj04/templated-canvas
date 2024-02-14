import { mkdir, writeFile } from 'fs/promises'
import { Template } from '../index'

module.exports = {
  test: async function () {
    console.log('TEST[blank_template] Started')

    const template = new Template('Test Template', 'Mr Hero', new URL('https://example.com'), { width: 100, height: 100 }, 300, [], [])
    return await mkdir('dist/test/output', { recursive: true })
      .then(async () => {
        return await template.draw()
      })
      .then(async canvas => {
        await writeFile('dist/test/output/blank_template.png', canvas.toBuffer())
      })
      .then(async () => {
        console.log('TEST[blank_template] Passed')
        return true
      })
      .catch(e => {
        console.log('TEST[blank_template] Failed')
        console.error(e)
        return false
      })
  }
}
