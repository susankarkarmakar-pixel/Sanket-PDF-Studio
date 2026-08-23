import * as pdfjsLib from 'pdfjs-dist'

export interface PageComparison {
  page: number
  firstExists: boolean
  secondExists: boolean
  textChanged: boolean
  visualDifference: number
}

export interface PdfComparisonResult {
  pages: PageComparison[]
  changedPages: number
}

const getPageText = async (
  document: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<string> => {
  const page = await document.getPage(pageNumber)
  const content = await page.getTextContent()
  return content.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const renderPage = async (
  pdfjsDocument: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<ImageData> => {
  const page = await pdfjsDocument.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 0.35 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(viewport.width))
  canvas.height = Math.max(1, Math.ceil(viewport.height))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Unable to create a comparison canvas.')
  await page.render({ canvasContext: context, canvas, viewport }).promise
  return context.getImageData(0, 0, canvas.width, canvas.height)
}

const compareImages = (first: ImageData, second: ImageData): number => {
  const width = Math.max(first.width, second.width)
  const height = Math.max(first.height, second.height)
  let changed = 0
  let total = width * height
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const firstIndex = (y * first.width + x) * 4
      const secondIndex = (y * second.width + x) * 4
      const firstAlpha = x < first.width && y < first.height ? first.data[firstIndex + 3] : 0
      const secondAlpha = x < second.width && y < second.height ? second.data[secondIndex + 3] : 0
      const difference =
        Math.abs((first.data[firstIndex] ?? 0) - (second.data[secondIndex] ?? 0)) +
        Math.abs((first.data[firstIndex + 1] ?? 0) - (second.data[secondIndex + 1] ?? 0)) +
        Math.abs((first.data[firstIndex + 2] ?? 0) - (second.data[secondIndex + 2] ?? 0)) +
        Math.abs(firstAlpha - secondAlpha)
      if (difference > 40) changed += 1
    }
  }
  total = Math.max(1, total)
  return changed / total
}

export const comparePdfs = async (
  firstData: Uint8Array,
  secondData: Uint8Array,
  onProgress?: (page: number, totalPages: number) => void
): Promise<PdfComparisonResult> => {
  const firstTask = pdfjsLib.getDocument({ data: firstData.slice() })
  const secondTask = pdfjsLib.getDocument({ data: secondData.slice() })
  const [first, second] = await Promise.all([firstTask.promise, secondTask.promise])
  const totalPages = Math.max(first.numPages, second.numPages)
  const pages: PageComparison[] = []
  try {
    for (let page = 1; page <= totalPages; page += 1) {
      onProgress?.(page, totalPages)
      const firstExists = page <= first.numPages
      const secondExists = page <= second.numPages
      const textChanged =
        firstExists !== secondExists ||
        (firstExists &&
          secondExists &&
          (await getPageText(first, page)) !== (await getPageText(second, page)))
      const visualDifference =
        firstExists && secondExists
          ? compareImages(await renderPage(first, page), await renderPage(second, page))
          : 1
      pages.push({ page, firstExists, secondExists, textChanged, visualDifference })
    }
    return {
      pages,
      changedPages: pages.filter((item) => item.textChanged || item.visualDifference > 0.02).length
    }
  } finally {
    await firstTask.destroy()
    await secondTask.destroy()
  }
}
