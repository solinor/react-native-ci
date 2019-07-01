
const { filesystem, print, system } = require('gluegun')
const { 
  eq,
	notMatch,
	match,
	includes,
	map,
  filter,
  replace,
  find,
  curry,
  compose
  } = require('../utils/functional')

const collateBy = f => g => xs => {
  return xs.reduce((m,x) => {
    let v = f(x)
    return m.set(v, g(m.get(v), x))
  }, new Map())
}
const regexBuilder = (property, operator, prefix, postfix, patternArray) => {
  let builded = ''
  if (patternArray === ''){
    builded =  property + operator
  }else{
    builded = patternArray.reduce((total, pattern, index, array) => {
      if (index === 0){
        total =  property + pattern
      } else {
        total = total + operator  + property  + pattern
      }
      if (index == array.length - 1){
        total = total 
      }
      return total
    },'')
  }
  builded = prefix + builded + postfix
  return  builded
}

const linesToSearch = curry((lines, x) => lines.find(x))
const splitNewLine = text =>  text.trim().split('\n')
const replaceQuotes = replace(/'|"/g)
const replaceQuotesBlank = replaceQuotes('')
const closureOrBuilder = (pattern) => regexBuilder('', '|','(',')', pattern)
const childBuilder = (properties) => properties.map(property => regexBuilder(property, '|','','', ['.*load', '.*file']))
const firstWord = string => string.trim().split(' ')[0]
const replaceDotSlash =  replace(/\.\//g)
const getConfigSection = (text, section) => {
  console.log('text', text)
  sectionArr = Array.isArray(section) ? section : [section] 
  let sectionToFind = sectionArr[0]
  let sectionStr = ''
  const lines = text.split('\n')
  sectionStr = parseSectionLines(lines, sectionToFind)
  if (sectionArr.length === 1) {
    return sectionStr
  }else{
    return getConfigSection(sectionStr, section.splice(1))
  }
}

const getFirstAZWordFromSection = section => {
  const builder= regexBuilder('', '|','(',')', ['{','}'])
  const noBrackets = notMatch(builder)
  const noBracketsFilter = filter(noBrackets)
  const fistWords = map(firstWord)
  const findWords = compose(fistWords,noBracketsFilter,splitNewLine) 
  const words = findWords(section)
  return words
} 

const getValueFromProperty = (text, variable) => {
  const regex = new RegExp(variable +'.* ')
  const matchRegex = match(regex) 
  const findLineRegex = find(matchRegex) 
  const findMatch = compose(matchRegex,findLineRegex,splitNewLine)
  const foundLine = findMatch(text)
  const values =  foundLine && foundLine.length > 0 ? foundLine.input.split(' ') : []
  const value = values.slice(-1)[0]
  return value
}

const getValueAfterEqual = (text, variable) => {
  const linesSplit = splitNewLine(text)
  const lines = linesToSearch(linesSplit)
  const stringContainsString = variable => line => line.indexOf(variable) > -1 
  const stringToFind = stringContainsString(variable)
  const matchedLine = lines(stringToFind)
  const value = matchedLine ? matchedLine.substr(matchedLine.indexOf("=") + 1) : undefined
  return value
}

const getVariableValueInDelimiter = (text, variable, preDelimiter, posDelimiter) => {
  const regex = `\\${preDelimiter}(.*?)\\${posDelimiter}`
  const regexBuilt = new RegExp(regex)
  const variableMatch = compose(eq(variable),firstWord)
  const findLineMatch = compose(find(variableMatch),splitNewLine)
  const foundLine = findLineMatch(text)
  let found = undefined
  if (foundLine){
    const newProperty = foundLine.match(regexBuilt)
    found = newProperty && newProperty.length > 1 ? replaceQuotesBlank(newProperty[1]) : undefined
  }
  return found
}

const parseSectionLines = (lines, section) => {
  let isInSection = false
  let brackets = 0
  let sectionStr = ''
  lines.forEach((line) => { 
    const buildType = line.includes(section) && (line.match(new RegExp('{', 'g')) || []).length > 0 
    ? true : false
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
  return filesystem.find(path, { matching: ['android/app/*.keystore', 'android/app/*.jws', 'android/*.keystore', 'android/*.jws']})
}

const findPropertiesFiles = (path = './') => {
  return findFiles(path,['android/*.property', 'android/*.properties','android/app/*.property', 'android/app/*.properties'])
}

const findPropertiesPath = (text) => {
  const lines = splitNewLine(text)
  const regExp = new RegExp('.new Properties()')
  const matchRegex = match(regExp)
  const regexPropertiesGenerator =  compose
  (
    closureOrBuilder,
    childBuilder, 
    map(findVariableName),
    filter(matchRegex),
    splitNewLine
  )
  const regexBuilt = regexPropertiesGenerator(text)
  const paths = findPathByRegex(lines,regexBuilt)
  return paths
}

const findPathByRegex = (lines,regex) =>{
  let parent = []
  lines.forEach((line) => {
    const found = line.match(regex)
    if (found) {
      const variableName = findRoot(found.input)
      if (variableName)
      {
        parent.push(variableName)
      }
    } 
  })
  //Divide paths from variables
  const collateByPath = collateBy (x=> (x.includes("."))) ((a=[],b)=> [...a,b])
  const collation = collateByPath (parent)
  const variables = collation.get(false)
  let paths = collation.get(true)
  if (variables && variables.length > 0){
    const regexBuild = (closureOrBuilder,childBuilder)
    const result = findPathByRegex(lines,regexBuild(variables))
    paths = paths.concat(result)
  }
  return paths
}

const findVariableName = (line) => {
  const regex = new RegExp("\\w+(?=\\s+=)")
  const newProperty = line.match(regex)
  return newProperty && newProperty.length > 0 ? newProperty[0] : undefined
}

const findRoot = (line) => {
  const regex = new RegExp("(new FileInputStream\\((.*?)\\)\\)|file\\((.*?)\\)\\)|file\\((.*?)\\))")
  const newProperty = line.match(regex)
  const includeFile = includes('file')
  if (includeFile(newProperty[0])){ 
    //Returns a path
    const regexFile = new RegExp('file\\((.*?)\\)')
    const filePath = line.match(regexFile)
    const value = filePath[1]
    const replaced = replaceQuotesBlank(value)
    return replaced
  }else{
    const filterUndefined = newProperty.filter(Boolean)
    return newProperty[filterUndefined.length - 1]
  }
}

const findFiles = (folder, matching) => {
  return filesystem.find(folder, { matching: matching})
}

const createKeystore = async (options) => {
  const { name, storePassword, alias, aliasPassword, keystoreFile} = options
  const storeFile = keystoreFile != '' ? keystoreFile : `android/app/${name}-key.keystore`
  print.info('Generate new cert.')
  const command = `keytool -genkey -v -keystore ${storeFile} -storepass ${storePassword} -alias ${alias} -keypass ${aliasPassword} -dname 'cn=Unknown, ou=Unknown, o=Unknown, c=Unknown' -keyalg RSA -keysize 2048 -validity 10000`
  await system.run(command)
  const encodeCommand = `openssl base64 -A -in ${storeFile}`
  encodedKeystore = await system.run(encodeCommand)
  return encodedKeystore
}

module.exports = {
  createKeystore,
  findKeystoreFiles,
  findPropertiesFiles,
  findPropertiesPath,
  findRoot,
  getConfigSection,
  getValueFromProperty,
  getValueAfterEqual,
  getFirstAZWordFromSection,
  getVariableValueInDelimiter,
  replaceDotSlash,
}