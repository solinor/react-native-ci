const { filesystem} = require('gluegun/filesystem')
const { getConfigSection, getVariableValue, getVariableValueInBrackets, getFirstAZWordFromSection, findKeystoreFiles, findPropertiesFiles, findPropertiesPath, findRoot } = require('../androidHelper')
let gradle, no_release
beforeEach(() => {
	no_release = filesystem.read('src/android/__mocks__/no-release-build.gradle')
	gradle = filesystem.read('src/android/__mocks__/build.gradle')
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
		const keyAlias = getVariableValueInBrackets(output, 'keyAlias')
		expect(keyAlias).toBe('INTERNALCIPROJECT_RELEASE_KEY_ALIAS')
		
		const keyPassword = getVariableValueInBrackets(output, 'keyPassword')
		expect(keyPassword).toBe('INTERNALCIPROJECT_RELEASE_KEY_PASSWORD')

		const storePassword = getVariableValueInBrackets(output, 'storePassword')
		expect(storePassword).toBe('INTERNALCIPROJECT_RELEASE_STORE_PASSWORD')

	})

	test('getVariableValue convert  section string to array', async () => {
			const output = getConfigSection(gradle, ['signingConfigs','release'])
			const valueVariable = getVariableValue(output,'keyPassword')
			expect(valueVariable).not.toBe(undefined)
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
		expect(variables).toHaveLength(3)
	})

	test('findRoot', async () =>{
		line = 'keystoreProperties.load(new FileInputStream(keystorePropertiesFile))'
		const variables = findRoot(line)
		expect(variables).toBe('keystorePropertiesFile')
	})

	test('', async() => {
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
})

