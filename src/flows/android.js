module.exports.runAndroid = async (toolbox, config) => {
  await initAndroid(toolbox, config)
  await initFastlane(toolbox)
  await setupGradle(toolbox, config)
}

const askQuestions = async (prompt, options, android) => {
  const askGooglePlayJSONPath = {
    type: 'input',
    initial: options.googleJsonPath,
    skip: () => options.googleJsonPath,
    name: 'googleJsonPath',
    message: 'Path to Google Play Store JSON?'
  }
  const hasReleaseConfig = android.getConfigSection(['signingConfigs', 'release']) ? true : false
  const askKeystoreCreate = {
    type: 'confirm',
    initial: !hasReleaseConfig,
    name: 'canCreateKeystore',
    message: 'Do you want to create a keystore.properties file?'
  }
  const answers = prompt.ask([askGooglePlayJSONPath, askKeystoreCreate])
  return answers
}

const askKeystoreQuestions = async (prompt, options) => {
   const  askKeystorePassword = {
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

const initAndroid = async ({ android, http, prompt, print, circle, patching}, options) => {

  const { githubOrg, repo, circleApi } = options
  const { googleJsonPath, canCreateKeystore}  = await askQuestions(prompt, options, android)
  if (canCreateKeystore){
    await createKeystoreFile(android, prompt, print, circle, options)
  }

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

const initFastlane = async ({ system, android, template, filesystem, print }) => {
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

  await template.generate({
    template: 'fastlane/android/Fastfile',
    target: 'android/fastlane/Fastfile',
    props: { appId }
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

const createKeystoreFile = async (android, prompt, print, circle, options) => {
  const { githubOrg, repo, circleApi } = options
  const { keystoreAlias, keystorePassword , keystoreAliasPassword }  = await askKeystoreQuestions(prompt, options)
  const keystoreFiles = await android.createKeystore({
    name: repo,
    storePassword: keystorePassword,
    alias: keystoreAlias,
    aliasPassword: keystoreAliasPassword
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
