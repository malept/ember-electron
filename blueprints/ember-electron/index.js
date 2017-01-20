const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const RSVP = require('rsvp')
const VersionChecker = require('ember-cli-version-checker')

const denodeify = RSVP.denodeify
const readFile = denodeify(fs.readFile)
const writeFile = denodeify(fs.writeFile)

module.exports = {
  description: 'Install ember-electron in the project.',

  normalizeEntityName: function (entityName) {
    return entityName
  },

  afterInstall: function (options) {
    const dependencies = this.project.dependencies()

    return this.addElectronConfig(options).then(() => {
      this.logConfigurationWarning()

      const packages = []
      if (!dependencies['electron'] && !dependencies['electron-prebuilt']) {
        packages.push({name: 'electron'})
      }

      if (!dependencies['electron-forge']) {
        packages.push({name: 'electron-forge'})
      }

      if (!dependencies['ember-inspector']) {
        packages.push({name: 'ember-inspector'})
      }

      if (!dependencies.devtron) {
        packages.push({name: 'devtron'})
      }

      if (packages.length > 0) {
        return this.addPackagesToProject(packages)
      }
    })
  },

  addElectronConfig: function (options) {
    const packageJsonPath = path.join(this.project.root, 'package.json')

    if (this.project.pkg.main) {
      return RSVP.resolve()
    }

    const prom = readFile(packageJsonPath, {
      encoding: 'utf8'
    })

    return prom.then((data) => {
      const json = JSON.parse(data)

      json.main = 'electron.js'
      json['ember-electron'] = {
        'WHAT IS THIS?': 'Please see the README.md',
        'copy-files': ['electron.js', 'package.json'],
        'name': null,
        'platform': null,
        'arch': null,
        'version': null,
        'app-bundle-id': null,
        'app-category-type': null,
        'app-copyright': null,
        'app-version': null,
        'asar': null,
        'asar-unpack': null,
        'asar-unpack-dir': null,
        'build-version': null,
        'cache': null,
        'extend-info': null,
        'extra-resource': null,
        'helper-bundle-id': null,
        'icon': null,
        'ignore': null,
        'out': null,
        'osx-sign': {
          identity: null,
          entitlements: null,
          'entitlements-inherit': null
        },
        'protocol': [],
        'protocol-names': [],
        'win-opts': {
          'loading-gif': null,
          'icon-url': null,
          'remote-releases': null,
          'certificate-file': null,
          'certificate-password': null,
          'sign-with-params': null
        },
        overwrite: null,
        prune: null,
        'strict-ssl': null,
        'win32metadata': {
          CompanyName: null,
          FileDescription: null,
          OriginalFilename: null,
          ProductName: null,
          InternalName: null
        }
      }

      this.ui.writeLine('  ' + chalk.yellow('overwrite') + ' package.json')

      if (!options.dryRun) {
        return writeFile(packageJsonPath, JSON.stringify(json, null, '  '))
      }
    })
  },

  logConfigurationWarning: function () {
    const info = 'Ember Electron requires configuration. Please consult the Readme to ensure that this addon works!'
    const url = 'https://github.com/felixrieseberg/ember-electron'

    this.ui.writeLine(chalk.yellow(info))
    this.ui.writeLine(chalk.green(url))
  },

  locals: function () {
    const checker = new VersionChecker(this)
    const dep = checker.for('ember-cli', 'npm')
    let baseURLOption = "baseURL: '/',"
    let baseURLTestOption = "ENV.baseURL = '/';"

    if (dep.satisfies('>= 2.7.0')) {
      baseURLOption = 'rootURL: null,'
      baseURLTestOption = ''
    }

    return {baseURLOption, baseURLTestOption}
  }
}
