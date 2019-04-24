module.exports = {
  name: 'init',
  alias: ['i'],
  run: async toolbox => {

    const { runShared } = require('../flows/shared')
    const { runAndroid } = require('../flows/android')
    const { runIOS } = require('../flows/ios')

    const sharedConfig = await runShared(toolbox, {})
    await runAndroid(toolbox, sharedConfig)
    await runIOS(toolbox, sharedConfig)
  }
}
