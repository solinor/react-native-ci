const fs = require('fs')
const { getConfigSection, createKeystore, readGradleFile } = require('../android/androidHelper')

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
      const gradle =  readGradleFile().getOrElse('')
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

      const gradle = readGradleFile().getOrElse('')
      return gradle
    },
    getConfigSection: (section) => {
      const gradle = readGradleFile().getOrElse('')
      return gradle ? getConfigSection(gradle, section) : undefined
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
    getKeystore: async (options) => {
      const {
        system,
        template,
        print
      } = toolbox
      const { name, storePassword, alias, aliasPassword, keystoreFile, keyStoreProperties} = options
      let properties = keyStoreProperties
      const storeFilePath = keystoreFile != '' ? keystoreFile : `android/app/${name}-key.keystore`
      print.info('Checking if CircleCI keystore already exists')
      const checkKeyStore = `$(whereis keytool | awk '{print $NF}') -v -list -keystore ${storeFilePath} -storepass ${storePassword} -alias ${alias}`
      let keystore
      try {
        keystore = await system.run(checkKeyStore)
        print.info(`Existing certificate found, using it.`)
      } catch (e) {
        print.info(`${print.checkmark} No existing certificate found.`)
      }

      let encodedKeystore
      if (!keystore) {
        encodedKeystore = createKeystore(options)
      }
      if(!properties){
        properties = await template.generate({
          template: 'keystore.properties',
          target: `android/app/${name}-keystore.properties`,
          props: { 
            ...options, 
            keystoreFile: keystoreFile || name,
            name: name.toUpperCase()
          }
        })
      }else{
        print.info(`Existing keystore.properties found.`)
      }
      return {
        keystore: encodedKeystore,
        keystoreProperties: Buffer.from(properties).toString('base64')
      }
    },
    base64EncodeJson: jsonPath => {
      const { system } = toolbox
      const encodeCommand = `openssl base64 -A -in ${jsonPath}`
      return system.run(encodeCommand)
    }
  }
}
