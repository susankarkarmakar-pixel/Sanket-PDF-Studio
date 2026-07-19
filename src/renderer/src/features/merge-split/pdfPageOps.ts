import { PDFDocument } from 'pdf-lib'

// Merge multiple PDFs into one
export const mergePdfs = async (fileDatas: Uint8Array[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create()

  for (const data of fileDatas) {
    const pdf = await PDFDocument.load(data)
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    copiedPages.forEach((page) => mergedPdf.addPage(page))
  }

  return await mergedPdf.save()
}

// Split PDF by page ranges (e.g., '1-5, 6-10, 11-')
export const splitPdf = async (pdfData: Uint8Array, rangesString: string): Promise<Uint8Array[]> => {
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

// Rearrange PDF pages
export const rearrangePdf = async (pdfData: Uint8Array, newOrder: number[]): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const newPdf = await PDFDocument.create()

  // newOrder is 1-based, copyPages needs 0-based
  const indices = newOrder.map(page => page - 1)
  const copiedPages = await newPdf.copyPages(pdf, indices)
  copiedPages.forEach((page) => newPdf.addPage(page))

  return await newPdf.save()
}

// Extract specific pages
export const extractPages = async (pdfData: Uint8Array, pageNumbers: number[]): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const newPdf = await PDFDocument.create()

  // pageNumbers is 1-based, copyPages needs 0-based
  const indices = pageNumbers.map(page => page - 1).sort((a, b) => a - b)
  const copiedPages = await newPdf.copyPages(pdf, indices)
  copiedPages.forEach((page) => newPdf.addPage(page))

  return await newPdf.save()
}

// Helper to parse '1-5, 6-10, 11-' into arrays of 0-based indices
const parseRanges = (rangesString: string, maxPages: number): number[][] => {
  const ranges: number[][] = []
  const parts = rangesString.split(',').map(s => s.trim()).filter(s => s)

  for (const part of parts) {
    const range: number[] = []
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-')
      const start = parseInt(startStr, 10)
      const end = endStr ? parseInt(endStr, 10) : maxPages

      if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
        throw new Error(`Invalid range: ${part}`)
      }

      for (let i = start; i <= end; i++) {
        range.push(i - 1)
      }
    } else {
      const page = parseInt(part, 10)
      if (isNaN(page) || page < 1 || page > maxPages) {
        throw new Error(`Invalid page number: ${part}`)
      }
      range.push(page - 1)
    }
    ranges.push(range)
  }

  if (ranges.length === 0) {
      throw new Error('No valid ranges provided')
  }

  return ranges
}
