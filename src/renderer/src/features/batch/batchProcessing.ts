import { imagesToPdf, type ImageInput } from '../import-export/imageToPdf'

export type BatchMode = 'convert-images' | 'optimize-pdfs'
export type BatchItemStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

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
  error: string | null
}

export interface BatchOptimizeOptions {
  linearize: boolean
  generateObjectStreams: boolean
  recompressStreams: boolean
  compressionLevel: number
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
