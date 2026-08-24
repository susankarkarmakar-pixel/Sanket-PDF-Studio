import { imagesToPdf, type ImageInput } from '../import-export/imageToPdf'

export type BatchMode = 'convert-images' | 'optimize-pdfs'
export type BatchItemStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type TargetSizeUnit = 'KB' | 'MB'

export interface BatchInput {
  path: string
  data: Uint8Array
}

export interface BatchItem {
  id: string
  input: BatchInput
  status: BatchItemStatus
  outputPath: string | null
  originalBytes: number
  outputBytes: number | null
  targetReached: boolean | null
  error: string | null
}

export const parseTargetSize = (value: string, unit: TargetSizeUnit): number | null => {
  if (!value.trim()) return null
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new Error('Target size must be greater than zero.')
  }
  const multiplier = unit === 'MB' ? 1024 * 1024 : 1024
  return Math.round(numericValue * multiplier)
}

export interface BatchOptimizeOptions {
  linearize: boolean
  generateObjectStreams: boolean
  recompressStreams: boolean
  compressionLevel: number
  targetSizeBytes: number | null
}

const baseName = (filePath: string): string =>
  filePath
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.[^.]+$/, '') || 'document'

export const convertImageToPdf = (input: BatchInput): Promise<Uint8Array> =>
  imagesToPdf([{ path: input.path, data: input.data } as ImageInput])

export const optimizePdf = (
  input: BatchInput,
  options: BatchOptimizeOptions
): Promise<Uint8Array> => window.api.optimizePdf(input.data, options)

export const outputNameFor = (input: BatchInput, mode: BatchMode): string =>
  mode === 'convert-images'
    ? `${baseName(input.path)}.pdf`
    : `${baseName(input.path)}-optimized.pdf`

export const fileSizeLabel = (bytes: number | null): string => {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
