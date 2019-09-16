
const { filesystem, print, system, strings } = require('gluegun')
const R = require('ramda')
const Result = require('folktale/result')
const collateBy = f => g => xs => {
  return xs.reduce((m, x) => {
    const v = f(x)
    return m.set(v, g(m.get(v), x))
  }, new Map())
}
const regexBuilder = (property, operator, prefix, postfix, patternArray) => {
  let builded = ''
  if (patternArray === '') {
    builded = property + operator
  } else {
    builded = patternArray.reduce((total, pattern, index) => {
      if (index === 0) {
        total = property + pattern
      } else {
        total = total + operator + property + pattern
      }
      return total
    }, '')
  }
  builded = prefix + builded + postfix
  return builded
}
const readGradleFile = () => {
  const gradle = filesystem.find('./', { matching: ['**/app/build.gradle', '!**/node_modules/**/*'] })
  return gradle.length > 0 ? Result.Ok(filesystem.read(gradle[0])) : Result.Error('File is not readable')
}

const findAndroidPath = () => {
  const gradles = filesystem.find('./', { matching: ['**/android/app/build.gradle', '!**/node_modules/**/*'] })
  const removeBuildGradlePath = R.replace(/app\/build\.gradle/g, '')
  const path = gradles && gradles.length > 0 ? Result.Ok(removeBuildGradlePath(gradles[0])) : Result.Error('Not found path')
  return path
}

