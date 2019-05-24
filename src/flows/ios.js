module.exports.runIOS = async (toolbox, config) => {
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

const initXcode = async (
  { print: { spin }, template, npm, system, ios },
  config
) => {
  const iosSpinner = spin('Modifying iOS Project')
  await ios.addSchemes()
  await ios.addBuildConfigurations(config.developerTeamId)
  await ios.addBundleIdSuffixes()
  await system.run(
    `cd ios && fastlane run update_info_plist 'display_name:$(CUSTOM_PRODUCT_NAME)' plist_path:${
      config.projectName
    }/Info.plist`
  )

  iosSpinner.succeed('iOS Project modified')

  const rnConfigSpinner = spin(
    'Installing and configuring react-native-config..'
  )
  await npm.installPackage('react-native-config')
  await system.spawn('react-native link react-native-config', {
    stdio: 'ignore'
  })
  rnConfigSpinner.succeed('react-native-config installed')

  const envSpinner = spin('Generating environment config files..')
  await template.generate({
    template: '.env.ejs',
    target: '.env.dev',
    props: { env: 'DEV' }
  })

  await template.generate({
    template: '.env.ejs',
    target: '.env.staging',
    props: { env: 'STAGING' }
  })

  await template.generate({
    template: '.env.ejs',
    target: '.env.prod',
    props: { env: 'PRODUCTION' }
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
      Debug: ['Dev Debug', 'Staging Debug'],
      Release: ['Dev Release', 'Staging Release'],
      projectDirectory: 'iOS'
    }
  })
  await system.exec('npm run postinstall')
  spinner.succeed('react-native-schemes-manager installed..')
}

const initFastlane = async (
  {
    ios,
    system,
    template,
    filesystem,
    http,
    circle,
    prompt,
    print,
    print: { info, spin, success }
  },
  options
) => {
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
      ...options
    }
  })

  flSpinner.start()

  const { appId } = options

  await template.generate({
    template: 'fastlane/ios/Matchfile',
    target: 'ios/fastlane/Matchfile',
    props: {
      ...options,
      developerAccount: options.developerAccount,
      appIds: `["${appId}", "${appId}.dev", "${appId}.staging"]`
    }
  })

  await template.generate({
    template: 'fastlane/ios/Pluginfile',
    target: 'ios/fastlane/Pluginfile',
    props: {}
  })

  await template.generate({
    template: 'fastlane/ios/Fastfile',
    target: 'ios/fastlane/Fastfile',
    props: {
      projectName: options.projectName,
      appId: options.appId,
      slackHook: options.slackHook
    }
  })

  await system.run(`fastlane fastlane-credentials add --username ${options.developerAccount} --password ${options.developerPassword}`)

  await ios.produceApp({
    appId,
    devId: options.developerAccount,
    appName: options.projectName,
    developerTeamId: options.developerTeamId,
    iTunesTeamId: options.iTunesTeamId
  })
  await ios.produceApp({
    appId: `${appId}.dev`,
    devId: options.developerAccount,
    appName: `${options.projectName} Dev`,
    developerTeamId: options.developerTeamId,
    iTunesTeamId: options.iTunesTeamId
  })
  await ios.produceApp({
    appId: `${appId}.staging`,
    devId: options.developerAccount,
    appName: `${options.projectName} Staging`,
    developerTeamId: options.developerTeamId,
    iTunesTeamId: options.iTunesTeamId
  })
  await ios.matchSync({ certType: 'appstore', password: options.matchPassword })
  await ios.matchSync({
    certType: 'development',
    password: options.matchPassword
  })

  const { org, project, apiToken } = options
  circle.postEnvVariable({
    org,
    project,
    apiToken,
    key: 'MATCH_PASSWORD',
    value: options.matchPassword
  })

  circle.postEnvVariable({
    org,
    project,
    apiToken,
    key: 'FASTLANE_PASSWORD',
    value: options.developerPassword
  })

  flSpinner.succeed('Fastlane ready for iOS')
  success(`${print.checkmark} Fastlane iOS setup success`)
}

