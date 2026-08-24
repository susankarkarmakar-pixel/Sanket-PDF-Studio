import { copyFile, mkdir, mkdtemp, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const QPDF_VERSION = '12.4.0'

const releases = {
  linux: {
    archive: `qpdf-${QPDF_VERSION}-bin-linux-x86_64.zip`,
    sha256: 'a3bca240f3bb61efdc3a90be89d1da4ed5e125326c3458c4e62df53ff4f153e3'
  },
  win32: {
    archive: `qpdf-${QPDF_VERSION}-msvc64.zip`,
    sha256: '5bcb25353f7e6df92b5625dbcfe52a5c34a2a5fba2d1a8b98b8a6a0972c3ff72'
  }
}

const argumentValue = (name) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

const targetPlatform = argumentValue('--platform') || process.env.QPDF_PLATFORM || process.platform
const release = releases[targetPlatform]

if (!release) {
  console.log(`qpdf preparation skipped for unsupported target platform: ${targetPlatform}`)
  process.exit(0)
}

const root = process.cwd()
const outputDirectory = join(root, 'resources', 'qpdf')
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'sanket-qpdf-download-'))
const archivePath = join(temporaryDirectory, release.archive)
const extractDirectory = join(temporaryDirectory, 'extract')
const url = `https://github.com/qpdf/qpdf/releases/download/v${QPDF_VERSION}/${release.archive}`

const copyDirectoryWithoutSymlinks = async (sourceDirectory, targetDirectory) => {
  await mkdir(targetDirectory, { recursive: true })
  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = join(sourceDirectory, entry.name)
    const targetPath = join(targetDirectory, entry.name)
    const actualPath = entry.isSymbolicLink() ? await realpath(sourcePath) : sourcePath
    const actualStats = await stat(actualPath)
    if (actualStats.isDirectory()) {
      await copyDirectoryWithoutSymlinks(actualPath, targetPath)
    } else {
      await copyFile(actualPath, targetPath)
    }
  }
}

const extractArchive = async () => {
  if (process.platform === 'win32') {
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force',
      archivePath,
      extractDirectory
    ])
  } else {
    await execFileAsync('unzip', ['-q', archivePath, '-d', extractDirectory])
  }
}

try {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`)
  const archive = Buffer.from(await response.arrayBuffer())
  const digest = createHash('sha256').update(archive).digest('hex')
  if (digest !== release.sha256) {
    throw new Error(
      `qpdf archive checksum mismatch. Expected ${release.sha256}, received ${digest}.`
    )
  }
  await writeFile(archivePath, archive)
  await extractArchive()

  const executableName = targetPlatform === 'win32' ? 'qpdf.exe' : 'qpdf'
  const findExecutable = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isFile() && entry.name.toLowerCase() === executableName.toLowerCase()) return path
      if (entry.isDirectory()) {
        const found = await findExecutable(path)
        if (found) return found
      }
    }
    return null
  }

  const executablePath = await findExecutable(extractDirectory)
  if (!executablePath) throw new Error(`The qpdf archive did not contain ${executableName}.`)
  const packageRoot = dirname(dirname(executablePath))

  await rm(outputDirectory, { recursive: true, force: true })
  await copyDirectoryWithoutSymlinks(join(packageRoot, 'bin'), join(outputDirectory, 'bin'))
  if (targetPlatform === 'linux') {
    await copyDirectoryWithoutSymlinks(join(packageRoot, 'lib'), join(outputDirectory, 'lib'))
  }
  console.log(
    `Prepared qpdf ${QPDF_VERSION} for ${targetPlatform} at ${join(outputDirectory, 'bin', basename(executablePath))}`
  )
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
