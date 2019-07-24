const {
  askInputKeystoreFilePath,
  confirmKeyStoreFilePath,
  initChoicesKeystoreFlow,
  askInputPropertyFilePath,
  confirmPropertyFilePath,
  initChoicesPropertyFlow
} = require('../androidQuestions')

// Keyboard setup
const { stdin } = require('mock-stdin')
// Key codes
const keys = {
  up: '\x1B\x5B\x41',
  down: '\x1B\x5B\x42',
  enter: '\x0D',
  space: '\x20'
}
// helper function for timing
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let io = null
beforeAll(() => (io = stdin()))
afterAll(() => io.restore())

describe('Ask Keystore questions', () => {
  test('validate file path ', async done => {
    const sendKeystrokes = async () => {
      io.send('example_project/android/internalProject-key.keystore')
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await askInputKeystoreFilePath()
    expect(result).toEqual('example_project/android/internalProject-key.keystore')
    done()
  })

  test('Create a new keystore', async done => {
    const sendKeystrokes = async () => {
      io.send()
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await askInputKeystoreFilePath()
    expect(result).toEqual('')
    done()
  })

  test('Validate a keystore file path after typing a nonexistent one', async done => {
    const sendKeystrokes = async () => {
      io.send('example_project/android/internalProject-key.keystore1')
      io.send(keys.enter)
      await delay(10)
      io.send('example_project/android/internalProject-key.keystore')
      io.send(keys.enter)
      await (10)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await askInputKeystoreFilePath()

    expect(result).toEqual('example_project/android/internalProject-key.keystore')
    done()
  })

  test('Confirm keystore file path', async done => {
    const sendKeystrokes = async () => {
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await confirmKeyStoreFilePath('example_project/android/internalProject-key.keystore')
    expect(result).toEqual('example_project/android/internalProject-key.keystore')
    done()
  })

  test('Cancel confirming keystore path and provide a different one', async done => {
    const sendKeystrokes = async () => {
      io.send('no')
      io.send(keys.enter)
      await delay(10)
      io.send('example_project/android/internalProject-key.keystore')
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await confirmKeyStoreFilePath('example_project/android/internalProject-key.keystore')
    expect(result).toEqual('example_project/android/internalProject-key.keystore')
    done()
  })

  test('Select second item from keystore list ', async done => {
    const choices = ['example_project/android/example-key.keystore', 'example_project/android/internalProject-key.keystore']
    const sendKeystrokes = async () => {
      io.send(keys.down)
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await initChoicesKeystoreFlow(choices)
    expect(result).toEqual('example_project/android/internalProject-key.keystore')
    done()
  })

  test('Select `another one` (third option) from keystore list ', async done => {
    const choices = ['example_project/android/example-key.keystore1', 'example_project/android/internalProject-key.keystore2']
    const sendKeystrokes = async () => {
      io.send(keys.down)
      io.send(keys.down)
      io.send(keys.enter)
      await delay(10)
      io.send('example_project/android/internalProject-key.keystore')
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await initChoicesKeystoreFlow(choices)
    expect(result).toEqual('example_project/android/internalProject-key.keystore')
    done()
  })

  test('Select `create one` from keystore list', async done => {
    const choices = ['example_project/android/example-key.keystore1', 'example_project/android/internalProject-key.keystore2']
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
      io.send('example_project/android/folder/gradle.properties')
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await askInputPropertyFilePath()
    expect(result).toEqual('example_project/android/folder/gradle.properties')
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

  test('Validate a property file path after typing an onexistent one', async done => {
    const sendKeystrokes = async () => {
      io.send('example_project/android/gradle.properties1')
      io.send(keys.enter)
      await delay(10)
      io.send('example_project/android/gradle.properties')
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await askInputPropertyFilePath()

    expect(result).toEqual('example_project/android/gradle.properties')
    done()
  })

  test('Confirm property file path', async done => {
    const sendKeystrokes = async () => {
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await confirmPropertyFilePath('example_project/android/gradle.properties')
    expect(result).toEqual('example_project/android/gradle.properties')
    done()
  })

  test('Cancel confirming property file path and provide a different one', async done => {
    const sendKeystrokes = async () => {
      io.send('n')
      io.send(keys.enter)
      await delay(10)
      io.send('example_project/android/gradle.properties')
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await confirmPropertyFilePath('example_project/android/gradle.properties')
    expect(result).toEqual('example_project/android/gradle.properties')
    done()
  })

  test('Select second item from property list', async done => {
    const choices = ['example_project/android/gradle.properties', 'example_project/android/gradle.properties']
    const sendKeystrokes = async () => {
      io.send(keys.down)
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await initChoicesPropertyFlow(choices)
    expect(result).toEqual('example_project/android/gradle.properties')
    done()
  })

  test('Select `another one` (third option) from property list', async done => {
    const choices = ['example_project/android/gradle.properties1', 'example_project/android/gradle.properties2']
    const sendKeystrokes = async () => {
      io.send(keys.down)
      io.send(keys.down)
      io.send(keys.enter)
      await delay(10)
      io.send('example_project/android/gradle.properties')
      io.send(keys.enter)
    }
    setTimeout(() => sendKeystrokes().then(), 5)
    const result = await initChoicesPropertyFlow(choices)
    expect(result).toEqual('example_project/android/gradle.properties')
    done()
  })

  test('Select `create one` from property list', async done => {
    const choices = ['example_project/android/gradle.properties1', 'example_project/android/gradle.properties2']
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
