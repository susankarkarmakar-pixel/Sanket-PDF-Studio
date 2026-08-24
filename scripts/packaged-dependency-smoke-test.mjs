import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { listPackage } from '@electron/asar'

const packagePath = resolve(process.argv[2] || 'dist/win-unpacked/resources/app.asar')
await access(packagePath)
const entries = (await listPackage(packagePath)).map((entry) => entry.replace(/^\/+/, ''))
const required = [
  'node_modules/node-forge/lib/index.js',
  'node_modules/@signpdf/signer-p12/dist/P12Signer.js',
  'node_modules/@signpdf/utils/dist/index.js'
]
const missing = required.filter(
  (path) => !entries.some((entry) => entry === path || entry.startsWith(`${path}/`))
)
if (missing.length > 0) {
  throw new Error(`Packaged dependency smoke test failed. Missing: ${missing.join(', ')}`)
}
console.log(`Packaged dependency smoke test passed for ${packagePath}.`)