const linesToSearch = R.curry((lines, x) => lines.find(x))
const splitNewLine = text => text.trim().split('\n')
const replaceQuotes = R.replace(/'|"/g)
const replaceQuotesBlank = replaceQuotes('')
const closureOrBuilder = (pattern) => regexBuilder('', '|', '(', ')', pattern)
const childBuilder = (properties) => properties.map(property => regexBuilder(property, '|', '', '', ['.*load', '.*file']))
const firstWord = string => string.trim().split(' ')[0]
const replaceDotSlash = R.replace(/\.\//g)

const getConfigSection = (text, section) => {
  if (!text) return undefined

  const sectionArr = Array.isArray(section) ? section : [section]
  const sectionToFind = sectionArr[0]
  let sectionStr = ''
  const lines = text.split('\n')
  sectionStr = parseSectionLines(lines, sectionToFind)
  if (sectionArr.length === 1) {
    return sectionStr
  } else {
    return getConfigSection(sectionStr, section.splice(1))
  }
}

const getFirstAZWords = section => {
  const builder = new RegExp(regexBuilder('', '|', '(', ')', ['{', '}']))
  const noBrackets = R.complement(R.test(builder))
  const noBracketsFilter = R.filter(noBrackets)
  const firstWords = R.map(firstWord)
  const findWords = R.compose(firstWords, noBracketsFilter, splitNewLine)
  const words = findWords(section)
  return words
}

const getValueFromProperty = (text, variable) => {
  const regex = new RegExp(variable + '.* ')
  const testRegex = R.test(regex)
  const splitSpace = R.split(' ')
  const lastElement = x => R.compose(R.last, splitSpace)(x)
  const matchRegex = R.curry((regex, line) => {
    return line
      ? Result.Ok(R.match(regex, line).input)
      : Result.Error('no line to match')
  })
  const findMatch = R.compose(matchRegex(regex), R.find(testRegex), splitNewLine)(text)
  const element = findMatch.chain(lastElement)
  return element
}

const getValueAfterEqual = (text, variable) => {
  const afterEqual = s => s.indexOf('=') > -1 ? s.substr(s.indexOf('=') + 1) : ''
  const linesSplit = splitNewLine(text)
  const lines = linesToSearch(linesSplit)
  const stringContainsString = variable => line => line.indexOf(variable) > -1
  const stringToFind = stringContainsString(variable)
  const matchedLine = lines(stringToFind)
  return matchedLine
    ? Result.Ok(afterEqual(matchedLine))
    : Result.Error('not equal value')
}

const getVariableValueInDelimiter = (text, variable, preDelimiter, posDelimiter) => {
  const regex = `\\${preDelimiter}(.*?)\\${posDelimiter}`
  const findVariable = (regex, line) => {
    const value = line.match(regex)
    return value
  }
  const getProperty = property => {
    return property && property.length > 1
      ? Result.Ok(replaceQuotesBlank(property[1]))
      : Result.Error('no property matched', property)
  }
  const regexBuilt = new RegExp(regex)
  const variableMatch = R.compose(R.equals(variable), firstWord)
  const findLineMatch = R.compose(R.find(variableMatch), splitNewLine)
  const foundLine = findLineMatch(text)
  const getVariable = foundLine => foundLine ? Result.Ok(findVariable(regexBuilt, foundLine)) : Result.Error('Not match line')
  const found = getVariable(foundLine).chain(getProperty)
  return found
}

const retrieveValuesFromPropertiesVariables = async () => {
  const gradlewCmd = './gradlew properties'
  const command = path => path
    ? Result.Ok(`cd ${path} && ${gradlewCmd}`) : Result.Error('no command')
  const comm = findAndroidPath().chain(cmd => command(cmd)).getOrElse(undefined)
  if (!comm) return undefined

  const gradlewProperties = await strings.trim(await system.run(comm))
  const keystoreFile = getValueFromProperty(gradlewProperties, 'STORE_FILE')
  const keystorePassword = getValueFromProperty(gradlewProperties, 'STORE_PASSWORD')
  const keystoreAlias = getValueFromProperty(gradlewProperties, 'KEY_ALIAS')
  const keystoreAliasPassword = getValueFromProperty(gradlewProperties, 'KEY_PASSWORD')
  const values = {
    keystoreAliasPassword,
    keystoreAlias,
    keystorePassword,
    keystoreFile: keystoreFile
  }
  return values
}

const retrieveValuesFromPropertyLocations = (releaseSection, propertiesLocation) => {
  const filterFiles = R.compose(R.filter(filesystem.exists), R.map(replaceDotSlash('./android/')), R.filter(Boolean))
  const filteredFiles = locations => locations ? Result.Ok(filterFiles(locations)) : Result.Error('Not locations found')
  const files = filteredFiles(propertiesLocation)
  const findSection = files => files && files.length > 0 ? Result.Ok(getSection(releaseSection, filesystem.read(files[0]))) : Result.Error('Not files found')
  const sectionFound = files.chain(findSection)
  return sectionFound
}

const getSection = (releaseSection, str) => {
  const firstWords = getFirstWordsFromSection(releaseSection)
  const dictionary = {}
  firstWords.forEach((dictValue) => {
    const value = getValueAfterEqual(str, dictValue.value).getOrElse('')
    dictionary[dictValue.key] = value
  })
  const keystoreFile = dictionary['storeFile']
  const keystorePassword = dictionary['storePassword']
  const keystoreAlias = dictionary['keyAlias']
  const keystoreAliasPassword = dictionary['keyPassword']
  const values = {
    keystoreAliasPassword,
    keystoreAlias,
    keystorePassword,
    keystoreFile: keystoreFile
  }
  return values
}

const parseSectionLines = (lines, section) => {
  let isInSection = false
  let brackets = 0
  let sectionStr = ''
  lines.forEach((line) => {
    const buildType = !!(line.includes(section) && (line.match(new RegExp('{', 'g')) || []).length > 0)
    if (buildType) {
      isInSection = true
    }
    if (isInSection) {
      sectionStr += line + '\n'
      const openings = (line.match(new RegExp('{', 'g')) || []).length
      const closings = (line.match(new RegExp('}', 'g')) || []).length
      brackets = brackets + openings - closings
    }
    if (isInSection && brackets <= 0) {
      isInSection = false
    }
  })
  return sectionStr
}

const findKeystoreFiles = (path = './') => {
  return filesystem.find(path, { matching: ['android/app/*.keystore', 'android/app/*.jws', 'android/*.keystore', 'android/*.jws'] })
}

const findPropertiesFiles = (path = './') => {
  return findFiles(path, ['android/*.property', 'android/*.properties', 'android/app/*.property', 'android/app/*.properties'])
}

const findPropertiesPath = (text) => {
  const lines = splitNewLine(text)
  const regExp = new RegExp('.new Properties()')
  const matchRegex = R.test(regExp)
  const regexPropertiesGenerator = R.compose(
    closureOrBuilder,
    childBuilder,
    R.map(findVariableName),
    R.filter(matchRegex),
    splitNewLine
  )
  const regexBuilt = regexPropertiesGenerator(text)
  const paths = findPathByRegex(lines, regexBuilt)
  return paths
}

const findPathByRegex = (lines, regex) => {
  const parent = []
  lines.forEach((line) => {
    const found = line.match(regex)
    if (found) {
      const variableName = findFileInputStreamPath(found.input)
      if (variableName) {
        parent.push(variableName)
      }
    }
  })
  // Divide paths from variables
  const collateByPath = collateBy(x => (x.includes('.')))((a = [], b) => [...a, b])
  const collation = collateByPath(parent)
  const variables = collation.get(false)
  let paths = collation.get(true)
  if (variables && variables.length > 0) {
    const regexBuild = (closureOrBuilder, childBuilder)
    const result = findPathByRegex(lines, regexBuild(variables))
    if (result) {
      paths = paths.concat(result)
    }
  }
  return paths
}

const findVariableName = (line) => {
  const regex = new RegExp('\\w+(?=\\s+=)')
  const newProperty = line.match(regex)
  return newProperty && newProperty.length > 0 ? newProperty[0] : undefined
}

const findFileInputStreamPath = (line) => {
  const regex = new RegExp('(new FileInputStream\\((.*?)\\)\\)|file\\((.*?)\\)\\)|file\\((.*?)\\))')
  const newProperty = line.match(regex)
  const includeFile = R.includes('file')
  if (!newProperty) {
    return undefined
  }
  if (includeFile(newProperty[0])) {
    // Returns a path
    const regexFile = new RegExp('file\\((.*?)\\)')
    const filePath = line.match(regexFile)
    const value = filePath[1]
    const replaced = replaceQuotesBlank(value)
    return replaced
  } else {
    const filterUndefined = newProperty.filter(Boolean)
    return newProperty[filterUndefined.length - 1]
  }
}

const findFiles = (folder, matching) => {
  return filesystem.find(folder, { matching: matching })
}

const createKeystore = async (options) => {
  const { name, storePassword, alias, aliasPassword, keystoreFile } = options
  const storeFile = keystoreFile !== '' ? keystoreFile : `android/app/${name}-key.keystore`
  print.info('Generate new cert.')
  const command = `$(whereis keytool | awk '{print $NF }') -genkey -v -keystore ${storeFile} -storepass ${storePassword} -alias ${alias} -keypass ${aliasPassword} -dname 'cn=Unknown, ou=Unknown, o=Unknown, c=Unknown' -keyalg RSA -keysize 2048 -validity 10000`
  await system.run(command)
  const encodeCommand = `openssl base64 -A -in ${storeFile}`
  const encodedKeystore = await system.run(encodeCommand)
  return encodedKeystore
}

const retrieveHardcodedProperties = releaseSection => {
  const keystoreAlias = getVariableValueInDelimiter(releaseSection, 'keyAlias', "'", "'").getOrElse('')
  const keystorePassword = getVariableValueInDelimiter(releaseSection, 'storePassword', "'", "'").getOrElse('')
  const keystoreAliasPassword = getVariableValueInDelimiter(releaseSection, 'keyPassword', "'", "'").getOrElse('')
  const keystoreFile = getVariableValueInDelimiter(releaseSection, 'storeFile', "'", "'").getOrElse('')
  const values = {
    keystoreAliasPassword,
    keystoreAlias,
    keystorePassword,
    keystoreFile
  }
  return values
}

const getFirstWordsFromSection = releaseSection => {
  const firstWords = getFirstAZWords(releaseSection)
  const dictGradle = firstWords.map(word => {
    const value = getVariableValueInDelimiter(releaseSection, word, '[', ']').getOrElse('')
    return { key: word, value: value }
  })
  return dictGradle
}

module.exports = {
  createKeystore,
  findKeystoreFiles,
  findPropertiesFiles,
  findPropertiesPath,
  getConfigSection,
  getFirstAZWords,
  getValueAfterEqual,
  getVariableValueInDelimiter,
  readGradleFile,
  replaceDotSlash,
  retrieveValuesFromPropertyLocations,
  retrieveHardcodedProperties,
  retrieveValuesFromPropertiesVariables
}
