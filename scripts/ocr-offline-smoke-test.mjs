import { access, readFile, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

const languages = ['eng', 'ben', 'hin', 'spa', 'fra', 'deu', 'jpn', 'chi_sim']
const root = process.cwd()
const tessdata = join(root, 'resources', 'tessdata')
const runtime = join(root, 'resources', 'tesseract')

const requireFile = async (path) => {
  await access(path, constants.F_OK)
  const metadata = await stat(path)
  if (!metadata.isFile() || metadata.size === 0)
    throw new Error(`Invalid offline OCR resource: ${path}`)
}

for (const language of languages) {
  const path = join(tessdata, `${language}.traineddata.gz`)
  await requireFile(path)
  const header = await readFile(path, { encoding: null })
  if (header[0] !== 0x1f || header[1] !== 0x8b)
    throw new Error(`Invalid gzip header for ${language}.`)
}

await requireFile(join(runtime, 'worker.min.js'))
for (const fileName of [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-lstm.wasm',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm'
]) {
  await requireFile(join(runtime, 'core', fileName))
}

console.log(`Offline OCR smoke test passed for ${languages.length} language packs.`)
