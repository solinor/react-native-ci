const {run} = require('../src/cli')

beforeAll(() => {
  jest.setTimeout(10000) //Mandatory for API Request
  process.env.INTEGRATION_TEST = true}) 
afterAll(() => {
  jest.setTimeout(5000)
  process.env.INTEGRATION_TEST= false
}) //Back to normal
describe('Options', () => {
  test('can start the cli', async () => {
    const c = await run()
    expect(c).toBeTruthy()
  })
 
  test('android init', async done => {
      const toolbox = await run()
      const output = await toolbox.system.exec(`react-native-ci init --android --githubOrg company --repo xxxxx --circleApi 123456 --googleJsonPath ./ `)
      expect(output).toMatch(/CircleCI/)
      //TODO: Add more matches
		done()
	})
	
})
