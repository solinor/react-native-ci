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

const initCircleCI = async ({ template, prompt, print, http, android }) => {
  await template.generate({
    template: 'circleci/config.yml',
    target: '.circleci/config.yml',
    props: {}
  })

  // text input
  const askOrganization = {
    type: 'list',
    name: 'org',
    message: 'Your github organization?',
    choices: ['solinor', 'something']
  }
  const askProject = {
    type: 'list',
    name: 'project',
    message: 'Your github project name?',
    choices: ['circletest', 'something']
  }
  const askApiToken = {
    type: 'input',
    name: 'apiToken',
    message: 'Your CircleCI API token?'
  }

  // ask a series of questions
  const questions = [askOrganization, askProject, askApiToken]
  const { org, project, apiToken } = await prompt.ask(questions)

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

const runInit = async toolbox => {
  const { print } = toolbox

  await initFastlane(toolbox)
  await initCircleCI(toolbox)

  print.success(`${print.checkmark} Initialization success`)
}

module.exports = {
  name: 'init',
  alias: 'i',
  run: runInit
}
