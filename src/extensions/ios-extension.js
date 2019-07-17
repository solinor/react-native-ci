// add your CLI-specific functionality here, which will then be accessible
// to your commands
const { spawn } = require('child_process')

const parseTeam = async (
  teamType,
  { developerAccount, developerPassword },
  path
) => {
  return new Promise((resolve, reject) => {
    const child = spawn('ruby', [
      `${path}/ios.rb`,
      'get_team_id',
      teamType,
      developerAccount,
      developerPassword
    ])
    child.stdout.on('data', data => {
      const dataStr = data.toString()
      const regexpTeamLine = new RegExp(/^\d+[)]/)
      const regexpTeamName = new RegExp(/"(.*?)"/)
      const lines = dataStr.split('\n')
      const teams = []
      // if only one team found
      if (lines.length === 2 && lines[1].length === 0) {
        teams.push(lines[0])
        resolve(teams)
      }
      // parse multiple teams
      const regexpTeamId =
        teamType === 'dev' ? new RegExp(/\)(.*?)"/) : new RegExp(/\((.*?)\)/)
      lines.forEach(line => {
        if (regexpTeamLine.test(line)) {
          const teamName = regexpTeamName.exec(line)[1]
          const teamId = regexpTeamId.exec(line)[1].trim()
          teams.push({ name: teamName, id: teamId })
        }
      })
      if (teams.length === 0) {
        reject(new Error('Not able to retrieve teams, check account credentials'))
      }
      resolve(teams)
    })
    child.stderr.on('data', () => {
      reject(new Error('Not able to retrieve teams, check account credentials'))
    })
    child.stdin.write('2\n')
  })
}

module.exports = toolbox => {
  toolbox.ios = { // eslint-disable-line no-param-reassign
    getProjectFilePath: async () => {
      const { system, meta } = toolbox
      return new Promise((resolve) => {
        system.run(`ruby ${meta.src}/ios.rb get_project_path`)
        resolve()
      })
    },
    addBuildConfigurations: async teamId => {
      const { system, meta } = toolbox
      return new Promise((resolve) => {
        system.run(
          `ruby ${meta.src}/ios.rb make_new_build_configurations ${teamId}`
        )
        resolve()
      })
    },
    addBundleIdSuffixes: async () => {
      const { system, meta } = toolbox
      return new Promise((resolve) => {
        // FIXME: there is some race condition going on here.
        // without setTimeout here, it won't be applied :shrug:
        setTimeout(() => {
          system.run(`ruby ${meta.src}/ios.rb add_bundle_id_suffixes`)
          resolve()
        }, 200)
      })
    },
    addSchemes: async () => {
      const { system, meta } = toolbox
      return new Promise((resolve) => {
        system.run(`ruby ${meta.src}/ios.rb add_schemes`)
        resolve()
      })
    },
    produceApp: async ({
      appId,
      devId,
      appName,
      developerTeamId,
      iTunesTeamId
    }) => {
      const { system } = toolbox
      return new Promise((resolve) => {
        const output = system.run(
          `fastlane produce -u ${devId} 
          -a ${appId} 
          --app_name "${appName}" 
          --team_id "${developerTeamId}" 
          --itc_team_id "${iTunesTeamId}"`
        )
        resolve(output)
      })
    },
    matchSync: async ({ certType, password }) => {
      const { system } = toolbox
      return new Promise((resolve) => {
        const output = system.run(
          `cd ios && (export MATCH_PASSWORD=${password}; bundle exec fastlane match ${certType})`
        )
        resolve(output)
      })
    },
    getTeamIds: async accountInfo => {
      const { meta } = toolbox
      const promise = new Promise((resolve, reject) => {
        try {
          const devTeams = parseTeam('dev', accountInfo, meta.src)
          const itcTeams = parseTeam('itc', accountInfo, meta.src)
          const teams = {
            itcTeams,
            devTeams
          }
          resolve(teams)
        } catch (e) {
          reject(e)
        }
      })
      return Promise.resolve(promise)
    },
    getAppId: async () => {
      const { system, meta } = toolbox
      return new Promise((resolve) => {
        const appId = system.run(
          `ruby ${meta.src}/ios.rb get_app_id`
          , { trim: true })
        resolve(appId)
      })
    }
  }
}
