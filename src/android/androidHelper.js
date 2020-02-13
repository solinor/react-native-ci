
const getConfigSection = (text, section) => {
  sectionArr = Array.isArray(section) ? section : [section] 
  var sectionToFind = sectionArr[0]
  var sectionStr = ''
  const lines = text.split('\n')
  sectionStr = parseLines(lines, sectionToFind)
  if (sectionArr.length === 1) {
    return sectionStr
  }else{
    return getConfigSection(sectionStr, section.splice(1))
  }
}

const parseLines = (lines, section) => {
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

module.exports = {
  getConfigSection,
}