module.exports = toolbox => {
  toolbox.circle = { // eslint-disable-line no-param-reassign
    postEnvVariable: async ({
      org,
      project,
      apiToken,
      key,
      value
    }) => {
      const { http } = toolbox
      const api = http.create({
        baseURL: 'https://circleci.com/api/v1.1/'
      })

      await api.post(
        `project/github/${org}/${project}/envvar?circle-token=${apiToken}`,
        { name: key, value },
        { headers: { 'Content-Type': 'application/json' } }
      )
    },
    followProject: async ({ org, project, apiToken }) => {
      const { http } = toolbox
      const api = http.create({
        baseURL: 'https://circleci.com/api/v1.1/'
      })

      const { status } = await api.post(
        `project/github/${org}/${project}/follow?circle-token=${apiToken}`
      )
      return status
    }
  }
}
