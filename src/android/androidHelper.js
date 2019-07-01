
const { filesystem} = require('gluegun/filesystem')
const { print } = require('gluegun/print')
const { system } = require('gluegun/system')

const getConfigSection = (text, section) => {
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
  const lines = section.trim().split('\n')
  const builder= regexBuilder('', '|','(',')', ['{','}'])
  const regex = new RegExp(builder)
  const notMatch = curry((what, s) => !s.match(what));
  const noBrackets = notMatch(builder); // x => x.match(/r/g)
  const filtered = (lines) => lines.filter(noBrackets)
  const filteredSection = filtered(lines)
  const variables = filteredSection.map(firstWord)
  return variables
} 

const getVariableValue = (text, variable) => {
  const lines = text.split('\n')
  const matchLine = lines.find((line) => {
    return line.match(new RegExp(variable +'.* '))
  })
  const values =  matchLine && matchLine.length > 0 ? matchLine.split(' ') : []
  const value = values.slice(-1)[0]
  return value
}

const getVariableValueInBrackets = (text, variable) => {
  const regex = new RegExp('\\[(.*?)\\]')
  const lines = text.split('\n')
  const noEqualString = eq(variable)
  const foundVariable = compose(noEqualString,firstWord)
  
  const matchLine = lines.find((line) => {
    return foundVariable(line)
  })
  if (matchLine){
    const newProperty = matchLine.match(regex)
    const found = newProperty ? (newProperty[1].replace(/'|"/g,'')) : null
    return found
  }else {
    return undefined
  }
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
  const lines = text.split('\n')
  let properties = []
  lines.forEach((line) => {
    const found = line.match(new RegExp('.new Properties()'))
    if (found) {
      const variableName = findVariableName(found.input)
      if (variableName)
      {
        properties.push(variableName)
      }
    } 
  })
  const childBuilded =  childBuilder(properties)
  const buildedRegex = closureOrBuilder(childBuilded)
  const paths = findPathByRegex(lines,buildedRegex)
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
    console.log('------------------------------------------- RECURSIVE----------------------------')
    const regexBuild = childBuilder(variables)
    const builder = closureOrBuilder(regexBuild)
    const result = findPathByRegex(lines,builder)
    paths = paths.concat(result)
    return paths
  }else{
    return paths
  }
}

const findVariableName = (line) => {
  const regex = new RegExp("\\w+(?=\\s+=)")
  const newProperty = line.match(regex)
  return newProperty[0]
}

const findRoot = (line) => {
  
  const regex = new RegExp("(new FileInputStream\\((.*?)\\)\\)|file\\((.*?)\\)\\)|file\\((.*?)\\))")
  const newProperty = line.match(regex)

  if (newProperty[0].includes('file')){ 
    //Returns a path
    const regexFile = new RegExp('file\\((.*?)\\)')
    const filePath = line.match(regexFile)
    const value = filePath[1]
    const replaced = value.replace(/'|"/g,''); 
    return replaced
  }else{
    //Return a new variable
    // console.log('RETURNING OTHER CASE, length' ,newProperty)
    const filterUndefined = newProperty.filter(Boolean);
    return newProperty[filterUndefined.length - 1]
  }
}

const findFiles = (folder, matching) => {
  return filesystem.find(folder, { matching: matching});
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

const closureOrBuilder = (pattern) => regexBuilder('', '|','(',')', pattern)
const childBuilder = (properties) => properties.map(property => regexBuilder(property, '|','','', ['.*load', '.*file']))
const firstWord = string => string.trim().split(' ')[0];
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

const compose = (...functions) => data =>
  functions.reduceRight((value, func) => func(value), data)

const eq = curry((a, b) => a === b)
  
function curry(fn) {
  const arity = fn.length
  return function $curry(...args) {
    if (args.length < arity) {
      return $curry.bind(null, ...args)
    }

    return fn.call(null, ...args)
  }
}

module.exports = {
  createKeystore,
  findKeystoreFiles,
  findPropertiesFiles,
  findPropertiesPath,
  findRoot,
  getConfigSection,
  getVariableValue,
  getFirstAZWordFromSection,
  getVariableValueInBrackets,
}