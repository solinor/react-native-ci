module.exports = {
  name: 'test',
  alias: ['t'],
  run: async toolbox => {
    const {
      filesystem,
      print: { info, error },
      android,
      ios,
      patching,
      system,
      template,
      npm,
      meta
    } = toolbox

    // ios.addBuildConfigurations()
    // ios.addBundleIdSuffixes()
    // ios.addSchemes()

    // await android.createKeystore({
    //   name: 'circletest',
    //   storePassword: '123456',
    //   alias: 'circleci',
    //   aliasPassword: '123456'
    // })
   //     const { execSync } = require('child_process')
   // execSync('fastlane init', { cwd: 'android/', input: 'echo \'com.circletest\nfastlane/secret.json\nn\n\'' })
   //  const appId = android.getApplicationId()
   //  info('app id: ' + appId)
   //
   //  info('Installing and configuring react-native-config..')
   //  try {
   //    if (!npm.isPackageInstalled('react-native-config')) {
   //      const rnConfig = await npm.installPackage('react-native-config')
   //      info('Installed: ' + rnConfig)
   //    } else {
   //      info('react-native-config is already installed!')
   //    }
   //    info('is linked? ' + android.isLibraryLinked('react-native-config'))
   //    if (!android.isLibraryLinked('react-native-config')) {
   //      const link = await system.run('sudo react-native link react-native-config')
   //      info('linking done: ' + link)
   //    } else {
   //      info('react-native-config already linked..')
   //    }
   //  } catch (errorObj) {
   //    error('There was an error!')
   //  }

    info('Generating environment config files..')
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

    info('Patching app build.gradle..')
    const RNConfig = 'project.ext.envConfigFiles = [\n' +
      '    dev: ".env.dev",\n' +
      '    staging: ".env.staging",\n' +
      '    prod: ".env.prod",\n' +
      ']\n' +
      'apply from: project(\':react-native-config\').projectDir.getPath() + "/dotenv.gradle"\n'
    await patching.patch('android/app/build.gradle', { insert: RNConfig, after: 'apply plugin: "com.android.application"\n' })

    const defaultPackage = '        resValue "string", "build_config_package", "com.circletest"\n'
    const ndkStr = android.getConfigSection('ndk')
    await patching.patch('android/app/build.gradle', { insert: defaultPackage, after: ndkStr })

    const buildFlavors = '    flavorDimensions "env"\n' +
      '    productFlavors {\n' +
      '        dev {\n' +
      '            dimension "env"\n' +
      '            applicationIdSuffix ".dev"\n' +
      '            versionNameSuffix "-DEV"\n' +
      '        }\n' +
      '        staging {\n' +
      '            dimension "env"\n' +
      '            applicationIdSuffix ".staging"\n' +
      '            versionNameSuffix "-STAGING"\n' +
      '        }\n' +
      '        prod {\n' +
      '            dimension "env"\n' +
      '        }\n' +
      '    }\n'
    const buildTypeStr = android.getConfigSection('buildType')
    await patching.patch('android/app/build.gradle', { insert: buildFlavors, after: buildTypeStr })
    info('Success!')
  }
}
