import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import {
  deletePages,
  duplicatePages,
  insertBlankPages,
  insertPages,
  parseRanges,
  rotatePages
} from './pdfPageOps'

const createPdf = async (pageCount: number): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create()
  for (let i = 0; i < pageCount; i += 1) pdf.addPage([600, 800])
  return pdf.save()
}

const pageCount = async (data: Uint8Array): Promise<number> => {
  const pdf = await PDFDocument.load(data)
  return pdf.getPageCount()
}

describe('parseRanges', () => {
  it('parses single pages, closed ranges, and open-ended ranges', () => {
    expect(parseRanges('1, 2-3, 5-', 6)).toEqual([[0], [1, 2], [4, 5]])
  })

  it('ignores empty comma-separated segments', () => {
    expect(parseRanges(' 1-2, , 4 ', 4)).toEqual([[0, 1], [3]])
  })

  it('rejects invalid or out-of-bounds ranges', () => {
    expect(() => parseRanges('0-2', 4)).toThrow('Invalid range: 0-2')
    expect(() => parseRanges('2-8', 4)).toThrow('Invalid range: 2-8')
    expect(() => parseRanges('4-2', 4)).toThrow('Invalid range: 4-2')
    expect(() => parseRanges('not-a-page', 4)).toThrow('Invalid range: not-a-page')
  })

  it('rejects an empty input', () => {
    expect(() => parseRanges(' , ', 4)).toThrow('No valid ranges provided')
  })
})

describe('page operations', () => {
  it('deletes selected pages without allowing an empty PDF', async () => {
    const source = await createPdf(3)
    expect(await pageCount(await deletePages(source, [2]))).toBe(2)
    await expect(deletePages(source, [1, 2, 3])).rejects.toThrow('at least one page')
  })

  it('rotates selected pages and preserves the page count', async () => {
    const source = await createPdf(2)
    const rotated = await rotatePages(source, [1])
    const pdf = await PDFDocument.load(rotated)
    expect(pdf.getPageCount()).toBe(2)
    expect(pdf.getPage(0).getRotation().angle).toBe(90)
  })

  it('duplicates selected pages', async () => {
    const source = await createPdf(3)
    expect(await pageCount(await duplicatePages(source, [1, 3]))).toBe(5)
  })

  it('inserts source pages and blank pages at a zero-based position', async () => {
    const source = await createPdf(2)
    const inserted = await insertPages(source, await createPdf(3), 1)
    expect(await pageCount(inserted)).toBe(5)

    const withBlanks = await insertBlankPages(source, 2, 0)
    expect(await pageCount(withBlanks)).toBe(4)
  })
})
