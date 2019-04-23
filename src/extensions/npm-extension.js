// add your CLI-specific functionality here, which will then be accessible
// to your commands
const install = require('install-packages')

module.exports = toolbox => {
  toolbox.npm = {
    isPackageInstalled: function(packageName) {
      const {
        filesystem
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
    installPackage: function async (packageName, saveDependency = true, saveDevDependency = false) {
      return install({
          packages: [packageName],
          saveDev: saveDevDependency,
          packageManager: 'npm'
        })
    },
    addPackageScript: (script) => {
      const {
        filesystem,
        print
      } = toolbox
      try {
        const packaged = filesystem.read('package.json', 'json')
        if (!packaged.scripts) packaged.scripts = {}
        if (!script.force && packaged.scripts[script.key]) {
          print.info('Script already exists')
        }
        packaged.scripts[script.key] = script.value
        filesystem.write('package.json', packaged, { jsonIndent: 2 })
      } catch (e) {
        print.error(e)
      }
    },
    addConfigSection: (section) => {
      const {
        filesystem,
        print
      } = toolbox
      try {
        const packaged = filesystem.read('package.json', 'json')
        //if (!packaged.xcodeSchemes) packaged.xcodeSchemes = {}
        packaged[section.key] = section.value
        filesystem.write('package.json', packaged, { jsonIndent: 2 })
      } catch (e) {
        print.error(e)
      }

    }
  }


}
