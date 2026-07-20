import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Annotation, HighlightAnnotation, DrawAnnotation, TextAnnotation, StickyAnnotation, SignatureAnnotation } from './annotationStore'

// Helper to convert #rrggbb to pdf-lib rgb
const getPdfRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return rgb(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    )
  }
  return rgb(0, 0, 0)
}

export const flattenAnnotations = async (
  pdfBytes: Uint8Array,
  annotations: Annotation[]
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const ann of annotations) {
    // Page index is 0-based in pdf-lib, but our page numbers are 1-based
    const pageIndex = ann.page - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { height } = page.getSize()

    const color = getPdfRgb(ann.color)

    if (ann.type === 'highlight' || ann.type === 'underline') {
      const hAnn = ann as HighlightAnnotation
      for (const rect of hAnn.rects) {
        if (ann.type === 'highlight') {
          page.drawRectangle({
            x: rect.x,
            y: height - rect.y - rect.height, // PDF coordinate system is bottom-left
            width: rect.width,
            height: rect.height,
            color: color,
            opacity: 0.3
          })
        } else if (ann.type === 'underline') {
          page.drawLine({
            start: { x: rect.x, y: height - (rect.y + rect.height) },
            end: { x: rect.x + rect.width, y: height - (rect.y + rect.height) },
            thickness: 2,
            color: color
          })
        }
      }
    } else if (ann.type === 'draw') {
      const dAnn = ann as DrawAnnotation
      if (dAnn.path.length < 2) continue

      const svgPath = dAnn.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${height - p.y}`).join(' ')
      page.drawSvgPath(svgPath, {
        borderColor: color,
        borderWidth: 2,
      })
    } else if (ann.type === 'text') {
      const tAnn = ann as TextAnnotation
      page.drawText(tAnn.text, {
        font: helveticaFont,
        x: tAnn.x,
        y: height - tAnn.y,
        size: 16,
        color: color
      })
    } else if (ann.type === 'sticky') {
       const sAnn = ann as StickyAnnotation
       // Draw a simple sticky note marker
       page.drawCircle({
         x: sAnn.x,
         y: height - sAnn.y,
         size: 10,
         color: color
       })
       page.drawText('Note', {
         font: helveticaFont,
         x: sAnn.x + 15,
         y: height - sAnn.y - 5,
         size: 10,
         color: rgb(0,0,0)
       })
       if (sAnn.text) {
         page.drawText(sAnn.text, {
           font: helveticaFont,
           x: sAnn.x + 15,
           y: height - sAnn.y - 20,
           size: 12,
           color: rgb(0,0,0)
         })
       }

    } else if (ann.type === 'signature') {
       const sigAnn = ann as SignatureAnnotation
       try {
         // Determine image format (assume PNG due to UI constraints, but handle error)
         const imgDataUrl = sigAnn.dataUrl
         const base64Data = imgDataUrl.split(',')[1]
         if (base64Data) {
           const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
           // For now assume PNG since UI only accepts PNG / outputs PNG from canvas
           const pdfImage = await pdfDoc.embedPng(imageBytes)

           page.drawImage(pdfImage, {
             x: sigAnn.x,
             // Account for the height to correctly map top-left visual to bottom-left PDF coordinates
             y: height - sigAnn.y - sigAnn.height,
             width: sigAnn.width,
             height: sigAnn.height,
           })
         }
       } catch (err) {
         console.error('Failed to embed signature image', err)
       }
    }
  }

  return await pdfDoc.save()
}
