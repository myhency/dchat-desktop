#!/usr/bin/env node
import { readFileSync, writeFileSync, rmSync, mkdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projRoot = join(__dirname, '..')
const buildDir = join(projRoot, 'build', 'backend-node_modules')

const require = createRequire(import.meta.url)
const electronVersion = require(join(projRoot, 'node_modules/electron/package.json')).version

// 1. Clean & create build directory
rmSync(buildDir, { recursive: true, force: true })
mkdirSync(buildDir, { recursive: true })

// 2. Extract backend production dependencies (@dchat/shared excluded — type-only)
const backendPkg = JSON.parse(readFileSync(join(projRoot, 'packages/backend/package.json'), 'utf-8'))
const deps = { ...backendPkg.dependencies }
delete deps['@dchat/shared']
const miniPkg = { name: 'dchat-backend-deps', version: '1.0.0', dependencies: deps }
writeFileSync(join(buildDir, 'package.json'), JSON.stringify(miniPkg, null, 2))

// 3. npm install --omit=dev
execSync('npm install --omit=dev', { cwd: buildDir, stdio: 'inherit' })

// 4. Rebuild better-sqlite3 against Electron headers
execSync(
  `npx @electron/rebuild -m "${buildDir}" -v ${electronVersion} -t prod -o better-sqlite3`,
  { cwd: buildDir, stdio: 'inherit' }
)

// 5. Cleanup temp files
unlinkSync(join(buildDir, 'package.json'))
try { unlinkSync(join(buildDir, 'package-lock.json')) } catch { /* may not exist */ }

console.log('Backend dependencies prepared successfully.')
