import { access } from 'fs/promises'
import { constants, existsSync } from 'fs'
import { dirname, join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export type RuntimeToolSource = 'bundled' | 'system' | 'unavailable'

export interface RuntimeToolStatus {
  available: boolean
  source: RuntimeToolSource
  path: string | null
  version: string | null
  error: string | null
}

export interface RuntimeCapabilities {
  qpdf: RuntimeToolStatus
  openssl: RuntimeToolStatus
  ocr: RuntimeToolStatus
}

export interface OcrRuntimePaths {
  workerPath: string
  corePath: string
  langPath: string
  languageCodes: string[]
}

export interface QpdfInvocation {
  path: string
  source: 'bundled' | 'system'
  env?: NodeJS.ProcessEnv
}

const qpdfName = process.platform === 'win32' ? 'qpdf.exe' : 'qpdf'
const resourcesPath =
  (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ||
  join(process.cwd(), 'resources')
const bundledQpdfCandidates = [
  join(resourcesPath, 'qpdf', 'bin', qpdfName),
  join(resourcesPath, 'qpdf', process.platform, qpdfName),
  join(resourcesPath, 'qpdf', qpdfName),
  join(process.cwd(), 'resources', 'qpdf', 'bin', qpdfName),
  join(process.cwd(), 'resources', 'qpdf', process.platform, qpdfName),
  join(process.cwd(), 'resources', 'qpdf', qpdfName)
]

const isExecutableFile = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const bundledInvocation = (path: string): QpdfInvocation => {
  if (process.platform !== 'linux') return { path, source: 'bundled' }
  const libraryPath = join(dirname(dirname(path)), 'lib')
  return {
    path,
    source: 'bundled',
    env: {
      ...process.env,
      LD_LIBRARY_PATH: [libraryPath, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':')
    }
  }
}

export const getQpdfInvocation = async (): Promise<QpdfInvocation> => {
  for (const candidate of bundledQpdfCandidates) {
    if (await isExecutableFile(candidate)) return bundledInvocation(candidate)
  }
  return { path: 'qpdf', source: 'system' }
}

export const resolveQpdfPath = async (): Promise<{
  path: string
  source: 'bundled' | 'system'
}> => {
  const invocation = await getQpdfInvocation()
  return { path: invocation.path, source: invocation.source }
}

const probeTool = async (
  command: string,
  source: RuntimeToolSource,
  env?: NodeJS.ProcessEnv
): Promise<RuntimeToolStatus> => {
  try {
    const result = await execFileAsync(command, ['--version'], { env })
    const version = result.stdout.trim().split(/\r?\n/)[0] || null
    return { available: true, source, path: command, version, error: null }
  } catch (error) {
    return {
      available: false,
      source: 'unavailable',
      path: null,
      version: null,
      error: error instanceof Error ? error.message : 'Tool is unavailable.'
    }
  }
}

const ocrLanguageCodes = ['eng', 'ben', 'hin', 'spa', 'fra', 'deu', 'jpn', 'chi_sim']

const getResourceDirectories = (name: string): string[] => [
  join(resourcesPath, name),
  join(process.cwd(), 'resources', name)
]

export const getOcrResourcePath = (
  kind: 'runtime' | 'data',
  relativePath: string
): string | null => {
  if (relativePath.includes('..') || relativePath.includes('\0') || relativePath.startsWith('/'))
    return null
  const roots = getResourceDirectories(kind === 'runtime' ? 'tesseract' : 'tessdata')
  for (const root of roots) {
    const candidate = join(root, relativePath)
    if (
      (candidate.startsWith(`${root}/`) || candidate.startsWith(`${root}\\`)) &&
      existsSync(candidate)
    ) {
      return candidate
    }
  }
  return null
}

export const getOcrRuntimePaths = async (): Promise<OcrRuntimePaths> => {
  const requiredFiles = [
    ...ocrLanguageCodes.map((code) => ({ kind: 'data' as const, path: `${code}.traineddata.gz` })),
    { kind: 'runtime' as const, path: 'worker.min.js' },
    { kind: 'runtime' as const, path: 'core/tesseract-core-lstm.wasm.js' },
    { kind: 'runtime' as const, path: 'core/tesseract-core-lstm.wasm' }
  ]
  for (const required of requiredFiles) {
    const candidate = getOcrResourcePath(required.kind, required.path)
    if (!candidate || !(await isExecutableFile(candidate))) {
      throw new Error(`Offline OCR runtime is incomplete: ${required.path}`)
    }
  }
  return {
    workerPath: 'sanket://ocr-runtime/worker.min.js',
    corePath: 'sanket://ocr-runtime/core',
    langPath: 'sanket://ocr-data',
    languageCodes: [...ocrLanguageCodes]
  }
}

export const getRuntimeCapabilities = async (): Promise<RuntimeCapabilities> => {
  const qpdf = await getQpdfInvocation()
  const qpdfStatus = await probeTool(qpdf.path, qpdf.source, qpdf.env)
  const opensslStatus = await probeTool('openssl', 'system')
  let ocrStatus: RuntimeToolStatus
  try {
    await getOcrRuntimePaths()
    ocrStatus = {
      available: true,
      source: 'bundled',
      path: 'sanket://ocr-runtime',
      version: 'Tesseract.js worker/core with 8 local language packs',
      error: null
    }
  } catch (error) {
    ocrStatus = {
      available: false,
      source: 'unavailable',
      path: null,
      version: null,
      error: error instanceof Error ? error.message : 'Offline OCR resources are unavailable.'
    }
  }
  return { qpdf: qpdfStatus, openssl: opensslStatus, ocr: ocrStatus }
}
