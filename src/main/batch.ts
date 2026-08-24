import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getQpdfInvocation } from './runtime'

const execFileAsync = promisify(execFile)

export interface OptimizePdfOptions {
  linearize: boolean
  generateObjectStreams: boolean
  recompressStreams: boolean
  compressionLevel: number
  targetSizeBytes: number | null
}

const defaultOptions: OptimizePdfOptions = {
  linearize: false,
  generateObjectStreams: true,
  recompressStreams: true,
  compressionLevel: 6,
  targetSizeBytes: null
}

const normalizeOptions = (options?: Partial<OptimizePdfOptions>): OptimizePdfOptions => {
  const requestedTarget = options?.targetSizeBytes ?? null
  if (
    requestedTarget !== null &&
    (!Number.isFinite(requestedTarget) ||
      requestedTarget <= 0 ||
      !Number.isInteger(requestedTarget))
  ) {
    throw new Error('Target size must be a positive whole number of bytes.')
  }

  return {
    ...defaultOptions,
    ...options,
    compressionLevel: Math.max(0, Math.min(9, Math.round(options?.compressionLevel ?? 6))),
    targetSizeBytes: requestedTarget
  }
}

const buildQpdfArgs = (
  inputPath: string,
  outputPath: string,
  options: OptimizePdfOptions,
  optimizeImages: boolean
): string[] => [
  '--stream-data=compress',
  '--decode-level=generalized',
  `--compression-level=${options.compressionLevel}`,
  ...(options.generateObjectStreams
    ? ['--object-streams=generate']
    : ['--object-streams=preserve']),
  ...(options.recompressStreams ? ['--recompress-flate'] : []),
  ...(optimizeImages ? ['--optimize-images'] : []),
  ...(options.linearize ? ['--linearize'] : []),
  '--',
  inputPath,
  outputPath
]

export const optimizePdfDocument = async (
  pdfData: Uint8Array,
  options?: Partial<OptimizePdfOptions>
): Promise<Uint8Array> => {
  if (pdfData.length === 0) throw new Error('The PDF is empty.')

  const normalized = normalizeOptions(options)
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'sanket-pdf-batch-'))
  const inputPath = join(temporaryDirectory, 'input.pdf')

  try {
    await writeFile(inputPath, Buffer.from(pdfData))

    const qpdf = await getQpdfInvocation()
    const compressionLevels =
      normalized.targetSizeBytes === null
        ? [normalized.compressionLevel]
        : [...new Set([normalized.compressionLevel, 9])]
    const optimizeImageModes = normalized.targetSizeBytes === null ? [false] : [false, true]
    let bestOutput: Uint8Array | null = null

    for (const compressionLevel of compressionLevels) {
      for (const optimizeImages of optimizeImageModes) {
        const candidateOptions = { ...normalized, compressionLevel }
        const outputPath = join(
          temporaryDirectory,
          `output-${compressionLevel}-${optimizeImages ? 'images' : 'streams'}.pdf`
        )
        await execFileAsync(
          qpdf.path,
          buildQpdfArgs(inputPath, outputPath, candidateOptions, optimizeImages),
          qpdf.env ? { env: qpdf.env } : undefined
        )
        const candidate = new Uint8Array(await readFile(outputPath))
        if (bestOutput === null || candidate.byteLength < bestOutput.byteLength) {
          bestOutput = candidate
        }
        if (
          normalized.targetSizeBytes !== null &&
          candidate.byteLength <= normalized.targetSizeBytes
        ) {
          return candidate
        }
      }
    }

    if (!bestOutput) throw new Error('PDF optimization did not produce an output file.')
    return bestOutput
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
