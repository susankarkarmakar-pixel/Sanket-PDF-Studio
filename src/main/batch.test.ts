import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { optimizePdfDocument } from './batch'

describe('batch PDF optimization', () => {
  it('returns a valid PDF after qpdf optimization', async () => {
    const document = await PDFDocument.create()
    document.addPage([240, 160])
    const input = await document.save()

    const output = await optimizePdfDocument(input, {
      linearize: true,
      generateObjectStreams: true,
      recompressStreams: true,
      compressionLevel: 9
    })

    expect(Buffer.from(output).subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(output.byteLength).toBeGreaterThan(0)
  })
})
