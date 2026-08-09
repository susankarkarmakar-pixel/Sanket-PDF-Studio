import { useAppStore } from '../../store'
import { Annotation, RedactAnnotation } from './annotationStore'
import * as pdfjsLib from 'pdfjs-dist'

export const flattenAnnotations = async (
  pdfBytes: Uint8Array,
  annotations: Annotation[]
): Promise<Uint8Array> => {
  const store = useAppStore.getState()
  const deletedPages = store.deletedPages
  let pageOrder = store.pageOrder
  const rotations = store.pageRotations

  let finalOrder = pageOrder
  if (!finalOrder || finalOrder.length === 0) {
    const numPages = store.numPages || 1;
    finalOrder = Array.from({ length: numPages }, (_, i) => i + 1)
  }

  const redactionAnns = annotations.filter((a): a is RedactAnnotation => a.type === 'redact')
  let redactionImages: any[] = []

  if (redactionAnns.length > 0) {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() })
    const pdfjsDoc = await loadingTask.promise

    for (const pageNum of finalOrder) {
      if (deletedPages.includes(pageNum)) continue;

      const pageRedactions = redactionAnns.filter(a => a.page === pageNum)
      if (pageRedactions.length > 0) {
        const pdfjsPage = await pdfjsDoc.getPage(pageNum)
        const scale = 2.0
        const viewport = pdfjsPage.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        await pdfjsPage.render({ canvasContext: ctx, canvas, viewport }).promise

        ctx.fillStyle = '#000000'
        for (const ann of pageRedactions) {
          for (const rect of ann.rects) {
            ctx.fillRect(rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale)
          }
        }

        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95)
        redactionImages.push({
          page: pageNum,
          dataUrl: imgDataUrl,
          width: viewport.width / scale,
          height: viewport.height / scale
        })
      }
    }
  }

  const newPdfBytes = await window.api.flattenPdf(
    pdfBytes,
    annotations,
    deletedPages,
    finalOrder,
    rotations,
    redactionImages
  )

  return newPdfBytes
}
