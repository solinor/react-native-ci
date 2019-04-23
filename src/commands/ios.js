const initXcode = async ({ print: { spin }, template, npm, system, ios }) => {
  const iosSpinner = spin('Modifying iOS Project')
  await ios.addSchemes()
  await ios.addBuildConfigurations()
  await ios.addBundleIdSuffixes()
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

const initFastlane = async ({ ios, system, template, filesystem, prompt, print, print: { info, spin, success } }) => {
  const flSpinner = spin('Preparing Fastlane for iOS..')
  info('Preparing Fastlane for iOS..')
  const fastlanePath = system.which('fastlane')
  if (!fastlanePath) {
    info('No fastlane found, install...')
    await system.run('sudo gem install fastlane -NV')
  }

  await template.generate({
    template: 'fastlane/Gemfile',
    target: 'Gemfile',
    props: {}
  })

  const xcodeProjectName = filesystem.find('ios/', {
    matching: '*.xcodeproj',
    directories: true,
    recursive: false,
    files: false,
  })[0]
  const projectName = xcodeProjectName.split(/\/|\./)[1]

  const askDeveloperAccount = {
    type: 'input',
    initial: 'apple-developers@solinor.com',
    name: 'developerAccount',
    message: 'Your Apple developer account?'
  }
  const askITunesTeamId = {
    type: 'input',
    initial: '7J6HDCNPKE',
    name: 'developerTeamId',
    message: 'Your iTunes Team ID?'
  }

  const askAppConnectTeamId = {
    type: 'input',
    initial: '1355301',
    name: 'iTunesTeamId',
    message: 'App Connect Team ID?'
  }

  flSpinner.stop()

  // ask a series of questions
  const questions = [askDeveloperAccount, askITunesTeamId, askAppConnectTeamId]
  const answers = await prompt.ask(questions)

  await template.generate({
    template: 'fastlane/ios/Appfile',
    target: 'ios/fastlane/Appfile',
    props: {
      ...answers
    }
  })

  const askCertRepo = {
    type: 'input',
    initial: 'git@github.com:solinor/ciproject-ios-certs.git',
    name: 'certRepo',
    message: 'Specify path to iOS Signing key repo'
  }

  const askAppId = {
    type: 'input',
    initial: 'com.circletest',
    name: 'appId',
    message: 'What is your app bundle id?'
  }

  const matchQuestions = [askCertRepo, askAppId]
  const matchAnswers = await prompt.ask(matchQuestions)

  flSpinner.start()

  const appId = matchAnswers.appId

  info(matchAnswers)
  await template.generate({
    template: 'fastlane/ios/Matchfile',
    target: 'ios/fastlane/Matchfile',
    props: {
      ...matchAnswers,
      developerAccount: answers.developerAccount,
      appIds: `["${appId}", "${appId}.dev", "${appId}.staging"]`
    }
  })

  await template.generate({
    template: 'fastlane/ios/Pluginfile',
    target: 'ios/fastlane/Pluginfile',
    props: { }
  })

  const slackHook = ''

  await template.generate({
    template: 'fastlane/ios/Fastfile',
    target: 'ios/fastlane/Fastfile',
    props: {
      projectName,
      appId: matchAnswers['appId'],
      slackHook
    }
  })

  ios.produceApp({
    appId,
    devId: answers.developerAccount,
    appName: projectName
  })
  ios.produceApp({
    appId: `${appId}.dev`,
    devId: answers.developerAccount,
    appName: `${projectName} Dev`
  })
  ios.produceApp({
    appId: `${appId}.staging`,
    devId: answers.developerAccount,
    appName: `${projectName} Staging`
  })
  ios.matchSync({ certType: 'development', password: 'password' })
  ios.matchSync({ certType: 'appstore', password: 'password' })
  //ios.setXcodeMatch()

  flSpinner.succeed('Fastlane ready for iOS')
  success(`${print.checkmark} Fastlane iOS setup success`)
}

const initMatch = async ({ ios, system, template, filesystem, prompt, print, print: { info, spin, success } }) => {
}

const run = async (toolbox) => {
  const { print } = toolbox

  // const config = await askQuestions(toolbox)
//  await initXcode(toolbox)
  // await initFastlane(toolbox)
  // await initMatch(toolbox)

  print.success(`${print.checkmark} iOS setup success`)
}

module.exports = {
  name: 'ios',
  alias: 'i',
  run: run
}