import { PDFDocument } from 'pdf-lib'

export interface ImageInput {
  path: string
  data: Uint8Array
}

export const imagesToPdf = async (images: ImageInput[]): Promise<Uint8Array> => {
  if (images.length === 0) throw new Error('Select at least one image.')
  const pdf = await PDFDocument.create()

  for (const image of images) {
    const extension = image.path.toLowerCase().split('.').pop()
    const embedded =
      extension === 'png' ? await pdf.embedPng(image.data) : await pdf.embedJpg(image.data)
    const page = pdf.addPage([embedded.width, embedded.height])
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
  }

  return pdf.save()
}
