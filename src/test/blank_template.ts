import { Template } from '../index'
import { writeFileSync } from 'fs'

const template = new Template('Test Template', 'Mr Hero', new URL('./test.png'), { width: 100, height: 100 }, 300, [], [])
template.draw().then(canvas => { writeFileSync('test.png', canvas.toBuffer()) }, error => { console.log(error) })
