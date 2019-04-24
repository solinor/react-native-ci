
module.exports = {
  name: 'test',
  alias: ['t'],
  run: async toolbox => {

    const { runShared } = require('../flows/shared')
    const { runAndroid } = require('../flows/android')
    const { runIOS } = require('../flows/ios')

    const {
      filesystem,
      print: { info, error },
      android,
      ios,
      patching,
      system,
      template,
      npm,
      meta
    } = toolbox
    const sharedConfig = await runShared(toolbox, {})
//    await runAndroid(toolbox, sharedConfig)
    await runIOS(toolbox, sharedConfig)
  }
}
