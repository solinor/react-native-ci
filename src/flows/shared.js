const askQuestions = async ({ prompt }, options) => {
  // text input
  const askOrganization = {
    type: 'input',
    initial: options.githubOrg,
    skip: () => options.githubOrg,
    name: 'githubOrg',
    message: 'Your github organization?'
  }
  const askProject = {
    type: 'input',
    initial: options.repo,
    skip: () => options.repo,
    name: 'repo',
    message: 'Your github project name?'
  }
  const askApiToken = {
    type: 'input',
    initial: options.circleApi,
    skip: () => options.circleApi,
    name: 'circleApi',
    message: 'Your CircleCI API token?'
  }
  // ask a series of questions
  const questions = [askOrganization, askProject, askApiToken]
  const answers = await prompt.ask(questions)
  return {
    ...options,
    ...answers
  }
}

const initCircleCI = async ({ template, http }, { githubOrg, repo, circleApi }) => {
  await template.generate({
    template: 'circleci/config.yml',
    target: '.circleci/config.yml',
    props: {}
  })

  const api = http.create({
    baseURL: 'https://circleci.com/api/v1.1/'
  })

  await api.post(
    `project/github/${githubOrg}/${repo}/follow?circle-token=${circleApi}`
  )
}

module.exports.runShared = async (toolbox, config) => {
  const answers = await askQuestions(toolbox, config)
  await initCircleCI(toolbox, { ...config, ...answers })
  return answers
}
