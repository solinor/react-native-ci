const {
  getValueAfterEqual,
  getFirstAZWords,
  getVariableValueInDelimiter,
  findKeystoreFiles,
  findPropertiesFiles,
  findPropertiesPath,
  readGradleFile,
  retrieveValuesFromPropertyLocations,
  retrieveHardcodedProperties,
  retrieveValuesFromPropertiesVariables
} = require('../android/androidHelper')
const {
  askInputKeystoreFilePath,
  confirmKeyStoreFilePath,
  initChoicesKeystoreFlow,
  askInputPropertyFilePath,
  confirmPropertyFilePath,
  initChoicesPropertyFlow
} = require('../android/androidQuestions')
const { matchCase } = require('../utils/functional')

const askQuestion = async (prompt, options) => {
  const askGooglePlayJSONPath = {
    type: 'input',
    initial: options.googleJsonPath,
    skip: () => options.googleJsonPath,
    name: 'googleJsonPath',
    message: 'Path to Google Play Store JSON?'
  }
  const answers = prompt.ask([askGooglePlayJSONPath])
  return answers
}

const askKeystoreQuestions = async (prompt, options) => {
  const askKeystorePassword = {
    type: 'password',
    initial: options.keystorePassword,
    skip: () => options.keystorePassword,
    name: 'keystorePassword',
    message: 'Keystore password?'
  }
  const askKeystoreAlias = {
    type: 'input',
    initial: options.keystoreAlias,
    skip: () => options.keystoreAlias,
    name: 'keystoreAlias',
    message: 'Keystore alias?'
  }
  const askKeystoreAliasPassword = {
    type: 'password',
    initial: options.keystoreAliasPassword,
    skip: () => options.keystoreAliasPassword,
    name: 'keystoreAliasPassword',
    message: 'Keystore alias password?'
  }

  const answers = prompt.ask([askKeystorePassword, askKeystoreAlias, askKeystoreAliasPassword])
  return answers
}

const initAndroid = async ({ android, prompt, print, circle, filesystem }, options) => {
  const { githubOrg, repo, circleApi } = options
  const { googleJsonPath } = await askQuestion(prompt, options, android)
  const releaseSection = android.getConfigSection(['signingConfigs', 'release'])
  const keystoreAnswers = {
    keystoreAlias: '',
    keystorePassword: '',
    keystoreAliasPassword: '',
    keystoreFile: ''
  }

  if (!releaseSection) {
    // Explain why we need this and ask questions
    print.info('Android requires that all APKs be digitally signed with a certificate before they are installed on a device or updated')

    const { keystoreAlias, keystorePassword, keystoreAliasPassword } = await askKeystoreQuestions(prompt, options)
    keystoreAnswers.keystoreFile = ''
    keystoreAnswers.keystorePassword = keystorePassword
    keystoreAnswers.keystoreAlias = keystoreAlias
    keystoreAnswers.keystoreAliasPassword = keystoreAliasPassword
  } else { // ReleaseSection exists. Try to retrieve the vales
    const values = await retrieveValuesFromSection(releaseSection, filesystem, print)
    keystoreAnswers.keystoreFile = values.keystoreFile
    keystoreAnswers.keystorePassword = values.keystorePassword
    keystoreAnswers.keystoreAlias = values.keystoreAlias
    keystoreAnswers.keystoreAliasPassword = values.keystoreAliasPassword
  }

  await setupKeystoreFile(android, print, circle, filesystem, prompt, options, keystoreAnswers)
  if (googleJsonPath !== '' && googleJsonPath !== undefined) {
    print.info('Store Google Play JSON to secret variables')
    const encodedPlayStoreJSON = android.base64EncodeJson(googleJsonPath)
    circle.postEnvVariable({
      githubOrg,
      repo,
      circleApi,
      key: 'GOOGLE_PLAY_JSON',
      value: encodedPlayStoreJSON
    })
  }
}

const retrieveValuesFromSection = async (releaseSection, filesystem, print) => {
  const propertiesSpinner = print.spin('Trying to retrieve signing information...')
  let values = retrieveHardcodedProperties(releaseSection)
  if (!values || !values.keystoreAlias) {
    const gradle = readGradleFile().getOrElse('')
    values = retrieveValuesFromPropertyFile(releaseSection, gradle).getOrElse(undefined)
  }
  if (!values || !values.keystoreAlias) {
    values = await retrieveValuesFromPropertiesVariables()
  }
  values ? propertiesSpinner.succeed('Got properties') : propertiesSpinner.failed('Failed trying to retrieve properties')
  return values
}

const retrieveValuesFromPropertyFile = (releaseSection, gradle) => {
  const propertiesLocation = findPropertiesPath(gradle)
  const result = retrieveValuesFromPropertyLocations(releaseSection, propertiesLocation)
  return result
}

const initFastlane = async ({ system, android, template, print }, options) => {
  const fastlanePath = system.which('fastlane')
  if (!fastlanePath) {
    print.info('No fastlane found, install...')
    await system.run('sudo gem install fastlane -NV')
  }

  const appId = android.getApplicationId()

  await template.generate({
    template: 'fastlane/Gemfile',
    target: 'android/Gemfile',
    props: {}
  })

  const askBuildMode = {
    initial: options.buildMode,
    skip: () => options.buildMode,
    type: 'select',
    name: 'buildMode',
    message: 'Use Android App Bundle (.aab) or Android Package Kit (.apk) builds for Play Store?',
    choices: ['.aab', '.apk']
  }
  const buildMode = await askBuildMode

  await template.generate({
    template: 'fastlane/android/Fastfile',
    target: 'android/fastlane/Fastfile',
    props: { appId, useAabBuilds: buildMode === '.aab' }
  })

  await template.generate({
    template: 'fastlane/android/Appfile',
    target: 'android/fastlane/Appfile',
    props: { appId }
  })

  await template.generate({
    template: 'fastlane/android/Pluginfile',
    target: 'android/fastlane/Pluginfile',
    props: { }
  })
}

