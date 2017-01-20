'use strict'

const chalk = require('chalk')
const RSVP = require('rsvp')
const path = require('path')
const packager = require('electron-forge/dist/api/package').default
const fs = require('fs-extra')
const npmi = require('npmi')
const glob = require('globby')
const getElectronPackagePath = require('../helpers/find-electron').getElectronPackagePath

const Command = require('ember-cli/lib/models/command')
const Promise = RSVP.Promise

module.exports = Command.extend({
  name: 'electron:package',
  description: 'Builds your app and launches Electron',

  init: function () {
    process.env.EMBER_CLI_ELECTRON = true

    if (this._super && this._super.init) {
      this._super.init.apply(this, arguments)
    }
  },

  // XXX This seems extremely unsustainable.
  availableOptions: [{
    name: 'environment',
    type: String,
    default: 'production',
    aliases: ['e', {
      dev: 'development'
    }, {
      prod: 'production'
    }]
  }, {
    name: 'arch',
    type: String,
    default: undefined,
    aliases: ['a']
  }, {
    name: 'app-bundle-id',
    type: String,
    default: undefined,
    aliases: ['abi']
  }, {
    name: 'app-category-id',
    type: String,
    default: undefined,
    aliases: ['aci']
  }, {
    name: 'app-copyright',
    type: String,
    default: undefined
  }, {
    name: 'app-version',
    type: String,
    default: undefined,
    aliases: ['av']
  }, {
    name: 'asar',
    type: Object,
    default: undefined,
    aliases: ['as']
  }, {
    name: 'build-version',
    type: String,
    default: undefined,
    aliases: ['bv']
  }, {
    name: 'copy-files',
    type: String,
    default: undefined,
    aliases: []
  }, {
    name: 'copy-dev-modules',
    type: String,
    default: undefined,
    aliases: []
  }, {
    name: 'deref-symlinks',
    type: Boolean,
    default: undefined,
    aliases: []
  }, {
    name: 'download',
    type: Object,
    default: undefined,
    aliases: []
  }, {
    name: 'extend-info',
    type: String,
    default: undefined
  }, {
    name: 'extra-resource',
    type: String,
    default: undefined
  }, {
    name: 'helper-bundle-id',
    type: String,
    default: undefined,
    aliases: ['hbi']
  }, {
    name: 'icon',
    type: String,
    default: undefined,
    aliases: ['i']
  }, {
    name: 'ignore',
    type: String,
    default: undefined,
    aliases: []
  }, {
    name: 'name',
    type: String,
    default: '',
    aliases: ['n']
  }, {
    name: 'out',
    type: String,
    default: undefined,
    aliases: ['o']
  }, {
    name: 'osx-sign',
    type: Object,
    default: undefined
  }, {
    name: 'overwrite',
    type: Boolean,
    default: false,
    aliases: []
  }, {
    name: 'platform',
    type: String,
    default: undefined,
    aliases: ['p']
  }, {
    name: 'prune',
    type: Boolean,
    default: false,
    aliases: []
  }, {
    name: 'protocol',
    type: Array,
    default: undefined,
    aliases: []
  }, {
    name: 'protocol-name',
    type: String,
    default: undefined,
    aliases: []
  }, {
    name: 'sign',
    type: String,
    default: undefined,
    aliases: []
  }, {
    name: 'strict-ssl',
    type: Boolean,
    default: undefined,
    aliases: []
  }, {
    name: 'version',
    type: String,
    default: undefined,
    aliases: ['v']
  }, {
    name: 'win32metadata',
    type: Object,
    default: undefined,
    aliases: []
  }],

  build: function (options) {
    this.ui.startProgress(chalk.green('Building'), chalk.green('.'))
    this.modulesToCopy = []

    const buildTask = new this.tasks.Build({
      ui: this.ui,
      modulesToCopy: this.modulesToCopy,
      analytics: this.analytics,
      project: this.project
    })

    return buildTask.run({
      environment: options.environment,
      outputPath: './tmp/electron-build-tmp/dist'
    })
  },

  organize: function (options) {
    return new Promise((resolve, reject) => {
      try {
        const ee = this.project.pkg['ember-electron'] || {}
        const patterns = options['copy-files'] || ee['copy-files'] || ['electron.js', 'package.json']
        const root = this.project.root + '/'
        let files = []

        this.ui.writeLine('')
        this.ui.writeLine('Copying files into Electron Build folder')

        for (var i = 0; i < patterns.length; i++) {
          files = files.concat(glob.sync(patterns[i]))
        }

        files.forEach((filename) => this.copy(filename, root, this.ui))
      } catch (err) {
        return reject(err)
      }

      resolve()
    })
  },

  copy: function (filename, root, ui) {
    try {
      ui.writeLine('Copying ' + filename)
      fs.copySync(root + filename, root + 'tmp/electron-build-tmp/' + filename)
    } catch (err) {
      ui.writeLine('')
      ui.writeLine(chalk.red('Error copying files into Electron package:'))
      ui.writeLine('')
      ui.writeLine(chalk.yellow(err.message))
    }
  },

  cleanup: function () {
    return new Promise((resolve, reject) => {
      fs.remove(`${this.project.root}/tmp/electron-build-tmp`, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  },

  ensureOut: function () {
    const buildsDir = `${this.project.root}/electron-builds`
    fs.ensureDirSync(buildsDir)

    return (buildsDir)
  },

  package: function (options) {
    return new Promise((resolve, reject) => {
      this.ui.writeLine(chalk.green('Packaging Electron executables'), chalk.green('.'))

      const ee = this.project.pkg['ember-electron'] || {}
      const packageOptions = {
        'app-bundle-id': options.appBundleId || ee['app-bundle-id'],
        'app-copyright': options.appCopyright || ee['app-copyright'],
        'app-category-type': options.appCategoryType || ee['app-category-type'],
        'app-version': options.appVersion || ee['app-version'],
        'arch': options.arch || ee.arch || 'all',
        'asar': options.asar || ee.asar,
        'build-version': options.buildVersion || ee['build-version'],
        'copy-dev-modules': options.copyDevModules || ee['copy-dev-modules'],
        'dir': './tmp/electron-build-tmp',
        'download': options.download || ee.download,
        'derefSymlinks': options.derefSymlinks || ee['deref-symlinks'],
        'extend-info': options.extendInfo || ee['extend-info'],
        'extra-resource': options.extraResource || ee['extra-resource'],
        'helper-bundle-id': options.helperBundleId || ee['helper-bundle-id'],
        'icon': options.icon || ee.icon,
        'ignore': options.ignore || ee.ignore,
        'name': options.name || ee.name || this.project.pkg.name,
        'osx-sign': options.osxSign || ee['osx-sign'],
        'out': options.out || ee.out || this.ensureOut(),
        'overwrite': options.overwrite || ee.overwrite,
        'platform': options.platform || ee.platform || 'all',
        'prune': options.prune || ee.prune,
        'protocol': options.protocol || ee.protocol,
        'protocol-name': options.protocolName || ee['protocol-name'],
        'sign': options.sign || ee.sign,
        'version': options.version || ee.version || '0.37.5',
        'win32metadata': options.win32metadata || ee.win32metadata
      }

      if (packageOptions.protocol && packageOptions['protocol-name']) {
        packageOptions.protocols = [{
          name: packageOptions['protocol-name'],
          schemes: packageOptions.protocol
        }]
      }

      // TODO write out the packager options into a file readable by forge.config.js

      resolve()
    }).then(packager())
  },

  run: function (options) {
    return this.build(options)
      .then(() => this.organize(options))
      .then(() => this.package(options))
      .then(() => this.cleanup())
  }
})
