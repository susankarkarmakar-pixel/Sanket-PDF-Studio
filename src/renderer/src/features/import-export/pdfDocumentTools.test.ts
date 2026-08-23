import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { addPageNumbers, addWatermark, cropPages, normalizePageSize } from './pdfDocumentTools'

const createPdf = async (): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create()
  pdf.addPage([600, 800])
  return pdf.save()
}

describe('pdfDocumentTools', () => {
  it('adds watermark content without changing page count', async () => {
    const result = await addWatermark(await createPdf(), 'CONFIDENTIAL')
    expect((await PDFDocument.load(result)).getPageCount()).toBe(1)
  })

  it('adds page numbers without changing page count', async () => {
    const result = await addPageNumbers(await createPdf())
    expect((await PDFDocument.load(result)).getPageCount()).toBe(1)
  })

  it('crops pages and rejects excessive margins', async () => {
    const result = await cropPages(await createPdf(), 20)
    const page = (await PDFDocument.load(result)).getPage(0)
    expect(page.getCropBox().width).toBe(560)
    await expect(cropPages(await createPdf(), 400)).rejects.toThrow('too large')
  })

  it('normalizes page size to A4', async () => {
    const result = await normalizePageSize(await createPdf(), 'A4')
    const page = (await PDFDocument.load(result)).getPage(0)
    expect(page.getWidth()).toBeCloseTo(595.28, 1)
    expect(page.getHeight()).toBeCloseTo(841.89, 1)
  })
})
