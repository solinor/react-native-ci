
const { filesystem, print, system, strings } = require('gluegun')
const R = require('ramda')
const Result = require('folktale/result');
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
const readGradleFile = () => {
  const gradle = filesystem.find('./', { matching: ['**/app/build.gradle', '!**/node_modules/**/*']  })
  return gradle.length > 0 ? Result.Ok( filesystem.read(gradle[0])) :  Result.Error("File is not readable")
}

const findAndroidPath = () => {
  const gradles = filesystem.find('./', { matching: ['**/android/app/build.gradle', '!**/node_modules/**/*']  })
  const removeBuildGradlePath = R.replace(/app\/build\.gradle/g,'')
  const path = gradles && gradles.length > 0?  Result.Ok(removeBuildGradlePath(gradles[0])): Result.Error("Not found path")
  return path
}

const linesToSearch = R.curry((lines, x) => lines.find(x))
const splitNewLine = text =>  text.trim().split('\n')
const replaceQuotes = R.replace(/'|"/g)
const replaceQuotesBlank = replaceQuotes('')
const closureOrBuilder = (pattern) => regexBuilder('', '|','(',')', pattern)
const childBuilder = (properties) => properties.map(property => regexBuilder(property, '|','','', ['.*load', '.*file']))
const firstWord = string => string.trim().split(' ')[0]
const replaceDotSlash =  R.replace(/\.\//g)

const getConfigSection = (text, section) => {
  if(!text) return undefined
  
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
  const builder = new RegExp(regexBuilder('', '|','(',')', ['{','}']))
  const noBrackets = R.complement(R.test(builder))
  const noBracketsFilter = R.filter(noBrackets)
  const fistWords = R.map(firstWord)
  const findWords = R.compose(fistWords,noBracketsFilter,splitNewLine) 
  const words = findWords(section)
  return words
} 

const getValueFromProperty = (text, variable) => {
  const regex = new RegExp(variable +'.* ')
  const testRegex = R.test(regex)
  const splitSpace  = R.split(' ')
  const splitSpaces = val => val.input ? Result.Ok(splitSpace(val.input)) :  Result.Error("empty", '')
  const either = line => line ? Result.Ok(line)  : Result.Error("no line to match")
  const matchRegex = R.curry((regex,line) =>{
    return line ?
    Result.Ok(R.match(regex,line)) 
    :  Result.Error("no line to match", property)
  })
  const findLineRegex = R.find(testRegex) 
  const findMatch = R.compose(findLineRegex,splitNewLine)
  const result = either(findMatch(text)).chain(matchRegex(regex)).chain(splitSpaces)
  const values = result.getOrElse('')
  return R.last(values)
  
}

const getValueAfterEqual = (text, variable) => {
  const afterEqual = s => s.indexOf("=") > -1 ? s.substr(s.indexOf("=") + 1) : ''
  const linesSplit = splitNewLine(text)
  const lines = linesToSearch(linesSplit)
  const stringContainsString = variable => line => line.indexOf(variable) > -1 
  const stringToFind = stringContainsString(variable)
  const matchedLine = lines(stringToFind)
  return matchedLine ?
  Result.Ok(afterEqual(matchedLine)):
  Result.Error("not equal value")
}

const getVariableValueInDelimiter = (text, variable, preDelimiter, posDelimiter) => {
  const regex = `\\${preDelimiter}(.*?)\\${posDelimiter}`
  const findVariable = (regex, line ) => {
    const value = line.match(regex)
    return value
  }
  const getProperty = property => {
    return property && property.length > 1 ? 
    Result.Ok(replaceQuotesBlank(property[1])) 
    :  Result.Error("no property matched", property)
  }
  const regexBuilt = new RegExp(regex)
  const variableMatch = R.compose(R.equals(variable),firstWord)
  const findLineMatch = R.compose(R.find(variableMatch),splitNewLine)
  const foundLine = findLineMatch(text)
  let getVariable = foundLine => foundLine ? Result.Ok(findVariable(regexBuilt,foundLine)) :  Result.Error('Not match line')
  const found = getVariable(foundLine).chain(getProperty)
  return found
}

const retrieveValuesFromPropertiesVariables = async(commandPath) => {
  const gradlewCmd = './gradlew properties' 
  const command = x => x ? 
  Result.Ok( `cd ${x} && ${gradlewCmd}`) :  Result.Error('no command')
  const comm = findAndroidPath().chain(x => command(x)).getOrElse('')
  if (!comm) return undefined
 
  const gradlewProperties =  await strings.trim(await system.run(comm))
  const keystoreFile = getValueFromProperty(gradlewProperties,'STORE_FILE')
  const keystorePassword = getValueFromProperty(gradlewProperties,'STORE_PASSWORD')
  const keystoreAlias = getValueFromProperty(gradlewProperties,'KEY_ALIAS')
  const keystoreAliasPassword = getValueFromProperty(gradlewProperties,'KEY_PASSWORD')
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
  const matchRegex = R.test(regExp)
  const regexPropertiesGenerator =  R.compose
  (
    closureOrBuilder,
    childBuilder, 
    R.map(findVariableName),
    R.filter(matchRegex),
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
    if(result){
      paths = paths.concat(result)
    }
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
  const includeFile = R.includes('file')
  if (!newProperty){
    return undefined
  }
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

const retrieveHardcodedProperties = releaseSection => {
  const keystoreAlias = getVariableValueInDelimiter(releaseSection,'keyAlias',"'","'").getOrElse('')
  const keystorePassword  = getVariableValueInDelimiter(releaseSection,'storePassword',"'","'").getOrElse('')
  const keystoreAliasPassword = getVariableValueInDelimiter(releaseSection,'keyPassword',"'","'").getOrElse('')
  const keystoreFile = getVariableValueInDelimiter(releaseSection,'storeFile',"'","'").getOrElse('')
  const values = {
    keystoreAliasPassword,
    keystoreAlias,
    keystorePassword,
    keystoreFile
  }
  return values
}

const geFirstWordsFromSection = releaseSection => {
  const firstWords = getFirstAZWordFromSection(releaseSection)
  const dictGradle = firstWords.map(word => {
    const value = getVariableValueInDelimiter(releaseSection, word,'[', ']').getOrElse('')
    return{key:word, value:value}
  })
  return dictGradle
}

module.exports = {
  createKeystore,
  findAndroidPath,
  findKeystoreFiles,
  findPropertiesFiles,
  findPropertiesPath,
  findRoot,
  getConfigSection,
  geFirstWordsFromSection,
  getValueFromProperty,
  getValueAfterEqual,
  getFirstAZWordFromSection,
  getVariableValueInDelimiter,
  readGradleFile,
  replaceDotSlash,
  retrieveHardcodedProperties,
  retrieveValuesFromPropertiesVariables,
}