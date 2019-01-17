// add your CLI-specific functionality here, which will then be accessible
// to your commands
module.exports = toolbox => {
  toolbox.android = {
    getApplicationId: () => {
      const {
        filesystem,
        print: { info }
      } = toolbox

      let applicationId
      const gradle = filesystem.read('./android/app/build.gradle')
      const lines = gradle.split('\n')
      lines.forEach((line) => {
        const isAppId = line.includes('applicationId')
        if (isAppId) {
          const start = line.indexOf('"') + 1
          const end = line.lastIndexOf('"')
          applicationId = line.substring(start, end)
          info('found applicationId line: ' + applicationId)
        }
      })
      return applicationId
    }
  }
}
