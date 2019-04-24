module.exports.runAndroid = async (toolbox, config) => {
  await initAndroid(toolbox, config)
  await initFastlane(toolbox)
  await setupGradle(toolbox, config)
}

const askQuestion = async (prompt) => {
  const askGooglePlayJSONPath = {
    type: 'input',
    name: 'jsonPath',
    message: 'Path to Google Play Store JSON?'
  }
  return prompt.ask(askGooglePlayJSONPath)
}

const initAndroid = async ({ android, http, prompt, print }, { project, org, apiToken }) => {

  const { jsonPath } = await askQuestion(prompt)

  const keystoreFiles = await android.createKeystore({
    name: project,
    storePassword: '123456',
    alias: 'circleci',
    aliasPassword: '123456'
  })

  print.info(keystoreFiles)

  print.info('Store keystore to secret variables')
  const api = http.create({
    baseURL: 'https://circleci.com/api/v1.1/'
  })

  await api.post(
    `project/github/${org}/${project}/envvar?circle-token=${apiToken}`,
    {name: 'KEYSTORE', value: keystoreFiles.keystore},
    {headers: {'Content-Type': 'application/json'}}
  )

  print.info('Store keystore properties to secret variables')
  await api.post(
    `project/github/${org}/${project}/envvar?circle-token=${apiToken}`,
    {name: 'KEYSTORE_PROPERTIES', value: keystoreFiles.keystoreProperties},
    {headers: {'Content-Type': 'application/json'}}
  )

  print.info('Store Google Play JSON to secret variables')
  const encodedPlayStoreJSON = android.base64EncodeJson(jsonPath)
  await api.post(
    `project/github/${org}/${project}/envvar?circle-token=${apiToken}`,
    {name: 'GOOGLE_PLAY_JSON', value: encodedPlayStoreJSON},
    {headers: {'Content-Type': 'application/json'}}
  )
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

const setupGradle = async ({ android, patching }, { project }) => {
  const GRADLE_FILE_PATH = 'android/app/build.gradle'
  await patching.replace(
    GRADLE_FILE_PATH,
    'versionCode 1',
    'versionCode rootProject.hasProperty("VERSION_CODE") ? VERSION_CODE.toInteger() : 1'
  )

  const keyStoreProperties =
    `def keystorePropertiesFile = rootProject.file("app/${project}-keystore.properties")
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

  const propsPrefix = project.toUpperCase()
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
