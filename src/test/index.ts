/* eslint-disable @typescript-eslint/no-var-requires */
console.log('RUNNING TESTS')

void Promise.all([
  require('./blank_template').test(),
  require('./fill').test()
])

// TODO - Write Proper Tests
