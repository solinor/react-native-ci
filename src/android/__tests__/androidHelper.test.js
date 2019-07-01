const { filesystem} = require('gluegun/filesystem')
const { getConfigSection, getValueFromProperty, getValueAfterEqual, getVariableValueInDelimiter, getFirstAZWordFromSection, findKeystoreFiles, findPropertiesFiles, findPropertiesPath, findRoot } = require('../androidHelper')
let gradle, no_release

beforeEach(() => {
	no_release = filesystem.read('src/android/__mocks__/no-release-build.gradle')
	gradle = filesystem.read('src/android/__mocks__/build.gradle')
	properties = filesystem.read('./exampleProject/android/app/internalCiProject-keystore.properties')
});

describe('Config Section', () => {
	test('no-release-build.gradle getConfigSection does not contains release sub section inside signingConfigs', async () => {
			const output = getConfigSection(no_release, ['signingConfigs','release'])
			expect(output).toBe('')
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
		const keyAlias = getVariableValueInDelimiter(output, 'keyAlias','[', ']')
		expect(keyAlias).toBe('INTERNALCIPROJECT_RELEASE_KEY_ALIAS')
		
		const keyPassword = getVariableValueInDelimiter(output, 'keyPassword','[', ']')
		expect(keyPassword).toBe('INTERNALCIPROJECT_RELEASE_KEY_PASSWORD')

		const storePassword = getVariableValueInDelimiter(output, 'storePassword','[', ']')
		expect(storePassword).toBe('INTERNALCIPROJECT_RELEASE_STORE_PASSWORD')
	})

	test('getValueFromProperty in release section', async () => {
			const output = getConfigSection(gradle, ['signingConfigs','release'])
			const valueVariable = getValueFromProperty(output,'keyPassword')
			expect(valueVariable).not.toBe(undefined)
	})

	test('getValueAfterEqual find variable in file and get value', async () => {
		const storePassword = getValueAfterEqual(properties,'INTERNALCIPROJECT_RELEASE_STORE_PASSWORD')
		expect(storePassword).toBe('123456')
		const keyAlias = getValueAfterEqual(properties,'INTERNALCIPROJECT_RELEASE_KEY_ALIAS')
		expect(keyAlias).toBe('app')
	})

	test('find keystore file', async () => {
			const output = findKeystoreFiles('./exampleProject')
			expect(output).toHaveLength(2)
	})

	test('find properties file', async () => {
			const output = findPropertiesFiles('./exampleProject')
			expect(output).toHaveLength(3)
	})

	test('findPropertiesPath', async () =>{
		const variables = findPropertiesPath(gradle)
		console.log('-------------------------------------',variables)
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
		expect(variables).toBe("../local.properties")
		const line2 = "localProps.load(new FileInputStream(file(\"../local.properties\")))"
		const quotes = findRoot(line2)
		expect(quotes).toBe("../local.properties")
	})

	test('release section contains hardcoded values', async () =>{
		const releaseSection = "release {\n" +
           " storeFile file('your/key/store/path')\n" +
           " keyAlias 'keystorealias'\n" +
           " storePassword 'password'\n" +
           " keyPassword 'keypassword'\n" +
			   " }"
		const keyAlias = "keyAlias"
		const value = getVariableValueInDelimiter(releaseSection, keyAlias,"'","'")
		expect(value).toBe("keystorealias")

		const storePassword = "storePassword"
		const storePasswordValue = getVariableValueInDelimiter(releaseSection, storePassword, "'", "'")
		expect(storePasswordValue).toBe("password")

		const keyPassword = "keyPassword"
		const keyPasswordValue = getVariableValueInDelimiter(releaseSection, keyPassword, "'", "'")
		expect(keyPasswordValue).toBe("keypassword")
		
		const storeFile = "storeFile"
		const storeFileValue = getVariableValueInDelimiter(releaseSection, storeFile, "'", "'")
		expect(storeFileValue).toBe("your/key/store/path")
	})
})

