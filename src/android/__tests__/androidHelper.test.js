const { filesystem} = require('gluegun/filesystem')
const { getConfigSection } = require('../androidHelper')

describe('Config Section', () => {
    test('no-release-build.gradle getConfigSection does not contains release sub section inside signingConfigs', async () => {
        const gradle = filesystem.read('src/android/__mocks__/no-release-build.gradle')
        const output = getConfigSection(gradle, ['signingConfigs','release'])
        expect(output).toBe('')
    })   

    test('build.gradle getConfigSection contains signingConfigs', async () => {
        const gradle = filesystem.read('src/android/__mocks__/build.gradle')
        const output = getConfigSection(gradle, ['signingConfigs'])
        expect(output).not.toBe('')
    })

    test('getConfigSection convert  section string to array', async () => {
        const gradle = filesystem.read('src/android/__mocks__/build.gradle')
        const output = getConfigSection(gradle, 'signingConfigs')
        expect(output).not.toBe('')
    })

    test('build.gradlde getConfigSection contains release sub section inside signingConfigs', async () => {
        const gradle = filesystem.read('src/android/__mocks__/build.gradle')
        const output = getConfigSection(gradle, ['signingConfigs','release'])
        expect(output).not.toBe('')
    })
 
})

