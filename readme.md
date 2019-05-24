# react-native-ci CLI

A CLI for integrating CI/CD pipeline to React Native project.
It will generate, modify necessary files and install packages 
to achieve this.

Historically, setting up CI/CD for React Native has been hard and
by automating the most of it through react-native-ci it can become
easy!

Current status: *Experimental*

Test first with cleanly init React Native project.
Make sure you have commited your code before to avoid any data loss.

## Prerequisites

- Currently runs on MacOS

Opinionated stack:

- Github
- CircleCI
- Dev, Staging, Production build flavors

Possibility to extend supporting other choices, please contribute!

## Install

```
npm install -g react-native-ci
```

## Usage

Run command in your project root:

```
react-native-ci init
```

Provide the required information when prompted. Optionally you can give input as command line parameters
or define config file. This is useful when you test command multiple times and don't want
to have to input all the values manually each time. Especially useful when developing and testing
react-native-ci itself!

### Command-line options: 

`--ci` - will initialize CI integration

`--android` will initialize Android integration

`--ios` will initialize iOS integartion.

If none are provided, defaults to running all the ingerations.

You can also provide all the values that are configurable in the config file as command line arguments.
So `--appleDevAccount dev@company.com` to set your Apple dev account for example.

### Example config file: (react-native-ci.config.js)

```
module.exports = {
    defaults: {
        githubOrg: "org-name",
        repo: "github-repo",
        circleApi: "circleApiToken",
        googleJsonPath: "path/to/google/json",
        appleDevAccount: "dev@company.com",
        iTunesTeamId: "itunes-team-id",
        appConnectTeamId: "app-connect-team-id",
        certRepoUrl: "git@github.com:company/project-ios-certs.git",
        appId: "com.company.greatapp",
        matchPassword: "password",
    }
}

```

## What does it actually do?

There are 8 different steps that all are automated through the tool.

1) Integrate CI/CD server to version control
2) Configure CI/CD server pipelines
3) Add build flavors to app
4) Share secrets
5) Setup app signing & certificates
6) Handle updating version numbering
7) Icon badges for dev and staging builds
8) Deployment to app stores

Here are [slides from React Finland talk](docs/ReactFinland-RN-CICD.pdf) going through the steps.

## Contribute

We welcome contributions to make react-native-ci even better. 
If you are interested in the library, come join us
at #react-native-ci on [Infinite Red's Community Slack](http://community.infinite.red/).
 
## Thanks

- [Gofore](https://www.gofore.com) Mobile team

- [Infinite Red](https://infinite.red/) for [Gluegun](https://infinitered.github.io/gluegun/#/)


## License

MIT - see LICENSE

