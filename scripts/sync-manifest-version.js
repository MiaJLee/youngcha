#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

const manifestPath = path.resolve(__dirname, '../manifest.json')
const packagePath = path.resolve(__dirname, '../package.json')

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

if (manifest.version !== pkg.version) {
	manifest.version = pkg.version
	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
	console.log(`manifest.json version updated to ${pkg.version}`)
} else {
	console.log('manifest.json version is already up to date.')
}
