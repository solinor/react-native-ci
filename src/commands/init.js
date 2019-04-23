const askQuestions = async ({ prompt }) => {
  // text input
  const askOrganization = {
    type: 'input',
    initial: 'solinor',
    name: 'org',
    message: 'Your github organization?'
  }
  const askProject = {
    type: 'input',
    initial: 'circletest',
    name: 'project',
    message: 'Your github project name?'
  }
  const askApiToken = {
    type: 'input',
    name: 'apiToken',
    message: 'Your CircleCI API token?'
  }
  const askGooglePlayJSONPath = {
    type: 'input',
    name: 'jsonPath',
    message: 'Path to Google Play Store JSON?'
  }

  // ask a series of questions
  const questions = [askOrganization, askProject, askApiToken, askGooglePlayJSONPath]
  return prompt.ask(questions)
}

const initFastlane = async ({ system, android, template, filesystem, print }) => {
  const fastlanePath = system.which('fastlane')
  if (!fastlanePath) {
    print.info('No fastlane found, install...')
    await system.run('sudo gem install fastlane -NV')
  }
  //    const { execSync } = require('child_process')
  //    execSync('fastlane init', { cwd: 'android/', input: 'echo \'com.circletest\nfastlane/secret.json\nn\n\'' })

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

const initCircleCI = async ({ template, prompt, print, http, android }, { org, project, apiToken, jsonPath }) => {
  await template.generate({
    template: 'circleci/config.yml',
    target: '.circleci/config.yml',
    props: {}
  })

  const api = http.create({
    baseURL: 'https://circleci.com/api/v1.1/'
  })

  const { status } = await api.post(
    `project/github/${org}/${project}/follow?circle-token=${apiToken}`
  )

  if (status === 200) {
    const keystoreFiles = await android.createKeystore({
      name: project,
      storePassword: '123456',
      alias: 'circleci',
      aliasPassword: '123456'
    })

    print.info(keystoreFiles)

    print.info('Store keystore to secret variables')
    await api.post(
      `project/github/${org}/${project}/envvar?circle-token=${apiToken}`,
      { name: 'KEYSTORE', value: keystoreFiles.keystore },
      { headers: { 'Content-Type': 'application/json' } }
    )

    print.info('Store keystore properties to secret variables')
    await api.post(
      `project/github/${org}/${project}/envvar?circle-token=${apiToken}`,
      { name: 'KEYSTORE_PROPERTIES', value: keystoreFiles.keystoreProperties },
      { headers: { 'Content-Type': 'application/json' } }
    )

    print.info('Store Google Play JSON to secret variables')
    const encodedPlayStoreJSON = android.base64EncodeJson(jsonPath)
    await api.post(
      `project/github/${org}/${project}/envvar?circle-token=${apiToken}`,
      { name: 'GOOGLE_PLAY_JSON', value: encodedPlayStoreJSON },
      { headers: { 'Content-Type': 'application/json' } }
    )

  }
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

const runInit = async toolbox => {
  const { print } = toolbox

  const config = await askQuestions(toolbox)

  await initFastlane(toolbox)
  await initCircleCI(toolbox, config)
  await setupGradle(toolbox, config)

  print.success(`${print.checkmark} Initialization success`)
}

module.exports = {
  name: 'init',
  alias: 'e',
  run: runInit
}
