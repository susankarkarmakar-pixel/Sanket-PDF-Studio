import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

const languages = ['eng', 'ben', 'hin', 'spa', 'fra', 'deu', 'jpn', 'chi_sim']
const projectRoot = process.cwd()
const tessdataOutput = join(projectRoot, 'resources', 'tessdata')
const runtimeOutput = join(projectRoot, 'resources', 'tesseract')
const tesseractPackage = join(projectRoot, 'node_modules', 'tesseract.js')
const corePackage = join(projectRoot, 'node_modules', 'tesseract.js-core')

await rm(tessdataOutput, { recursive: true, force: true })
await rm(runtimeOutput, { recursive: true, force: true })
await mkdir(tessdataOutput, { recursive: true })
await mkdir(join(runtimeOutput, 'core'), { recursive: true })

for (const language of languages) {
  const source = join(
    projectRoot,
    'node_modules',
    '@tesseract.js-data',
    language,
    '4.0.0_best_int',
    `${language}.traineddata.gz`
  )
  const destination = join(tessdataOutput, `${language}.traineddata.gz`)
  await copyFile(source, destination)
}

await copyFile(
  join(tesseractPackage, 'dist', 'worker.min.js'),
  join(runtimeOutput, 'worker.min.js')
)

const coreFiles = (await readdir(corePackage)).filter(
  (fileName) =>
    fileName.startsWith('tesseract-core-') &&
    (fileName.endsWith('.wasm') || fileName.endsWith('.wasm.js'))
)
for (const fileName of coreFiles) {
  await copyFile(join(corePackage, fileName), join(runtimeOutput, 'core', fileName))
}

const allFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await allFiles(path)))
    else files.push(path)
  }
  return files
}

const preparedFiles = [...(await allFiles(tessdataOutput)), ...(await allFiles(runtimeOutput))]
const preparedBytes = (
  await Promise.all(preparedFiles.map(async (path) => (await stat(path)).size))
).reduce((total, size) => total + size, 0)
console.log(
  `Prepared offline OCR resources: ${preparedFiles.length} files, ${preparedBytes} bytes.`
)
