// add your CLI-specific functionality here, which will then be accessible
// to your commands
module.exports = toolbox => {
  toolbox.android = {
    getApplicationId: () => {
      const {
        filesystem,
        print: { info }
      } = toolbox

      let applicationId = ''
      const gradle = filesystem.read('android/app/build.gradle')
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
    },
    getConfigSection: (sectionName) => {
      const {
        filesystem,
      } = toolbox

      const gradle = filesystem.read('android/app/build.gradle')
      const lines = gradle.split('\n')
      let isInSection = false
      let brackets = 0
      let sectionStr = ''
      lines.forEach((line) => {
        const buildType = line.includes(sectionName)
        if (buildType) {
          isInSection = true
        }
        if (isInSection) {
          sectionStr += line + '\n'
          const openings = (line.match(new RegExp('{', 'g')) || []).length
          const closings = (line.match(new RegExp('}', 'g')) || []).length
          brackets = brackets + openings - closings
        }
        if (isInSection && brackets <= 0) {
          isInSection = false
        }
      })
      return sectionStr
    },
    isLibraryLinked: (libraryName) => {
      const {
        filesystem,
        print: { info }
      } = toolbox

      let isLinked = false
      const gradle = filesystem.read('android/settings.gradle')
      const lines = gradle.split('\n')
      lines.forEach((line) => {
        if (line.includes(libraryName)) {
          isLinked = true
        }
      })
      return isLinked
    },
    createKeystore: async (options) => {
      const {
        system,
        template,
        print: { info}
      } = toolbox

      const { name, storePassword, alias, aliasPassword} = options
      const storeFile = `${name}-key.keystore`
      const command = `sudo keytool -genkey -v -keystore ${storeFile} -storepass ${storePassword} -alias ${alias} -keypass ${aliasPassword} -dname 'cn=Unknown, ou=Unknown, o=Unknown, c=Unknown' -keyalg RSA -keysize 2048 -validity 10000`
      info(command)
      await system.run(command)

      await template.generate({
        template: 'keystore.properties',
        target: `android/app/${name}-keystore.properties`,
        props: { ...options, storeFile, name: name.toUpperCase() }
      })

    }
  }
}
