import { PDFDocument } from 'pdf-lib'

export interface PdfMetadata {
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
}

export const readPdfMetadata = async (pdfData: Uint8Array): Promise<PdfMetadata> => {
  const pdf = await PDFDocument.load(pdfData)
  return {
    title: pdf.getTitle() ?? '',
    author: pdf.getAuthor() ?? '',
    subject: pdf.getSubject() ?? '',
    keywords: pdf.getKeywords() ?? '',
    creator: pdf.getCreator() ?? ''
  }
}

export const writePdfMetadata = async (
  pdfData: Uint8Array,
  metadata: PdfMetadata
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  pdf.setTitle(metadata.title.trim())
  pdf.setAuthor(metadata.author.trim())
  pdf.setSubject(metadata.subject.trim())
  pdf.setKeywords(
    metadata.keywords
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)
  )
  pdf.setCreator(metadata.creator.trim())
  return pdf.save()
}
