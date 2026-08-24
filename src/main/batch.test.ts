import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { optimizePdfDocument } from './batch'

describe('batch PDF optimization', () => {
  const createInput = async (): Promise<Uint8Array> => {
    const document = await PDFDocument.create()
    document.addPage([240, 160])
    return document.save()
  }

  it('returns a valid PDF after qpdf optimization', async () => {
    const input = await createInput()

    const output = await optimizePdfDocument(input, {
      linearize: true,
      generateObjectStreams: true,
      recompressStreams: true,
      compressionLevel: 9
    })

    expect(Buffer.from(output).subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(output.byteLength).toBeGreaterThan(0)
  })

  it('returns an output at or below an attainable maximum target', async () => {
    const input = await createInput()
    const output = await optimizePdfDocument(input, { targetSizeBytes: 1024 * 1024 })

    expect(output.byteLength).toBeLessThanOrEqual(1024 * 1024)
  })

  it('rejects non-positive and fractional target byte values', async () => {
    const input = await createInput()

    await expect(optimizePdfDocument(input, { targetSizeBytes: 0 })).rejects.toThrow(
      'Target size must be a positive whole number of bytes.'
    )
    await expect(optimizePdfDocument(input, { targetSizeBytes: 12.5 })).rejects.toThrow(
      'Target size must be a positive whole number of bytes.'
    )
  })
})
