module.exports = {
  name: 'test',
  run: async toolbox => {
    const { print } = toolbox
    print.info('react-native-ci CLI, please run: react-native-ci init')
  }
}
