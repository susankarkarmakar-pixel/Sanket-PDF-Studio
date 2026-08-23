import { degrees, PDFDocument, PageSizes } from 'pdf-lib'

const normalizePageNumbers = (pageNumbers: number[], pageCount: number): number[] => {
  const uniquePages = [...new Set(pageNumbers)]
  if (
    uniquePages.length === 0 ||
    uniquePages.some((page) => !Number.isInteger(page) || page < 1 || page > pageCount)
  ) {
    throw new Error('One or more page numbers are invalid.')
  }
  return uniquePages.sort((a, b) => a - b)
}

const validateInsertionIndex = (insertAt: number, pageCount: number): void => {
  if (!Number.isInteger(insertAt) || insertAt < 0 || insertAt > pageCount) {
    throw new Error(`Insertion position must be between 0 and ${pageCount}.`)
  }
}

// Merge multiple PDFs into one.
export const mergePdfs = async (fileDatas: Uint8Array[]): Promise<Uint8Array> => {
  if (fileDatas.length < 2) throw new Error('At least two PDFs are required.')
  const mergedPdf = await PDFDocument.create()

  for (const data of fileDatas) {
    const pdf = await PDFDocument.load(data)
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    copiedPages.forEach((page) => mergedPdf.addPage(page))
  }

  return mergedPdf.save()
}

// Split PDF by page ranges (e.g., '1-5, 6-10, 11-').
export const splitPdf = async (
  pdfData: Uint8Array,
  rangesString: string
): Promise<Uint8Array[]> => {
  const pdf = await PDFDocument.load(pdfData)
  const numPages = pdf.getPageCount()
  const ranges = parseRanges(rangesString, numPages)
  const resultPdfs: Uint8Array[] = []

  for (const range of ranges) {
    const newPdf = await PDFDocument.create()
    const copiedPages = await newPdf.copyPages(pdf, range)
    copiedPages.forEach((page) => newPdf.addPage(page))
    resultPdfs.push(await newPdf.save())
  }

  return resultPdfs
}

// Rearrange PDF pages. newOrder is 1-based.
export const rearrangePdf = async (
  pdfData: Uint8Array,
  newOrder: number[]
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const order = normalizePageNumbers(newOrder, pdf.getPageCount())
  if (order.length !== pdf.getPageCount())
    throw new Error('The new page order must contain every page exactly once.')
  const newPdf = await PDFDocument.create()
  const copiedPages = await newPdf.copyPages(
    pdf,
    order.map((page) => page - 1)
  )
  copiedPages.forEach((page) => newPdf.addPage(page))
  return newPdf.save()
}

// Extract specific pages in the order supplied. pageNumbers is 1-based.
export const extractPages = async (
  pdfData: Uint8Array,
  pageNumbers: number[]
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const pages = normalizePageNumbers(pageNumbers, pdf.getPageCount())
  const newPdf = await PDFDocument.create()
  const copiedPages = await newPdf.copyPages(
    pdf,
    pages.map((page) => page - 1)
  )
  copiedPages.forEach((page) => newPdf.addPage(page))
  return newPdf.save()
}

export const deletePages = async (
  pdfData: Uint8Array,
  pageNumbers: number[]
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const pages = normalizePageNumbers(pageNumbers, pdf.getPageCount())
  if (pages.length >= pdf.getPageCount()) throw new Error('A PDF must contain at least one page.')
  for (const pageNumber of pages.reverse()) pdf.removePage(pageNumber - 1)
  return pdf.save()
}

export const rotatePages = async (
  pdfData: Uint8Array,
  pageNumbers: number[],
  angle: 90 | 180 | 270 = 90
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const pages = normalizePageNumbers(pageNumbers, pdf.getPageCount())
  for (const pageNumber of pages) {
    const page = pdf.getPage(pageNumber - 1)
    page.setRotation(degrees(page.getRotation().angle + angle))
  }
  return pdf.save()
}

export const duplicatePages = async (
  pdfData: Uint8Array,
  pageNumbers: number[]
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const pages = new Set(normalizePageNumbers(pageNumbers, pdf.getPageCount()))
  const newPdf = await PDFDocument.create()
  const order: number[] = []
  for (let page = 1; page <= pdf.getPageCount(); page += 1) {
    order.push(page - 1)
    if (pages.has(page)) order.push(page - 1)
  }
  const copiedPages = await newPdf.copyPages(pdf, order)
  copiedPages.forEach((page) => newPdf.addPage(page))
  return newPdf.save()
}

export const insertPages = async (
  pdfData: Uint8Array,
  sourcePdfData: Uint8Array,
  insertAt: number
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const sourcePdf = await PDFDocument.load(sourcePdfData)
  validateInsertionIndex(insertAt, pdf.getPageCount())
  const newPdf = await PDFDocument.create()
  const originalPages = await newPdf.copyPages(pdf, pdf.getPageIndices())
  const insertedPages = await newPdf.copyPages(sourcePdf, sourcePdf.getPageIndices())
  originalPages.forEach((page, index) => {
    if (index === insertAt) insertedPages.forEach((insertedPage) => newPdf.addPage(insertedPage))
    newPdf.addPage(page)
  })
  if (insertAt === originalPages.length) insertedPages.forEach((page) => newPdf.addPage(page))
  return newPdf.save()
}

export type BlankPageSize = 'A4' | 'Letter' | 'Legal'

export const insertBlankPages = async (
  pdfData: Uint8Array,
  count: number,
  insertAt: number,
  size: BlankPageSize = 'A4'
): Promise<Uint8Array> => {
  if (!Number.isInteger(count) || count < 1 || count > 100)
    throw new Error('Blank page count must be between 1 and 100.')
  const pdf = await PDFDocument.load(pdfData)
  validateInsertionIndex(insertAt, pdf.getPageCount())
  const newPdf = await PDFDocument.create()
  const originalPages = await newPdf.copyPages(pdf, pdf.getPageIndices())
  const pageSize = PageSizes[size]
  originalPages.forEach((page, index) => {
    if (index === insertAt) {
      for (let i = 0; i < count; i += 1) newPdf.addPage(pageSize)
    }
    newPdf.addPage(page)
  })
  if (insertAt === originalPages.length) {
    for (let i = 0; i < count; i += 1) newPdf.addPage(pageSize)
  }
  return newPdf.save()
}

// Helper to parse '1-5, 6-10, 11-' into arrays of 0-based indices.
export const parseRanges = (rangesString: string, maxPages: number): number[][] => {
  const ranges: number[][] = []
  const parts = rangesString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const part of parts) {
    const range: number[] = []
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-')
      const start = parseInt(startStr, 10)
      const end = endStr ? parseInt(endStr, 10) : maxPages
      if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
        throw new Error(`Invalid range: ${part}`)
      }
      for (let i = start; i <= end; i += 1) range.push(i - 1)
    } else {
      const page = parseInt(part, 10)
      if (isNaN(page) || page < 1 || page > maxPages)
        throw new Error(`Invalid page number: ${part}`)
      range.push(page - 1)
    }
    ranges.push(range)
  }

  if (ranges.length === 0) throw new Error('No valid ranges provided')
  return ranges
}
