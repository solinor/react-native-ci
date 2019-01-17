module.exports = {
  name: 'test',
  alias: ['t'],
  run: async toolbox => {
    const {
      filesystem,
      print: { info },
      android
    } = toolbox

    //    const { execSync } = require('child_process')
//    execSync('fastlane init', { cwd: 'android/', input: 'echo \'com.circletest\nfastlane/secret.json\nn\n\'' })

    const appId = android.getApplicationId()
    info('app id: ' + appId)
  }
}
