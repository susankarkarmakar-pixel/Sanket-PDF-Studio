import { access } from 'fs/promises'
import { constants } from 'fs'
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

export const getRuntimeCapabilities = async (): Promise<RuntimeCapabilities> => {
  const qpdf = await getQpdfInvocation()
  const qpdfStatus = await probeTool(qpdf.path, qpdf.source, qpdf.env)
  const opensslStatus = await probeTool('openssl', 'system')
  return { qpdf: qpdfStatus, openssl: opensslStatus }
}
