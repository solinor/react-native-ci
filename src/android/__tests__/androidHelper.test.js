const { filesystem} = require('gluegun')
const R = require('ramda')
const { getConfigSection,
	getValueFromProperty,
	getValueAfterEqual,
	getVariableValueInDelimiter,
	getFirstAZWordFromSection,
	geFirstWordsFromSection,
	findAndroidPath,
	findKeystoreFiles,
	findPropertiesFiles,
	findPropertiesPath,
	findRoot,
	readGradleFile,
	retrieveHardcodedProperties,
	retrieveValuesFromPropertiesVariables,
 } = require('../androidHelper')

 const no_release = filesystem.read('src/android/__mocks__/no-release-build.gradle')
 const gradle = filesystem.read('src/android/__mocks__/build.gradle')
 beforeAll(() => {
	jest.setTimeout(60000) //Mandatory for API Request
	process.env.INTEGRATION_TEST = true}) 
beforeEach(() => {
	properties = filesystem.read('./example_project/android/app/internalCiProject-keystore.properties')
});

describe('Config Section', () => {
	test('no-release-build.gradle getConfigSection does not contains release sub section inside signingConfigs', async () => {
		const output = getConfigSection(no_release, ['signingConfigs','release'])
		expect(output).toBe('')
	})

	test('find build.gradle file', async () => {
		const output = readGradleFile().getOrElse('')
		expect(output).not.toBe()
	})  
	
	test('find path for gradwle command', async () => {
		const output = findAndroidPath().getOrElse('')
		expect(output).toBe('example_project/android/')
	})   

	test('build.gradle getConfigSection contains signingConfigs', async () => {
		const output = getConfigSection(gradle, ['signingConfigs'])
		expect(output).not.toBe('')
	})

	test('getConfigSection convert  section string to array', async () => {
		const output = getConfigSection(gradle, 'signingConfigs')
		expect(output).not.toBe('')
	})

	test('build.gradlde getConfigSection contains release sub section inside signingConfigs', async () => {
		const output = getConfigSection(gradle, ['signingConfigs','release'])
		expect(output).not.toBe('')
	})

	test('find variables in release section', async() => {
		const output = getConfigSection(gradle, ['signingConfigs','release'])
		const result = getFirstAZWordFromSection(output)
		expect(result).toHaveLength(4)
	})

	test('get value from brackets in release section', async() => {
		const output = getConfigSection(gradle, ['signingConfigs','release'])
		const keyAlias = getVariableValueInDelimiter(output, 'keyAlias','[', ']').getOrElse('')
		expect(keyAlias).toBe('INTERNALCIPROJECT_RELEASE_KEY_ALIAS')
		
		const keyPassword = getVariableValueInDelimiter(output, 'keyPassword','[', ']').getOrElse('')
		expect(keyPassword).toBe('INTERNALCIPROJECT_RELEASE_KEY_PASSWORD')

		const storePassword = getVariableValueInDelimiter(output, 'storePassword','[', ']').getOrElse('')
		expect(storePassword).toBe('INTERNALCIPROJECT_RELEASE_STORE_PASSWORD')
	})

	test('getValueFromProperty in release section', async () => {
		const output = getConfigSection(gradle, ['signingConfigs','release'])
		const valueVariable = getValueFromProperty(output,'keyPassword')
		expect(valueVariable).not.toBe(undefined)
	})

	test('getValueAfterEqual find variable in file and get value', async () => {
		const storePassword = getValueAfterEqual(properties,'INTERNALCIPROJECT_RELEASE_STORE_PASSWORD').getOrElse('')
		// const storePassword = get(getValueAfterEqual).getOrElse();
		expect(storePassword).toBe('123456')
		const keyAlias = getValueAfterEqual(properties,'INTERNALCIPROJECT_RELEASE_KEY_ALIAS').getOrElse('')
		expect(keyAlias).toBe('app')
	})

	test('find keystore file', async () => {
		const output = findKeystoreFiles('./example_project')
		expect(output).toHaveLength(2)
	})

	test('find properties file', async () => {
		const output = findPropertiesFiles('./example_project')
		//Output can contains local.properties but these will fail in CI because it is added to .gitignore
		const filtered = output.filter(R.complement(R.contains('local.properties')))
		expect(filtered).toHaveLength(2)
	})

	test('findPropertiesPath', async () =>{
		const variables = findPropertiesPath(gradle)
		expect(variables).toHaveLength(3)
		expect(variables[0]).toBe('../local.properties')
		expect(variables[1]).toBe('localProps[keystore.props.file]')
		expect(variables[2]).toBe('app/internalCiProject-keystore.properties')
	})

	test('keystoreProperties with single quotes', async () =>{
		line = 'keystoreProperties.load(new FileInputStream(keystorePropertiesFile))'
		const variables = findRoot(line)
		expect(variables).toBe('keystorePropertiesFile')
	})

	test('find value in keystoreProperties with quotes', async() => {
		line = 'keystorePropertiesFile = rootProject.file("app/internalCiProject-keystore.properties")'
		const variables = findRoot(line)
		expect(variables).toBe('app/internalCiProject-keystore.properties')
	})

	test('findRoot', async () =>{
		const line1 = "localProps.load(new FileInputStream(file('../local.properties')))"
		const variables = findRoot(line1)
		expect(variables).toBe('../local.properties')
		const line2 = 'localProps.load(new FileInputStream(file(\"../local.properties\")))'
		const quotes = findRoot(line2)
		expect(quotes).toBe('../local.properties')
	})

	test('release section contains hardcoded values', async () =>{
		const releaseSection = "release {\n" +
			" storeFile file('your/key/store/path')\n" +
			" keyAlias 'keystorealias'\n" +
			" storePassword 'password'\n" +
			" keyPassword 'keypassword'\n" +
		" }"
		const keyAlias = 'keyAlias'
		const value = getVariableValueInDelimiter(releaseSection, keyAlias,"'","'").getOrElse('')
		expect(value).toBe('keystorealias')

		const storePassword = 'storePassword'
		const storePasswordValue = getVariableValueInDelimiter(releaseSection, storePassword, "'", "'").getOrElse('')
		expect(storePasswordValue).toBe('password')

		const keyPassword = 'keyPassword'
		const keyPasswordValue = getVariableValueInDelimiter(releaseSection, keyPassword, "'", "'").getOrElse('')
		expect(keyPasswordValue).toBe('keypassword')
		
		const storeFile = "storeFile"
		const storeFileValue = getVariableValueInDelimiter(releaseSection, storeFile, "'", "'").getOrElse('')
		expect(storeFileValue).toBe('your/key/store/path')
	})

	test('retrieve hardcoded properties from gradle', async () =>{
		const signingConfig	=
			"release { \n" +
				"	storeFile file('./internalCiProject-key.keystore') \n" +
				"	keyAlias 'alias' \n" +
				"	storePassword '123456' \n" +
				"	keyPassword '123456' \n" +
			"}\n" +
		"}\n " 
		const values = retrieveHardcodedProperties(signingConfig)
		expect(values['keystoreAlias']).toBe('alias')
		expect(values['keystoreAliasPassword']).toBe('123456')
		expect(values['keystorePassword']).toBe('123456')
		expect(values['keystoreFile']).toBe('./internalCiProject-key.keystore')
	})

	test('retrieve properties in brackets inside releaseSection', async () =>{
		const signingConfig	=
			"release { \n" +
			"storeFile file(keystoreProperties['RELEASE_STORE_FILE'])\n" +
			"keyAlias keystoreProperties['RELEASE_KEY_ALIAS']\n" +
			"storePassword keystoreProperties['RELEASE_STORE_PASSWORD']\n" +
			"keyPassword keystoreProperties['RELEASE_KEY_PASSWORD']\n" +
			"}\n" +
		"}\n " 
		const values = geFirstWordsFromSection(signingConfig)
		const storeFileKey = values[0].key
		const storeFileValue = values[0].value
		expect(storeFileKey).toBe('storeFile')
		expect(storeFileValue).toBe('RELEASE_STORE_FILE')

		const keyAliasKey = values[1].key
		const keyAliasValue = values[1].value
		expect(keyAliasKey).toBe('keyAlias')
		expect(keyAliasValue).toBe('RELEASE_KEY_ALIAS')

		const storePasswordKey = values[2].key
		const storePasswordValue = values[2].value
		expect(storePasswordKey).toBe('storePassword')
		expect(storePasswordValue).toBe('RELEASE_STORE_PASSWORD')

		const keyPasswordKey = values[3].key
		const keyPasswordValue = values[3].value
		expect(keyPasswordKey).toBe('keyPassword')
		expect(keyPasswordValue).toBe('RELEASE_KEY_PASSWORD')
		}
	)

	test('retrieve values from properties values gradlew command', async () =>{
		const values = await retrieveValuesFromPropertiesVariables()
		expect(values['keystoreAliasPassword']).toBe('123456')
		expect(values['keystorePassword']).toBe('123456')
		expect(values['keystoreFile']).toBe('../internalProject-key.keystore')
		}
	)
})

