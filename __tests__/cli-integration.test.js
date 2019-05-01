const { system, filesystem } = require('gluegun')
const { resolve } = require('path')

const src = resolve(__dirname, '..')

const cli = async cmd =>
  system.run('node ' + resolve(src, 'bin', 'react-native-ci') + ` ${cmd}`)

describe('Options', () => {
  test('outputs version', async () => {
    const output = await cli('--version')
    expect(output).toContain('0.1.3')
  })
  
  test('outputs help', async () => {
    const output = await cli('--help')
    expect(output).toContain('0.1.3')
  })
})
