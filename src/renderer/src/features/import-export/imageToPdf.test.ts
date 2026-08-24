import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { imagesToPdf, type ImageInput } from './imageToPdf'

const pngData = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAE0lEQVR4nGPkCdjynwEKmBiQAAAvEAITxllFQAAAAABJRU5ErkJggg==',
    'base64'
  )
)
const jpegData = Uint8Array.from(
  Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAEAAUDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDCooor8KP7DP/Z',
    'base64'
  )
)

const input = (path: string, data: Uint8Array): ImageInput => ({ path, data })

const loadPages = async (data: Uint8Array) => PDFDocument.load(data)

describe('imagesToPdf', () => {
  it('rejects an empty image collection', async () => {
    await expect(imagesToPdf([])).rejects.toThrow('Select at least one image.')
  })

  it('converts a PNG into a valid single-page PDF with matching dimensions', async () => {
    const output = await imagesToPdf([input('blue.png', pngData)])
    const document = await loadPages(output)
    const page = document.getPage(0)

    expect(Buffer.from(output).subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(document.getPageCount()).toBe(1)
    expect(page.getWidth()).toBe(3)
    expect(page.getHeight()).toBe(2)
  })

  it('converts a JPEG into a valid single-page PDF with matching dimensions', async () => {
    const output = await imagesToPdf([input('photo.jpeg', jpegData)])
    const document = await loadPages(output)
    const page = document.getPage(0)

    expect(document.getPageCount()).toBe(1)
    expect(page.getWidth()).toBe(5)
    expect(page.getHeight()).toBe(4)
  })

  it('converts multiple images into pages in input order', async () => {
    const output = await imagesToPdf([
      input('first.png', pngData),
      input('second.jpg', jpegData),
      input('third.PNG', pngData)
    ])
    const document = await loadPages(output)

    expect(document.getPageCount()).toBe(3)
    expect(document.getPage(0).getWidth()).toBe(3)
    expect(document.getPage(0).getHeight()).toBe(2)
    expect(document.getPage(1).getWidth()).toBe(5)
    expect(document.getPage(1).getHeight()).toBe(4)
    expect(document.getPage(2).getWidth()).toBe(3)
    expect(document.getPage(2).getHeight()).toBe(2)
  })

  it('accepts JPEG and PNG extensions without regard to case', async () => {
    const output = await imagesToPdf([input('PHOTO.JpG', jpegData), input('IMAGE.PnG', pngData)])
    const document = await loadPages(output)

    expect(document.getPageCount()).toBe(2)
  })

  it('rejects unsupported image extensions before attempting to embed data', async () => {
    await expect(imagesToPdf([input('document.gif', pngData)])).rejects.toThrow(
      'Unsupported image format for document.gif. Use PNG or JPEG.'
    )
  })

  it('rejects an image with malformed bytes', async () => {
    await expect(imagesToPdf([input('broken.png', Uint8Array.from([1, 2, 3]))])).rejects.toThrow()
  })

  it('rejects a missing image extension', async () => {
    await expect(imagesToPdf([input('image', pngData)])).rejects.toThrow(
      'Unsupported image format for image. Use PNG or JPEG.'
    )
  })
})
