import { createWorker, type LoggerMessage } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface OcrProgress {
  page: number
  totalPages: number
  progress: number
  status: string
}

const renderPage = async (
  pdfjsDocument: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<HTMLCanvasElement> => {
  const page = await pdfjsDocument.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to create an OCR canvas.')
  await page.render({ canvasContext: context, canvas, viewport }).promise
  return canvas
}

export const ocrPdf = async (
  pdfData: Uint8Array,
  onProgress?: (progress: OcrProgress) => void
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice() })
  const pdfjsDocument = await loadingTask.promise
  const totalPages = pdfjsDocument.numPages
  const worker = await createWorker('eng', undefined, {
    logger: (message: LoggerMessage) => {
      const page = Number(message.userJobId || 1)
      onProgress?.({
        page,
        totalPages,
        progress: Math.max(0, Math.min(1, message.progress)),
        status: message.status
      })
    }
  })

  try {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      onProgress?.({ page: pageNumber, totalPages, progress: 0, status: 'Rendering page' })
      const canvas = await renderPage(pdfjsDocument, pageNumber)
      const result = await worker.recognize(canvas, {}, undefined, String(pageNumber))
      const text = result.data.text.trim()
      if (text) {
        const page = pdf.getPage(pageNumber - 1)
        const { height, width } = page.getSize()
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
        page.drawText(lines.join('\n'), {
          x: 10,
          y: Math.max(10, height - 24),
          font,
          size: 8,
          lineHeight: 10,
          maxWidth: Math.max(20, width - 20),
          color: rgb(1, 1, 1),
          opacity: 0.01
        })
      }
      onProgress?.({ page: pageNumber, totalPages, progress: 1, status: 'Page complete' })
      canvas.width = 1
      canvas.height = 1
    }
  } finally {
    await worker.terminate()
    await loadingTask.destroy()
  }

  return pdf.save()
}
