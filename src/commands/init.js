


const runInit = async toolbox => {
  const { print } = toolbox

  const config = await askQuestions(toolbox)

  await initFastlane(toolbox)
  await initCircleCI(toolbox, config)
  await setupGradle(toolbox, config)

  print.success(`${print.checkmark} Initialization success`)
}

module.exports = {
  name: 'init',
  alias: 'e',
  run: runInit
}
