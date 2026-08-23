import { degrees, PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib'

export type StandardPageSize = 'A4' | 'Letter' | 'Legal'

const getPageSize = (size: StandardPageSize): [number, number] => PageSizes[size]

export const addWatermark = async (pdfData: Uint8Array, text: string): Promise<Uint8Array> => {
  const value = text.trim()
  if (!value) throw new Error('Enter watermark text.')
  const pdf = await PDFDocument.load(pdfData)
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize()
    const fontSize = Math.max(18, Math.min(72, Math.min(width, height) / 8))
    const textWidth = font.widthOfTextAtSize(value, fontSize)
    page.drawText(value, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.4, 0.4, 0.4),
      opacity: 0.2,
      rotate: degrees(35)
    })
  }
  return pdf.save()
}

export const addPageNumbers = async (pdfData: Uint8Array): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  pdf.getPages().forEach((page, index) => {
    const { width } = page.getSize()
    const label = `${index + 1}`
    const textWidth = font.widthOfTextAtSize(label, 10)
    page.drawText(label, {
      x: (width - textWidth) / 2,
      y: 18,
      size: 10,
      font,
      color: rgb(0.25, 0.25, 0.25)
    })
  })
  return pdf.save()
}

export const cropPages = async (pdfData: Uint8Array, margin: number): Promise<Uint8Array> => {
  if (!Number.isFinite(margin) || margin < 0)
    throw new Error('Crop margin must be zero or greater.')
  const pdf = await PDFDocument.load(pdfData)
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize()
    if (margin * 2 >= width || margin * 2 >= height)
      throw new Error('Crop margin is too large for at least one page.')
    page.setCropBox(margin, margin, width - margin * 2, height - margin * 2)
  }
  return pdf.save()
}

export const normalizePageSize = async (
  pdfData: Uint8Array,
  size: StandardPageSize
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const [width, height] = getPageSize(size)
  for (const page of pdf.getPages()) page.setSize(width, height)
  return pdf.save()
}
