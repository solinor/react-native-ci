
const { filesystem, prompt } = require('gluegun')
const { matchCase } = require('../utils/functional')
const R = require('ramda')
const SELECT_ANOTHER_ONE = 'Select a different one'
const CREATE_A_NEW_ONE = 'Create a new one'
const PATH_TO_KEYSTORE = 'Write the path to keystore.key? Leave it empty to create one'
const PATH_TO_PROPERTY = 'Write the path to property file? Leave it empty to create one'
const CONFIRM_KEYSTORE = (file) => `Is this the keystore file of the project?  ${file}`
const CONFIRM_PROPERTY = (file) => `Is this the property file of the project?  ${file}`
const SELECT_PROPERTY = 'We found the following store file. Which one do you want to use?'
const SELECT_KEYSTORE = 'We found the following properties file. Which one do you want to use?'

const predefinedAnswers = () => [SELECT_ANOTHER_ONE, CREATE_A_NEW_ONE]
const isValidorEmptyPath = filePath => filePath ? filesystem.exists(filePath) : true

const askInputKeystoreFilePath = async () => {
  const filePath = process.env.INTEGRATION_TEST ? '' : await askSelectFilePath(PATH_TO_KEYSTORE)
  return isValidorEmptyPath(filePath) ? filePath : askInputKeystoreFilePath()
}

const askInputPropertyFilePath = async () => {
  const filePath = process.env.INTEGRATION_TEST ? '' : await askSelectFilePath(PATH_TO_PROPERTY)
  return isValidorEmptyPath(filePath) ? filePath : askInputPropertyFilePath()
}

const confirmKeyStoreFilePath = file => (
  flowConfirmFilePath(file, CONFIRM_KEYSTORE(file), askInputKeystoreFilePath)
)

const confirmPropertyFilePath = file => (
  flowConfirmFilePath(file, CONFIRM_PROPERTY(file), askInputPropertyFilePath)
)

const flowConfirmFilePath = async (file, message, askInput) => {
  const isValidFile = process.env.INTEGRATION_TEST ? true : await askConfirmFilePath(message)
  const verification = isValidFile && filesystem.exists(file)
  return verification ? file : askInput()
}

const initChoicesKeystoreFlow = choices => {
  return flowChooseFilePath(choices, askInputKeystoreFilePath, SELECT_PROPERTY)
}

const initChoicesPropertyFlow = choices => {
  return flowChooseFilePath(choices, askInputPropertyFilePath, SELECT_KEYSTORE)
}

const flowChooseFilePath = async (choices, askInput, message) => {
  const chooseFilePathWithAnswers = R.pipe(
    R.concat(choices),
    askChooseFilePath(message),
    R.then(response => getFileResponse(askInput, response))
  )
  const filePath = await chooseFilePathWithAnswers(predefinedAnswers())
  return filePath
}

const askChooseFilePath = R.curry(async (message, choices) => {
  const answer = await prompt.ask({
    name: 'selectedFile',
    type: 'select',
    message: message,
    choices: choices
  })
  return answer.selectedFile
})

const askSelectFilePath = async (message) => {
  const answer = await prompt.ask({
    type: 'input',
    name: 'filePath',
    message: message
  })
  return answer.filePath
}

const askConfirmFilePath = async (message) => {
  const answer = await prompt.ask({
    type: 'confirm',
    initial: true,
    name: 'isValidFile',
    message: message
  })
  return answer.isValidFile
}

const getFileResponse = R.curry((fn, file) => (
  matchCase(file)
    .on(x => x === SELECT_ANOTHER_ONE, () => fn())
    .on(x => x === CREATE_A_NEW_ONE, () => '')
    .otherwise(x => filesystem.exists(file) ? file : fn())
))

module.exports = {
  askInputKeystoreFilePath,
  confirmKeyStoreFilePath,
  initChoicesKeystoreFlow,
  askInputPropertyFilePath,
  confirmPropertyFilePath,
  initChoicesPropertyFlow
}
