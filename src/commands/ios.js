
const run = async (toolbox) => {
  const { print } = toolbox

  const config = await getInput(toolbox)
  await initFastlane(toolbox, config)
  await initXcode(toolbox, config)

  print.success(`${print.checkmark} iOS setup success`)
}

module.exports = {
  name: 'ios',
  alias: 'i',
  run: run
}