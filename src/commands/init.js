module.exports = {
  name: 'init',
  alias: ['i'],
  run: async toolbox => {

    const { runShared } = require('../flows/shared')
    const { runAndroid } = require('../flows/android')
    const { runIOS } = require('../flows/ios')

    const { print: { info } } = toolbox
    info(process.cwd())
    const defaultConfig = toolbox.config.loadConfig('react-native-ci', process.cwd())
    const sharedConfig = {}
    const sharedConfig = await runShared(toolbox, defaultConfig)
    await runAndroid(toolbox, { ...defaultConfig, ...sharedConfig })
    await runIOS(toolbox, { ...defaultConfig, ...sharedConfig })
  }
}
