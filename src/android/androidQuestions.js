
const askFilePath = async (prompt, message) => {
	const answer = await prompt.ask({
		type: 'input',
		name: 'filePath',
		message: message
	})
	return answer.filePath
}

// KeystoreFile
const validateAskKeystoreFilePath = async (prompt, filesystem) => {
	const filePath = await askFilePath(prompt, 'Path to keystore.key? Leave it empty to create one')
  return isValidPath(filesystem, filePath) ?  filePath : validateAskKeystoreFilePath(prompt, filesystem)
}

const validateAskPropertyFilePath = async (prompt, filesystem) => {
	const filePath = await askFilePath(prompt, 'Path to property file? Leave it empty to create one')
	return isValidPath(filesystem, filePath) ?  filePath : validateAskPropertyFilePath(prompt, filesystem)
}

const isValidPath = (filesystem, filePath) => filePath === undefined ? true : filesystem.exists(filePath) 

const confirmFilePath = async (prompt, message) => {
	const answer = await prompt.ask({
		type: 'confirm',
		initial: true,
		name: 'isValidFile',
		message: message
	})
	return answer.isValidFile
}

const validateConfirmKeyStoreFilePath = async (prompt, filesystem, file) => {
	const isValidFile = await confirmFilePath(prompt,`Is this the keystore file of the project?  ${file}`)
  return isValidFile && filesystem.exists(file) ? file : validateAskKeystoreFilePath(prompt, filesystem)
}

const validateConfirmPropertyFilePath = async (prompt, filesystem, file) => {
	const isValidFile = await confirmFilePath(prompt, `Is this the property file of the project?  ${file}`)
  return isValidFile && filesystem.exists(file) ? file : validateAskPropertyFilePath(prompt, filesystem)
}

const validateSelectKeystoreFilePath = async (prompt, filesystem, choices) => {
	const populatedChoices = choices.concat(predefinedAnswers())
	const answer = await selectKeystoreFilePath(prompt, populatedChoices)
	const { selectedKeystoreFile } = answer
	switch (selectedKeystoreFile){
		case SELECT_ANOTHER_ONE:
			return validateAskKeystoreFilePath(prompt, filesystem)
		case  CREATE_A_NEW_ONE:
			return ''
		default:
				return filesystem.exists(selectedKeystoreFile) ? selectedKeystoreFile : validateAskKeystoreFilePath(prompt, filesystem)
	}
}

const validateSelectPropertyFilePath = async (prompt, filesystem, choices) => {
	const populatedChoices = choices.concat(predefinedAnswers())
	const answer = await selectPropertyFilePath(prompt, populatedChoices)
	//Pass as function to the refactored one. Go home man
	const { selectedPropertyFile } = answer
	switch (selectedPropertyFile){
		case SELECT_ANOTHER_ONE:
			return validateAskPropertyFilePath(prompt, filesystem)
		case  CREATE_A_NEW_ONE:
			return ''
		default:
				return filesystem.exists(selectedPropertyFile) ? selectedPropertyFile : validateAskPropertyFilePath(prompt, filesystem)
	}
}

const selectKeystoreFilePath = async (prompt, choices) => {
	const answer = prompt.ask({
    name: 'selectedKeystoreFile',
    type: 'select',
    message: 'We found the following keystore. Which one do you want to provide?',
    choices: choices
	})
	return answer
}

// Property file

const selectPropertyFilePath = async (prompt, choices) => {
	const answer = prompt.ask({
    name: 'selectedPropertyFile',
    type: 'select',
    message: 'We found the following properties file. Which one do you want to use?',
    choices: choices
	})
	return answer
}

const predefinedAnswers = () => [SELECT_ANOTHER_ONE,CREATE_A_NEW_ONE ]
const SELECT_ANOTHER_ONE = 'Select a different one'
const CREATE_A_NEW_ONE = 'Create a new one'
module.exports = {
	validateAskKeystoreFilePath,
	validateConfirmKeyStoreFilePath,
	validateSelectKeystoreFilePath,
	validateAskPropertyFilePath,
	validateConfirmPropertyFilePath,
	validateSelectPropertyFilePath,
}