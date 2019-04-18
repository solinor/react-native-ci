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

  // ask a series of questions
  const questions = [askOrganization, askProject, askApiToken]
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
    template: 'fastlane/Fastfile',
    target: 'android/fastlane/Fastfile',
    props: {}
  })

  const xcodeProjectName = filesystem.find('ios/*.xcodeproj', {
    directories: true
  })[0]

  await template.generate({
    template: 'fastlane/Fastfile',
    target: 'ios/fastlane/Fastfile',
    props: { xcodeProjectName }
  })

  await template.generate({
    template: 'fastlane/Appfile',
    target: 'android/fastlane/Appfile',
    props: { appId }
  })
}

const initCircleCI = async ({ template, prompt, print, http, android }, { org, project, apiToken }) => {
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
  }
}

const setupGradle = async ({ android, patching }, { project }) => {
  const keyStoreProperties =
`def keystorePropertiesFile = rootProject.file("app/${project}-keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

`

  await patching.patch('android/app/build.gradle', { insert: keyStoreProperties, before: 'android {' })

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

  await patching.patch('android/app/build.gradle', { insert: signingConfigs, before: 'buildTypes {' })

  const releaseType = new RegExp('buildTypes {\\n(\\s*)release\\s{')
  const signingConfigStr = '\n\t\t\tsigningConfig signingConfigs.release'
  await patching.patch('android/app/build.gradle', { insert: signingConfigStr, after: releaseType })
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
  alias: 'i',
  run: runInit
}
