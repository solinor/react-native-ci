const { stdin } = require ('mock-stdin')
const { 
		askInputKeystoreFilePath,
		confirmKeyStoreFilePath,
		initChoicesKeystoreFlow,
		askInputPropertyFilePath,
		confirmPropertyFilePath,
		initChoicesPropertyFlow,
	 } = require('../androidQuestions')

// Key codes
const keys = {
	up: '\x1B\x5B\x41',
	down: '\x1B\x5B\x42',
	enter: '\x0D',
	space: '\x20'
}

let io = null
beforeAll(() => (io = stdin()))
afterAll(() => io.restore())

describe('Ask Keystore questions', () => {
	test('validate file path ', async done => {
		const sendKeystrokes = async () => {
				io.send('exampleProject/android/internalProject-key.keystore')
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes().then(), 5)
		const result = await askInputKeystoreFilePath()
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('Create a new keystore ', async done => {
		const sendKeystrokes = async () => {
				io.send()
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes().then(), 5)
		const result = await askInputKeystoreFilePath()
		expect(result).toEqual('')
		done()
	})

	test('Validate a keystore file path after typing an nonexistent one ', async done => {
		const sendKeystrokes = async () => {
			io.send('exampleProject/android/internalProject-key.keystore1')
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const sendKeystrokes2 = async () => {
			io.send('exampleProject/android/internalProject-key.keystore')
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes2().then(), 6)
		const result = await askInputKeystoreFilePath()
		
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('Confirm keystore file path', async done => {
		const sendKeystrokes = async () => {
		  	io.send(keys.enter)
			}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await confirmKeyStoreFilePath('exampleProject/android/internalProject-key.keystore')
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('Cancel confirming keystore path and provide a different one ', async done => {
		const sendKeystrokes = async () => {
			io.send('no')
			io.send(keys.enter)
		}
			setTimeout(() => sendKeystrokes().then(), 5)
		const sendKeystrokes2 = async () => {
			io.send('exampleProject/android/internalProject-key.keystore')
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes2().then(), 5)
		const result = await confirmKeyStoreFilePath('exampleProject/android/internalProject-key.keystore')
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('Select second item from keystore list ', async done => {
		const choices = ['exampleProject/android/example-key.keystore','exampleProject/android/internalProject-key.keystore']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await initChoicesKeystoreFlow(choices)
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('Select `another one` (third option) from keystore list ', async done => {
		const choices = ['exampleProject/android/example-key.keystore1','exampleProject/android/internalProject-key.keystore2']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const sendKeystrokes2 = async () => {
			io.send('exampleProject/android/internalProject-key.keystore')
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes2().then(), 6)
		const result = await initChoicesKeystoreFlow(choices)
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('Select `create one` from keystore list ', async done => {
		const choices = ['exampleProject/android/example-key.keystore1','exampleProject/android/internalProject-key.keystore2']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await initChoicesKeystoreFlow(choices)
		expect(result).toEqual('')
		done()
	})
})

describe('Ask Property file questions', () => {
	test('validate property file path ', async done => {
		const sendKeystrokes = async () => {
				io.send('exampleProject/android/anotherfolder/gradle.properties')
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes().then(), 5)
		const result = await askInputPropertyFilePath()
		expect(result).toEqual('exampleProject/android/anotherfolder/gradle.properties')
		done()
	})

	test('Create a new property file ', async done => {
		const sendKeystrokes = async () => {
				io.send()
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes().then(), 5)
		const result = await askInputPropertyFilePath()
		expect(result).toEqual('')
		done()
	})

	test('Validate a property file path after typing an nonexistent one  ', async done => {
			const sendKeystrokes = async () => {
				io.send('exampleProject/android/gradle.properties1')
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes().then(), 5)
			const sendKeystrokes2 = async () => {
				io.send('exampleProject/android/gradle.properties')
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes2().then(), 6)
			const result = await askInputPropertyFilePath()
		
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('Confirm property file path ', async done => {
		const sendKeystrokes = async () => {
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await confirmPropertyFilePath('exampleProject/android/gradle.properties')
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('Cancel confirming property file path and provide a different one  ', async done => {
		const sendKeystrokes = async () => {
			io.send('n')
			io.send(keys.enter)
		}
			setTimeout(() => sendKeystrokes().then(), 5)
		const sendKeystrokes2 = async () => {
			io.send('exampleProject/android/gradle.properties')
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes2().then(), 6)
		const result = await confirmPropertyFilePath('exampleProject/android/gradle.properties')
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('Select second item from property list ', async done => {
		const choices = ['exampleProject/android/gradle.properties','exampleProject/android/gradle.properties']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await initChoicesPropertyFlow(choices)
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('Select `another one` (third option) from property list', async done => {
		const choices = ['exampleProject/android/gradle.properties1','exampleProject/android/gradle.properties2']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const sendKeystrokes2 = async () => {
			io.send('exampleProject/android/gradle.properties')
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes2().then(), 6)
		const result = await initChoicesPropertyFlow(choices)
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('Select `create one` from property list', async done => {
		const choices = ['exampleProject/android/gradle.properties1','exampleProject/android/gradle.properties2']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await initChoicesPropertyFlow(choices)
		expect(result).toEqual('')
		done()
	})
})



