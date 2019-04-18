module.exports = {
  name: 'ios',
  alias: ['i'],
  run: async toolbox => {
    const {
      filesystem,
      print: {info, error, spin},
      android,
      ios,
      patching,
      system,
      template,
      npm,
      meta
    } = toolbox

    const iosSpinner = spin('Modifying iOS Project')
    await ios.addBuildConfigurations()
    await ios.addBundleIdSuffixes()
    await ios.addSchemes()
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
    info('iOS Configuration done!')
  }
}