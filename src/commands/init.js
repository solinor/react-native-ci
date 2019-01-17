module.exports = {
  name: 'init',
  alias: 'i',
  run: async function (toolbox) {
    const { print, template, http, system, android } = toolbox

    const fastlanePath = system.which('fastlane')
    if (!fastlanePath) {
      system.run('sudo gem install fastlane -NV')
    }
//    const { execSync } = require('child_process')
//    execSync('fastlane init', { cwd: 'android/', input: 'echo \'com.circletest\nfastlane/secret.json\nn\n\'' })

    const appId = android.getApplicationId()

    await template.generate({
      template: 'Gemfile',
      target: 'android/Gemfile',
      props: { }
    })

    await template.generate({
      template: 'Fastfile',
      target: 'android/fastlane/Fastfile',
      props: { }
    })

    await template.generate({
      template: 'Appfile',
      target: 'android/fastlane/Appfile',
      props: { appId }
    })

    await template.generate({
      template: 'config.yml',
      target: '.circleci/config.yml',
      props: { }
    })

    // text input
    const askOrganization = { type: 'input', name: 'org', message: 'Your github organization?' }
    const askProject = { type: 'input', name: 'project', message: 'Your github project name?' }
    const askApiToken = { type: 'input', name: 'apitoken', message: 'Your CircleCI API token?' }

    // ask a series of questions
    const questions = [askOrganization, askProject, askApiToken]
    const { org, project, apitoken } = await toolbox.prompt.ask(questions)


    const api = http.create({
      baseURL: 'https://circleci.com/api/v1.1/'
    })

    const response = await api.post(`project/github/${org}/${project}/follow?circle-token=${apitoken}`)

    print.info(response)
    print.info(`${print.checkmark} Citius`)
    print.warning(`${print.checkmark} Altius`)
    print.success(`${print.checkmark} Fortius`)
  }
}