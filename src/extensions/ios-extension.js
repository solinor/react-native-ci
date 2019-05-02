// add your CLI-specific functionality here, which will then be accessible
// to your commands
module.exports = toolbox => {
  toolbox.ios = {
    getProjectFilePath: async () => {
      const { print, system, meta } = toolbox
      return new Promise((resolve, reject) => {
        system.run(`BUNDLE_GEMFILE=${meta.src}/../Gemfile bundle exec ruby ${meta.src}/ios.rb get_project_path`)
        resolve()
      })
    },
    addBuildConfigurations: async (teamId) => {
      const { print, system, meta } = toolbox
      return new Promise((resolve, reject) => {
        system.run(`BUNDLE_GEMFILE=${meta.src}/../Gemfile bundle exec ruby ${meta.src}/ios.rb make_new_build_configurations ${teamId}`)
        resolve()
      })
    },
    addBundleIdSuffixes: async () => {
      const { print, system, meta } = toolbox
      return new Promise((resolve, reject) => {
        // FIXME: there is some race condition going on here.
        // without setTimeout here, it won't be applied :shrug:
        setTimeout(() => {
          system.run(`BUNDLE_GEMFILE=${meta.src}/../Gemfile bundle exec ruby ${meta.src}/ios.rb add_bundle_id_suffixes`)
          resolve()
        }, 200)
      })
    },
    addSchemes: async () => {
      const { print, system, meta } = toolbox
      return new Promise((resolve, reject) => {
        system.run(`BUNDLE_GEMFILE=${meta.src}/../Gemfile bundle exec ruby ${meta.src}/ios.rb add_schemes`)
        resolve()
      })
    },
    produceApp: async ({ appId, devId, appName, developerTeamId, iTunesTeamId}) => {
      const { print, system } = toolbox
      return new Promise((resolve, reject) => {
        const output = system.run(`fastlane produce -u ${devId} -a ${appId} --app_name "${appName}" --team_id "${developerTeamId}" --itc_team_id "${iTunesTeamId}"`)
        resolve(output)
      })
    },
    matchSync: async ({ certType, password }) => {
      const { print, system } = toolbox
      return new Promise((resolve, reject) => {
        const output = system.run(`cd ios && (export MATCH_PASSWORD=${password}; bundle exec fastlane match ${certType})`)
        resolve(output)
      })
    }
  }
}
