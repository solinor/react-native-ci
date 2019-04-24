module.exports = {
  name: 'react-native-ci',
  run: async toolbox => {
    const { print } = toolbox
    print.info('react-native-ci CLI, please run: react-native-ci init')
  }
}
