// add your CLI-specific functionality here, which will then be accessible
// to your commands
module.exports = toolbox => {
  toolbox.ios = {
    getProjectFilePath: async () => {
      const { print, system, meta } = toolbox
      return new Promise((resolve, reject) => {
        system.run(`ruby ${meta.src}/ios.rb get_project_path`)
        resolve()
      })
    },
    addBuildConfigurations: async () => {
      const { print, system, meta } = toolbox
      return new Promise((resolve, reject) => {
        system.run(`ruby ${meta.src}/ios.rb make_new_build_configurations`)
        resolve()
      })
    },
    addBundleIdSuffixes: async () => {
      const { print, system, meta } = toolbox
      return new Promise((resolve, reject) => {
        system.run(`ruby ${meta.src}/ios.rb add_bundle_id_suffixes`)
        resolve()
      })
    },
    addSchemes: async () => {
      const { print, system, meta } = toolbox
      return new Promise((resolve, reject) => {
        system.run(`ruby ${meta.src}/ios.rb add_schemes`)
        resolve()
      })
    }
  }
}