const getInput = async (
  { system, filesystem, prompt, ios, print },
  options
) => {
  const xcodeProjectName = filesystem.find('ios/', {
    matching: '*.xcodeproj',
    directories: true,
    recursive: false,
    files: false
  })[0]
  const projectName = xcodeProjectName.split(/\/|\./)[1]

  const devAnswers = await prompt.ask([
    {
      type: 'input',
      initial: options.appleDevAccount,
      skip: () => options.appleDevAccount,
      name: 'developerAccount',
      message: 'Your Apple developer account?'
    },
    {
      type: 'password',
      name: 'developerPassword',
      skip: () => options.appleDevPassword,
      message: 'Your Apple developer password?'
    }
  ])
  const { developerAccount, developerPassword } = {
    developerAccount: devAnswers.developerAccount ? devAnswers.developerAccount : options.developerAccount,
    developerPassword: devAnswers.developerPassword ? devAnswers.developerPassword : options.developerPassword
  } 

  let developerTeamId = options.iTunesTeamId;
  let iTunesTeamId = options.appConnectTeamId;
  if (!developerTeamId || !iTunesTeamId) {
    let itcTeams = []
    let devTeams = []
    const teamSpinner = print.spin('Trying to find your Apple teams..')
    try {
      const teams = await ios.getTeamIds({
        developerAccount,
        developerPassword
      })
      itcTeams.push(...teams.itcTeams)
      devTeams.push(...teams.devTeams)
    } catch (error) {
      teamSpinner.fail(error)
      print.error('there was an error: ' + error)
      process.exit(0)
    }
    teamSpinner.succeed('Apple teams search successful')
  
    developerTeamId = await promptForTeamId(
      devTeams,
      {
        message: 'Your Developer Team ID?',
        multiMessage: 'Please select the developer team you want to use'
      },
      prompt
    )
  
    iTunesTeamId = await promptForTeamId(
      itcTeams,
      {
        message: 'Your App connect Team ID?',
        multiMessage: 'Please select the app connect team you want to use'
      },
      prompt
    )  
  }

  //  print.info(`dev team id: ${developerTeamId}`)
  //  print.info(`app team id: ${iTunesTeamId}`)


  const askCertRepo = {
    type: 'input',
    initial: options.certRepoUrl,
    skip: () => options.certRepoUrl,
    name: 'certRepoUrl',
    message: 'Specify path to iOS Signing key repo'
  }

  const appId = await ios.getAppId()
  const isValidAppId = await prompt.confirm( 
    `We resolved Bundle ID for your project: ${appId}, is this correct?`
  )

  const askAppId = {
    type: 'input',
    name: 'appId',
    skip: isValidAppId,
    message: 'What is your project Bundle ID?'
  }

  const askMatchPassword = {
    type: 'input',
    initial: options.matchPassword,
    skip: () => options.matchPassword,
    name: 'matchPassword',
    message: 'What do you want to be your match repo password?'
  }

  // ask a series of questions
  const questions = [askAppId, askCertRepo, askMatchPassword]

  const answers = await prompt.ask(questions)
  return {
    ...answers,
    appId,
    certRepoUrl: options.certRepoUrl,
    matchPassword: options.matchPassword,
    developerAccount,
    developerPassword,
    developerTeamId,
    iTunesTeamId,
    slackHook: '',
    projectName
  }
}

const promptForTeamId = async (teams, { message, multiMessage }, prompt) => {
  if (teams.length > 1) {
    const { teamId } = await prompt.ask({
      type: 'select',
      name: 'teamId',
      choices: teams.map(team => {
        return {
          name: team.id,
          message: `${team.name} (${team.id})`,
        }
      }),
      message: multiMessage
    })
    return teamId
  } else if (teams.length === 1) {
    return teams[0]
  } else {
    const { teamId } = await prompt.ask({
      type: 'input',
      initial: options.iTunesTeamId,
      name: 'teamId',
      message: message
    })
    return teamId
  }
}
