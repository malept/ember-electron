'use strict'

const Package = require('./package')
const PromiseExt = require('ember-cli/lib/ext/promise')

// TODO const maker = require('electron-forge/dist/api/make').default
const shipMac = require('../utils/ship-mac')
const shipWin = require('../utils/ship-win')

module.exports = Package.extend({
  name: 'electron:ship',
  description: 'Packages your Ember + Electron app into shippable installers',

  availableOptions: Package.prototype.availableOptions.concat([{
    name: 'skip-packaging',
    type: Boolean,
    default: false,
    aliases: []
  }]),

  run: function (options) {
    const ee = this.project.pkg['ember-electron']
    const platform = options.platform || ee.platform
    const arch = options.arch || ee.arch

    if (typeof platform !== 'string' || typeof arch !== 'string') {
      throw new Error('please define platform & architecture to ship for')
    }

    return this.packageElectron(options)
      .then(() => this.finalizePackage(options))
  },

  packageElectron: function (options) {
    const hasRunnableSuper = this._super !== undefined &&
      typeof this._super.run === 'function'

    return options.skipPackaging || !hasRunnableSuper
      ? PromiseExt.resolve() : this._super.run.apply(this, arguments)
  },

  finalizePackage: function (options) {
    const ee = this.project.pkg['ember-electron']
    const platform = options.platform || ee.platform

    switch (platform) {
      case 'darwin':
        return shipMac(this.project.pkg, options)
      case 'win32':
        return shipWin(this.project.pkg, options)
      default:
        let error = new Error("don't know how to ship this platform")
        return PromiseExt.reject(error)
    }
  }
})
