import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import {
  Annotation,
  HighlightAnnotation,
  DrawAnnotation,
  TextAnnotation,
  StickyAnnotation,
  SignatureAnnotation,
  RedactAnnotation,
  ShapeAnnotation
} from './annotationStore'
import * as pdfjsLib from 'pdfjs-dist'

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
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaObliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  const pages = pdfDoc.getPages()

  // --- REDACTION LOGIC ---
  const redactionAnns = annotations.filter((a): a is RedactAnnotation => a.type === 'redact')

  if (redactionAnns.length > 0) {
    const pagesWithRedactions = new Set(redactionAnns.map((a) => a.page))

    // We need to render pages via pdfjs to get images, then wipe and replace the page in pdf-lib
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() })
    const pdfjsDoc = await loadingTask.promise

    for (const pageNum of pagesWithRedactions) {
      const pageIndex = pageNum - 1
      if (pageIndex < 0 || pageIndex >= pages.length) continue

      const pdfjsPage = await pdfjsDoc.getPage(pageNum)

      // Calculate high-res viewport for good print quality (e.g. 2.0 or 3.0 scale)
      const scale = 2.0
      const viewport = pdfjsPage.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) continue

      // Render the page onto the canvas
      await pdfjsPage.render({
        canvasContext: ctx,
        canvas: canvas,
        viewport: viewport
      }).promise

      // Draw black boxes over redacted areas
      const pageRedactions = redactionAnns.filter((a) => a.page === pageNum)
      ctx.fillStyle = '#000000'
      for (const ann of pageRedactions) {
        for (const rect of ann.rects) {
          ctx.fillRect(rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale)
        }
      }

      // Convert canvas to image
      // JPEG is faster and smaller for full-page documents than PNG
      const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95)
      const base64Data = imgDataUrl.split(',')[1]
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

      const pdfImage = await pdfDoc.embedJpg(imageBytes)

      const page = pages[pageIndex]
      const { width, height } = page.getSize()

      // The critical part of redaction:
      // Instead of drawing the image *over* the content, we must replace the page content stream,
      // or at least clear all existing operators. Since pdf-lib doesn't easily expose "clear page",
      // the safest way to ensure no vector text remains is to replace the page entirely.

      const newPage = pdfDoc.insertPage(pageIndex + 1, [width, height])
      newPage.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width,
        height
      })

      // Remove the original page
      pdfDoc.removePage(pageIndex)

      // Update the pages array reference for subsequent non-redaction annotations
      pages[pageIndex] = newPage
    }
  }
  // --- END REDACTION LOGIC ---

  for (const ann of annotations) {
    if (ann.type === 'redact') continue // handled above

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

      const svgPath = dAnn.path
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${height - p.y}`)
        .join(' ')
      page.drawSvgPath(svgPath, {
        borderColor: color,
        borderWidth: 2
      })
    } else if (
      ann.type === 'rectangle' ||
      ann.type === 'ellipse' ||
      ann.type === 'line' ||
      ann.type === 'arrow'
    ) {
      const shape = ann as ShapeAnnotation
      const topY = height - shape.y
      if (ann.type === 'rectangle') {
        page.drawRectangle({
          x: shape.x,
          y: height - shape.y - shape.height,
          width: shape.width,
          height: shape.height,
          borderColor: color,
          borderWidth: 2
        })
      } else if (ann.type === 'ellipse') {
        page.drawEllipse({
          x: shape.x + shape.width / 2,
          y: topY - shape.height / 2,
          xScale: Math.abs(shape.width) / 2,
          yScale: Math.abs(shape.height) / 2,
          borderColor: color,
          borderWidth: 2
        })
      } else {
        page.drawLine({
          start: { x: shape.x, y: topY },
          end: { x: shape.x + shape.width, y: topY - shape.height },
          thickness: 2,
          color
        })
      }
    } else if (ann.type === 'text') {
      const tAnn = ann as TextAnnotation
      const textFont =
        tAnn.fontWeight === 'bold'
          ? helveticaBoldFont
          : tAnn.fontStyle === 'italic'
            ? helveticaObliqueFont
            : helveticaFont
      page.drawText(tAnn.text, {
        font: textFont,
        x: tAnn.x,
        y: height - tAnn.y,
        size: tAnn.fontSize ?? 16,
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
        color: rgb(0, 0, 0)
      })
      if (sAnn.text) {
        page.drawText(sAnn.text, {
          font: helveticaFont,
          x: sAnn.x + 15,
          y: height - sAnn.y - 20,
          size: 12,
          color: rgb(0, 0, 0)
        })
      }
    } else if (ann.type === 'signature') {
      const sigAnn = ann as SignatureAnnotation
      try {
        // Determine image format (assume PNG due to UI constraints, but handle error)
        const imgDataUrl = sigAnn.dataUrl
        const base64Data = imgDataUrl.split(',')[1]
        if (base64Data) {
          const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
          // For now assume PNG since UI only accepts PNG / outputs PNG from canvas
          const pdfImage = await pdfDoc.embedPng(imageBytes)

          page.drawImage(pdfImage, {
            x: sigAnn.x,
            // Account for the height to correctly map top-left visual to bottom-left PDF coordinates
            y: height - sigAnn.y - sigAnn.height,
            width: sigAnn.width,
            height: sigAnn.height
          })
        }
      } catch (err) {
        console.error('Failed to embed signature image', err)
      }
    }
  }

  return await pdfDoc.save()
}
