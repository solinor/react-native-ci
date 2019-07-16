const {run} = require('../src/cli')
const {runAndroid} = require('../src/flows/android')
beforeAll(() => {
  jest.setTimeout(90000) //Gradle
  process.env.INTEGRATION_TEST = true}) 
afterAll(() => {
  process.env.INTEGRATION_TEST= false
  jest.setTimeout(5000)
}) //Back to normal
describe('Options', () => {
  test('can start the cli', async () => {
    const c = await run()
    expect(c).toBeTruthy()
  })
 
  test('android init', async () => {
    const config = {
        githubOrg: "company",
        repo: "internalCiProject",
        circleApi: "123456",
        googleJsonPath: "./",
    }
    const toolbox = await run()
     // const output = await toolbox.system.exec(`react-native-ci init --android --githubOrg company --repo xxxxx --circleApi 123456 --googleJsonPath ./ `)
    const output = await runAndroid(toolbox,config )
    expect(output).toBe(true)
	})
	
})
