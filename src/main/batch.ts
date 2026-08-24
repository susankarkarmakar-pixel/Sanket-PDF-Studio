import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface OptimizePdfOptions {
  linearize: boolean
  generateObjectStreams: boolean
  recompressStreams: boolean
  compressionLevel: number
}

const defaultOptions: OptimizePdfOptions = {
  linearize: false,
  generateObjectStreams: true,
  recompressStreams: true,
  compressionLevel: 6
}

const normalizeOptions = (options?: Partial<OptimizePdfOptions>): OptimizePdfOptions => ({
  ...defaultOptions,
  ...options,
  compressionLevel: Math.max(0, Math.min(9, Math.round(options?.compressionLevel ?? 6)))
})

export const optimizePdfDocument = async (
  pdfData: Uint8Array,
  options?: Partial<OptimizePdfOptions>
): Promise<Uint8Array> => {
  if (pdfData.length === 0) throw new Error('The PDF is empty.')

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'sanket-pdf-batch-'))
  const inputPath = join(temporaryDirectory, 'input.pdf')
  const outputPath = join(temporaryDirectory, 'output.pdf')
  const normalized = normalizeOptions(options)

  try {
    await writeFile(inputPath, Buffer.from(pdfData))
    const args = [
      '--stream-data=compress',
      '--decode-level=generalized',
      `--compression-level=${normalized.compressionLevel}`,
      ...(normalized.generateObjectStreams
        ? ['--object-streams=generate']
        : ['--object-streams=preserve']),
      ...(normalized.recompressStreams ? ['--recompress-flate'] : []),
      ...(normalized.linearize ? ['--linearize'] : []),
      '--',
      inputPath,
      outputPath
    ]

    await execFileAsync('qpdf', args)
    return new Uint8Array(await readFile(outputPath))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF optimization failed.'
    if (/enoent|not found/i.test(message)) {
      throw new Error('PDF optimization requires qpdf to be installed on this computer.')
    }
    throw new Error(message)
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}
