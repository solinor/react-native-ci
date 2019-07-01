const { filesystem, prompt } = require('gluegun')
const { stdin } = require ('mock-stdin')
const { 
		validateAskKeystoreFilePath,
		validateConfirmKeyStoreFilePath,
		validateSelectKeystoreFilePath,
		validateAskPropertyFilePath,
		validateConfirmPropertyFilePath,
		validateSelectPropertyFilePath,
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
		const result = await validateAskKeystoreFilePath(prompt, filesystem)
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('create a new keystore ', async done => {
		const sendKeystrokes = async () => {
				io.send()
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes().then(), 5)
		const result = await validateAskKeystoreFilePath(prompt, filesystem)
		expect(result).toEqual('')
		done()
	})

	test('validate file path the second time ', async done => {
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
		const result = await validateAskKeystoreFilePath(prompt, filesystem)
		
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('confirm file path ', async done => {
		const sendKeystrokes = async () => {
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes().then(), 5)
		const result = await validateConfirmKeyStoreFilePath(prompt, filesystem, 'exampleProject/android/internalProject-key.keystore')
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('cancel confirm file path and provide a different one ', async done => {
		const sendKeystrokes = async () => {
			io.send('no')
			io.send(keys.enter)
		}
			setTimeout(() => sendKeystrokes().then(), 5)
		const sendKeystrokes2 = async () => {
			io.send('exampleProject/android/internalProject-key.keystore')
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes2().then(), 6)
		const result = await validateConfirmKeyStoreFilePath(prompt, filesystem, 'exampleProject/android/internalProject-key.keystore')
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('select an item from list ', async done => {
		const choices = ['exampleProject/android/example-key.keystore','exampleProject/android/internalProject-key.keystore']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await validateSelectKeystoreFilePath(prompt, filesystem, choices)
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('Select a different one from list ', async done => {
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
		const result = await validateSelectKeystoreFilePath(prompt, filesystem, choices)
		expect(result).toEqual('exampleProject/android/internalProject-key.keystore')
		done()
	})

	test('Create a new one from list ', async done => {
		const choices = ['exampleProject/android/example-key.keystore1','exampleProject/android/internalProject-key.keystore2']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await validateSelectKeystoreFilePath(prompt, filesystem, choices)
		expect(result).toEqual('')
		done()
	})
})

describe('Ask Property file questions', () => {
	test('validate file path ', async done => {
		const sendKeystrokes = async () => {
				io.send('exampleProject/android/gradle.properties')
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes().then(), 5)
		const result = await validateAskPropertyFilePath(prompt, filesystem)
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('create a new property file ', async done => {
		const sendKeystrokes = async () => {
				io.send()
				io.send(keys.enter)
			}
			setTimeout(() => sendKeystrokes().then(), 5)
		const result = await validateAskPropertyFilePath(prompt, filesystem)
		expect(result).toEqual('')
		done()
	})

	test('validate a property file the second time ', async done => {
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
			const result = await validateAskPropertyFilePath(prompt, filesystem)
		
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('confirm file path ', async done => {
		const sendKeystrokes = async () => {
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await validateConfirmPropertyFilePath(prompt, filesystem, 'exampleProject/android/gradle.properties')
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('cancel confirm property file and provide a different one ', async done => {
		const sendKeystrokes = async () => {
			io.send('no')
			io.send(keys.enter)
		}
			setTimeout(() => sendKeystrokes().then(), 5)
		const sendKeystrokes2 = async () => {
			io.send('exampleProject/android/gradle.properties')
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes2().then(), 6)
		const result = await validateConfirmPropertyFilePath(prompt, filesystem, 'exampleProject/android/gradle.properties')
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('select an item from list ', async done => {
		const choices = ['exampleProject/android/gradle.properties','exampleProject/android/gradle.properties']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await validateSelectPropertyFilePath(prompt, filesystem, choices)
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('Select a different one from list ', async done => {
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
		const result = await validateSelectPropertyFilePath(prompt, filesystem, choices)
		expect(result).toEqual('exampleProject/android/gradle.properties')
		done()
	})

	test('Create a new one from list ', async done => {
		const choices = ['exampleProject/android/gradle.properties1','exampleProject/android/gradle.properties2']
		const sendKeystrokes = async () => {
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.down)
			io.send(keys.enter)
		}
		setTimeout(() => sendKeystrokes().then(), 5)
		const result = await validateSelectPropertyFilePath(prompt, filesystem, choices)
		expect(result).toEqual('')
		done()
	})
})



