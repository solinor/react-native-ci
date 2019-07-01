const { getVariableValue, getFirstAZWordFromSection, findKeystoreFiles, findPropertiesFiles } = require('../android/androidHelper')
const { validateAskKeystoreFilePath,
        validateConfirmKeyStoreFilePath,
        validateSelectKeystoreFilePath,
        validateAskPropertyFilePath,
        validateConfirmPropertyFilePath,
        validateSelectPropertyFilePath,
      } = require('../android/androidQuestions')
module.exports.runAndroid = async (toolbox, config) => {
  const releaseSection = await initAndroid(toolbox, config)
  await initFastlane(toolbox)
  if(!releaseSection){
    await setupGradle(toolbox, config, releaseSection)
  }
}

const askQuestions = async (prompt, options, android) => {
  const askGooglePlayJSONPath = {
    type: 'input',
    initial: options.googleJsonPath,
    skip: () => options.googleJsonPath,
    name: 'googleJsonPath',
    message: 'Path to Google Play Store JSON?'
  }
  
  // const askKeystoreCreate = {
  //   type: 'confirm',
  //   initial: !hasReleaseConfig,
  //   name: 'canCreateKeystore',
  //   message: 'Do you want to create a keystore.properties file?'
  // }
  const answers = prompt.ask([askGooglePlayJSONPath])
  return answers
}
const askkeystoreFilePath = async (prompt) => {
  const askKeystoreFile = {
    type: 'input',
    name: 'keystoreFile',
    message: 'Path to keystore.key?'
  }
  const answer = prompt.ask(askKeystoreFile)
  return answer
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

const initAndroid = async ({ android, prompt, print, circle, system, strings, filesystem}, options) => {
  const { githubOrg, repo, circleApi } = options
  const { googleJsonPath}  = await askQuestions(prompt, options, android)
  const releaseSection = android.getConfigSection(['signingConfigs', 'release'])
  const keystoreAnswers = {
    keystoreAlias : '',
    keystorePassword : '',
    keystoreAliasPassword : '',
    keystoreFile : '',
  }
  if (!releaseSection) {
    //Explain why we need this
    const { keystoreAlias, keystorePassword , keystoreAliasPassword }  = await askKeystoreQuestions(prompt, options)
    xx.keystoreFile = ''
    keystoreAnswers.keystorePassword = keystorePassword
    keystoreAnswers.keystoreAlias = keystoreAlias
    keystoreAnswers.keystoreAliasPassword = keystoreAliasPassword
  } else {
    //Find a Property file in releaseSection else find in properties and ask user if there is more than one
    const properties =  await strings.trim(await system.run('cd android/ && ./gradlew properties'))
    getVariableValue(properties,'.property')
    keystoreAnswers.keystoreFile = getVariableValue(properties,'STORE_FILE')
    keystoreAnswers.keystorePassword = getVariableValue(properties,'STORE_PASSWORD')
    keystoreAnswers.keystoreAlias = getVariableValue(properties,'KEY_ALIAS')
    keystoreAnswers.keystoreAliasPassword = getVariableValue(properties,'KEY_PASSWORD')
   
  }
  await setupKeystoreFile(android, print, circle,filesystem, prompt, options, keystoreAnswers)

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
  return releaseSection
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

const setupGradle = async ({ android, patching }, { repo }, releaseSection) => {
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

const setupKeystoreFile = async (android, print, circle, filesystem, prompt, options, keystoreAnswers) => {
  const { githubOrg, repo, circleApi } = options
  // const { keystoreAlias, keystorePassword , keystoreAliasPassword }  = await askKeystoreQuestions(prompt, options)
  const { keystoreAlias, keystorePassword , keystoreAliasPassword, keystoreFile } = keystoreAnswers
  let storeFile = ''
  if (keystoreFile !== undefined){
    if (filesystem.read(keystoreFile)){
      storeFile = keystoreFile
    }else{
      storeFile = ''
    }
  }

  if (storeFile === '') { 
    const file = await match(findKeystoreFiles())
    .on(x => x.length === 0, () => validateAskKeystoreFilePath(prompt, filesystem))
    .on(x => x.length === 1, (x) => validateConfirmKeyStoreFilePath(prompt, filesystem, x.pop()))
    .otherwise(x => validateSelectKeystoreFilePath(prompt, filesystem, x))
    if (filesystem.read(file)){
      console.log('yei')
      storeFile = file
    }else{
      console.log('nei')
      storeFile = ''
    }
  } 
 
  if( !keystoreAlias || !keystorePassword || !keystoreAliasPassword ){
    const releaseSection = android.getConfigSection(['signingConfigs', 'release']) 
    
    const keyStoreProperties =  await match(findPropertiesFiles())
    .on(x => x.length === 0, () => validateAskPropertyFilePath(prompt, filesystem))
    .on(x => x.length === 1, (x) => validateConfirmPropertyFilePath(prompt, filesystem, x.pop()))
    .otherwise(x => validateSelectPropertyFilePath(prompt, filesystem, x))

    console.log('keyStoreProperties:', keyStoreProperties)
    const read = filesystem.read(keyStoreProperties)
    const variables = getFirstAZWordFromSection(releaseSection)
    console.log('variables,', variables)
    //Get variables
    const keystoreFile = getVariableValue(read,'STORE_FILE')
    const keystorePassword = getVariableValue(read,'STORE_PASSWORD')
    const keystoreAlias = getVariableValue(read,'KEY_ALIAS')
    const keystoreAliasPassword = getVariableValue(read,'KEY_PASSWORD')
    console.log('read', read)
    console.log(`keystoreFile ${keystoreFile} keystorePassword ${keystorePassword} keystoreAlias ${keystoreAlias} keystoreAliasPassword ${keystoreAliasPassword}`)
  }
  
  const keystoreFiles = await android.getKeystore({
    name: repo,
    storePassword: keystorePassword,
    alias: keystoreAlias,
    aliasPassword: keystoreAliasPassword,
    keystoreFile: storeFile,
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

const matched = x => ({
  on: () => matched(x),
  otherwise: () => x,
})
const match = x => ({  
  on: (pred, fn) => (pred(x) ? matched(fn(x)) : match(x)),
  otherwise: fn => fn(x),
})
