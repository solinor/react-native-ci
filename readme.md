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

Provide the required information when prompted.


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

