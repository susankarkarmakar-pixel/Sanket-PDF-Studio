import { createWorker, type LoggerMessage } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { normalizeOcrLanguages } from './ocrLanguages'

interface OcrLine {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

interface OcrPageLayout {
  text: string
  lines?: OcrLine[]
}

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
  onProgress?: (progress: OcrProgress) => void,
  languages = 'eng'
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.load(pdfData)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice() })
  const pdfjsDocument = await loadingTask.promise
  const totalPages = pdfjsDocument.numPages
  const worker = await createWorker(normalizeOcrLanguages(languages), undefined, {
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
      const page = pdf.getPage(pageNumber - 1)
      const { height, width } = page.getSize()
      const ocrPage = result.data as unknown as OcrPageLayout
      const lines = ocrPage.lines ?? []
      if (lines.length > 0) {
        const xScale = width / canvas.width
        const yScale = height / canvas.height
        for (const line of lines) {
          const lineWidth = Math.max(1, line.bbox.x1 - line.bbox.x0) * xScale
          const lineHeight = Math.max(8, line.bbox.y1 - line.bbox.y0) * yScale
          page.drawText(line.text.trim(), {
            x: Math.max(0, Math.min(width - 4, line.bbox.x0 * xScale)),
            y: Math.max(4, height - line.bbox.y1 * yScale),
            font,
            size: Math.max(6, Math.min(24, lineHeight)),
            lineHeight,
            maxWidth: Math.max(8, Math.min(width - 8, lineWidth + 12)),
            color: rgb(1, 1, 1),
            opacity: 0.01
          })
        }
      } else if (ocrPage.text.trim()) {
        page.drawText(ocrPage.text.trim(), {
          x: 10,
          y: Math.max(10, height - 24),
          font,
          size: 8,
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