const setupGradle = async ({ android, patching }, { repo }) => {
  const releaseSection = android.getConfigSection(['signingConfigs', 'release'])
  if (releaseSection) {
    return
  }
  const GRADLE_FILE_PATH = 'android/app/build.gradle'
  await patching.replace(
    GRADLE_FILE_PATH,
    'versionCode 1',
    'versionCode rootProject.hasProperty("VERSION_CODE") ? VERSION_CODE.toInteger() : 1'
  )

  const keyStoreProperties =
    `def keystorePropertiesFile = rootProject.file("app/${repo}-keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

`

  await patching.patch(
    GRADLE_FILE_PATH,
    {
      insert: keyStoreProperties,
      before: 'android {'
    }
  )

  const buildFlavors =
    `flavorDimensions "env"
    productFlavors {
        dev {
            dimension "env"
            applicationIdSuffix ".dev"
            versionNameSuffix "-DEV"
        }
        staging {
            dimension "env"
            applicationIdSuffix ".staging"
            versionNameSuffix "-STAGING"
        }
        prod {
            dimension "env"
        }
    }
   
    `

  await patching.patch(
    GRADLE_FILE_PATH,
    {
      insert: buildFlavors,
      before: 'buildTypes {'
    }
  )

  const propsPrefix = repo.toUpperCase()
  const signingConfigs =
    `signingConfigs {
        release {
            keyAlias keystoreProperties['${propsPrefix}_RELEASE_KEY_ALIAS']
            keyPassword keystoreProperties['${propsPrefix}_RELEASE_KEY_PASSWORD']
            storeFile file(keystoreProperties['${propsPrefix}_RELEASE_STORE_FILE'])
            storePassword keystoreProperties['${propsPrefix}_RELEASE_STORE_PASSWORD']
        }
    }\n
    `

  await patching.patch(
    GRADLE_FILE_PATH,
    {
      insert: signingConfigs,
      before: 'buildTypes {'
    }
  )

  const releaseType = new RegExp('buildTypes {\\n(\\s*)release\\s{')
  const signingConfigStr = '\n\t\t\tsigningConfig signingConfigs.release'
  await patching.patch(
    GRADLE_FILE_PATH,
    {
      insert: signingConfigStr,
      after: releaseType
    }
  )
}

const setupKeystoreFile = async (android, print, circle, filesystem, prompt, options, keystoreAnswers) => {
  const { githubOrg, repo, circleApi } = options
  // const { keystoreAlias, keystorePassword , keystoreAliasPassword }  = await askKeystoreQuestions(prompt, options)
  const { keystoreAlias, keystorePassword, keystoreAliasPassword, keystoreFile } = keystoreAnswers
  let alias = keystoreAlias
  let password = keystorePassword
  let aliasPassword = keystoreAliasPassword
  let storeFile = keystoreFile
  if (!storeFile || filesystem.read(storeFile)) {
    storeFile = ''
  }

  if (storeFile === '') {
    const file = await matchCase(findKeystoreFiles())
      .on(x => x.length === 0, () => askInputKeystoreFilePath())
      .on(x => x.length === 1, (x) => confirmKeyStoreFilePath(x.pop()))
      .otherwise(x => initChoicesKeystoreFlow(x))
    if (file && filesystem.read(file)) {
      storeFile = file
    } else {
      storeFile = ''
    }
  }
  let keyStoreProperties
  if (!alias || !password || !aliasPassword) {
    const releaseSection = android.getConfigSection(['signingConfigs', 'release'])

    keyStoreProperties = await matchCase(findPropertiesFiles())
      .on(x => x.length === 0, () => askInputPropertyFilePath())
      .on(x => x.length === 1, (x) => confirmPropertyFilePath(x.pop()))
      .otherwise(x => initChoicesPropertyFlow(x))
    if (!keyStoreProperties) {
      const { keystoreAlias, keystorePassword, keystoreAliasPassword } = await askKeystoreQuestions()
      alias = keystoreAlias
      password = keystorePassword
      aliasPassword = keystoreAliasPassword
    } else {
      const file = filesystem.read(keyStoreProperties)
      const variables = getFirstAZWords(releaseSection)
      const dictionary = {}
      variables.forEach((variable) => {
        const variableInBracket = getVariableValueInDelimiter(releaseSection, variable, '[', ']')
        const value = getValueAfterEqual(file, variableInBracket)
        dictionary[variable] = value
      })
      // Get variables
      storeFile = dictionary['storeFile']
      password = dictionary['storePassword']
      alias = dictionary['keyAlias']
      aliasPassword = dictionary['keyPassword']
    }
  }

  const keystoreFiles = await android.getKeystore({
    name: repo,
    storePassword: password,
    alias: alias,
    aliasPassword: aliasPassword,
    keystoreFile: storeFile,
    keyStoreProperties: keyStoreProperties || ''
  })

  print.info('Store keystore to secret variables')
  circle.postEnvVariable({
    githubOrg,
    repo,
    circleApi,
    key: 'KEYSTORE',
    value: keystoreFiles.encodedKeystore
  })

  print.info('Store keystore properties to secret variables')
  circle.postEnvVariable({
    githubOrg,
    repo,
    circleApi,
    key: 'KEYSTORE_PROPERTIES',
    value: keystoreFiles.keystoreProperties
  })
}

module.exports.runAndroid = async (toolbox, config) => {
  await initAndroid(toolbox, config)
  await initFastlane(toolbox, config)
  await setupGradle(toolbox, config)
  return true
}
