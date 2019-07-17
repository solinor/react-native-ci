const { runShared } = require('../flows/shared')
const { runAndroid } = require('../flows/android')
const { runIOS } = require('../flows/ios')

module.exports = {
  name: 'init',
  alias: ['i'],
  run: async toolbox => {
    let { ci, android, ios } = toolbox.parameters.options
    if (!ci && !android && !ios) {
      ci = true
      android = true
      ios = true
    }
    const { defaults } = toolbox.config.loadConfig('react-native-ci', process.cwd())
    const defaultConfig = {
      ...defaults,
      ...toolbox.parameters.options
    }
    let sharedConfig = {}
    if (ci) {
      sharedConfig = await runShared(toolbox, defaultConfig)
    }
    if (android) {
      await runAndroid(toolbox, { ...defaultConfig, ...sharedConfig })
    }
    if (ios) {
      await runIOS(toolbox, { ...defaultConfig, ...sharedConfig })
    }
  }
}
