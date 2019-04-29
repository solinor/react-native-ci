module.exports.runIOS = async (toolbox, config) =>  {
  const input = await getInput(toolbox, config)
  await initFastlane(toolbox, {
    ...config,
    ...input
  })
  await initXcode(toolbox, {
    ...config,
    ...input
  })
}

const initXcode = async ({ print: { spin }, template, npm, system, ios }, config) => {
  const iosSpinner = spin('Modifying iOS Project')
  await ios.addSchemes()
  await ios.addBuildConfigurations(config.developerTeamId)
  await ios.addBundleIdSuffixes()
  await system.run(`cd ios && fastlane run update_info_plist 'display_name:$(CUSTOM_PRODUCT_NAME)' plist_path:${config.projectName}/Info.plist`)

  iosSpinner.succeed('iOS Project modified')

  const rnConfigSpinner = spin('Installing and configuring react-native-config..')
  await npm.installPackage('react-native-config')
  await system.spawn('react-native link react-native-config', { stdio: 'ignore'})
  rnConfigSpinner.succeed('react-native-config installed')

  const envSpinner = spin('Generating environment config files..')
  await template.generate({
    template: '.env.ejs',
    target: '.env.dev',
    props: { env: 'DEV'}
  })

  await template.generate({
    template: '.env.ejs',
    target: '.env.staging',
    props: { env: 'STAGING'}
  })

  await template.generate({
    template: '.env.ejs',
    target: '.env.prod',
    props: { env: 'PRODUCTION'}
  })
  envSpinner.succeed('Environments generated')

  const spinner = spin('Installing react-native-schemes-manager')
  await npm.installPackage('react-native-schemes-manager', false, true)
  npm.addPackageScript({
    key: 'postinstall',
    value: 'react-native-schemes-manager all'
  })
  npm.addConfigSection({
    key: 'xcodeSchemes',
    value: {
      Debug: [
        'Dev Debug',
        'Staging Debug'
      ],
      Release: [
        'Dev Release',
        'Staging Release'
      ],
      'projectDirectory': 'iOS'
    }
  })
  await system.exec('npm run postinstall')
  spinner.succeed('react-native-schemes-manager installed..')
}

const initFastlane = async ({ ios, system, template, filesystem, http, prompt, print, print: { info, spin, success } }, config) => {
  const flSpinner = spin('Preparing Fastlane for iOS..')
  const fastlanePath = system.which('fastlane')
  if (!fastlanePath) {
    await system.run('sudo gem install fastlane -NV')
  }

  await template.generate({
    template: 'fastlane/Gemfile',
    target: 'ios/Gemfile',
    props: {}
  })

  await template.generate({
    template: 'fastlane/ios/Appfile',
    target: 'ios/fastlane/Appfile',
    props: {
      ...config
    }
  })

  flSpinner.start()

  const { appId } = config

  await template.generate({
    template: 'fastlane/ios/Matchfile',
    target: 'ios/fastlane/Matchfile',
    props: {
      ...config,
      developerAccount: config.developerAccount,
      appIds: `["${appId}", "${appId}.dev", "${appId}.staging"]`
    }
  })

  await template.generate({
    template: 'fastlane/ios/Pluginfile',
    target: 'ios/fastlane/Pluginfile',
    props: { }
  })

  await template.generate({
    template: 'fastlane/ios/Fastfile',
    target: 'ios/fastlane/Fastfile',
    props: {
      projectName: config.projectName,
      appId: config.appId,
      slackHook: config.slackHook
    }
  })

  await ios.produceApp({
    appId,
    devId: config.developerAccount,
    appName: config.projectName,
    developerTeamId: config.developerTeamId,
    iTunesTeamId: config.iTunesTeamId
  })
  await ios.produceApp({
    appId: `${appId}.dev`,
    devId: config.developerAccount,
    appName: `${config.projectName} Dev`,
    developerTeamId: config.developerTeamId,
    iTunesTeamId: config.iTunesTeamId
  })
  await ios.produceApp({
    appId: `${appId}.staging`,
    devId: config.developerAccount,
    appName: `${config.projectName} Staging`,
    developerTeamId: config.developerTeamId,
    iTunesTeamId: config.iTunesTeamId
  })
  await ios.matchSync({ certType: 'appstore', password: config.matchPassword })
  await ios.matchSync({ certType: 'development', password: config.matchPassword })

  const api = http.create({
    baseURL: 'https://circleci.com/api/v1.1/'
  })
  await api.post(
    `project/github/${config.org}/${config.project}/envvar?circle-token=${config.apiToken}`,
    {name: 'MATCH_PASSWORD', value: config.matchPassword},
    {headers: {'Content-Type': 'application/json'}}
  )

  flSpinner.succeed('Fastlane ready for iOS')
  success(`${print.checkmark} Fastlane iOS setup success`)
}


const getInput = async ({ system, filesystem, prompt }, { defaults = {} }) => {
  const xcodeProjectName = filesystem.find('ios/', {
    matching: '*.xcodeproj',
    directories: true,
    recursive: false,
    files: false,
  })[0]
  const projectName = xcodeProjectName.split(/\/|\./)[1]

  const askDeveloperAccount = {
    type: 'input',
    initial: defaults.appleDevAccount,
    name: 'developerAccount',
    message: 'Your Apple developer account?'
  }
  const askITunesTeamId = {
    type: 'input',
    initial: defaults.iTunesTeamId,
    name: 'developerTeamId',
    message: 'Your iTunes Team ID?'
  }

  const askAppConnectTeamId = {
    type: 'input',
    initial: defaults.appConnectTeamId,
    name: 'iTunesTeamId',
    message: 'App Connect Team ID?'
  }

  const askCertRepo = {
    type: 'input',
    initial: defaults.certRepoUrl,
    name: 'certRepo',
    message: 'Specify path to iOS Signing key repo'
  }

  const askAppId = {
    type: 'input',
    initial: defaults.appId,
    name: 'appId',
    message: 'What is your app bundle id?'
  }

  const askMatchPassword = {
    type: 'input',
    initial: defaults.matchPassword,
    name: 'matchPassword',
    message: 'What do you want to be your match repo password?'
  }

  // ask a series of questions
  const questions = [askDeveloperAccount, askITunesTeamId, askAppConnectTeamId, askCertRepo, askAppId, askMatchPassword]
  const answers = await prompt.ask(questions)
  return {
    ...answers,
    slackHook: '',
    projectName
  }
}
