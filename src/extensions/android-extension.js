const fs = require('fs')
const { getConfigSection } = require('../android/androidHelper')

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
        const isAppId = line.includes('applicationId "')
        if (isAppId) {
          const start = line.indexOf('"') + 1
          const end = line.lastIndexOf('"')
          applicationId = line.substring(start, end)
          info('found applicationId line: ' + applicationId)
        }
      })
      return applicationId
    },
    getBuildGradle: () => {
      const {
        filesystem,
      } = toolbox

      const gradle = filesystem.read('android/app/build.gradle')
      return gradle
    },
    getConfigSection: (section) => {
      const {
        filesystem,
      } = toolbox
      const file = filesystem.read('android/app/build.gradle')
      return getConfigSection(file, section)
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
        print
      } = toolbox

      const { name, storePassword, alias, aliasPassword } = options
      const storeFile = `${name}-key.keystore`

      print.info('Checking if CircleCI keystore already exists.')
      const checkKeyStore = `keytool -v -list -keystore android/app/${storeFile} -storepass ${storePassword} -alias ${alias}`
      let keystore
      try {
        keystore = await system.run(checkKeyStore)
        print.info(`Existing certificate found, using it.`)
      } catch (e) {
        print.info(`${print.checkmark} No existing certificate found.`)
      }

      let encodedKeystore
      if (!keystore) {
        print.info('Generate new cert.')
        const command = `keytool -genkey -v -keystore android/app/${storeFile} -storepass ${storePassword} -alias ${alias} -keypass ${aliasPassword} -dname 'cn=Unknown, ou=Unknown, o=Unknown, c=Unknown' -keyalg RSA -keysize 2048 -validity 10000`
        await system.run(command)
        const encodeCommand = `openssl base64 -A -in android/app/${storeFile}`
        encodedKeystore = await system.run(encodeCommand)
      }

      const keystoreProperties = await template.generate({
        template: 'keystore.properties',
        target: `android/app/${name}-keystore.properties`,
        props: { ...options, storeFile, name: name.toUpperCase() }
      })

      return {
        keystore: encodedKeystore,
        keystoreProperties: Buffer.from(keystoreProperties).toString('base64')
      }
    },
    base64EncodeJson: jsonPath => {
      const { system } = toolbox
      const encodeCommand = `openssl base64 -A -in ${jsonPath}`
      return system.run(encodeCommand)
    }
  }
}
