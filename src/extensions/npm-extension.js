// add your CLI-specific functionality here, which will then be accessible
// to your commands
module.exports = toolbox => {
  toolbox.npm = {
    isPackageInstalled: (packageName) => {
      const {
        filesystem,
      } = toolbox
      let isInstalled = false
      const gradle = filesystem.read('package.json')
      const lines = gradle.split('\n')
      lines.forEach((line) => {
        const isPackageInstalled = line.includes(packageName)
        if (isPackageInstalled) {
          isInstalled = true
        }
      })
      return isInstalled
    },
    installPackage: async (packageName, saveDependency = true) => {
      const {
        system,
      } = toolbox
      const rnConfig = await system.run(`sudo npm install ${saveDependency ? '--save' : ''} ${packageName}`)
      return rnConfig
    }
  }

}
