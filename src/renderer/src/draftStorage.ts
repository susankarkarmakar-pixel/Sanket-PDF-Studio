import type { Annotation } from './features/annotate/annotationStore'

export interface PdfDraft {
  pdfPath: string
  annotations: Annotation[]
  pageOrder: number[] | null
  savedAt: number
}

const draftKey = (pdfPath: string): string => `sanket-pdf-studio:draft:${pdfPath}`

export const savePdfDraft = (draft: PdfDraft): void => {
  try {
    localStorage.setItem(draftKey(draft.pdfPath), JSON.stringify(draft))
  } catch (error) {
    console.error('Unable to save PDF draft', error)
  }
}

export const readPdfDraft = (pdfPath: string): PdfDraft | null => {
  try {
    const raw = localStorage.getItem(draftKey(pdfPath))
    if (!raw) return null
    const draft = JSON.parse(raw) as PdfDraft
    if (!Array.isArray(draft.annotations)) return null
    return draft
  } catch (error) {
    console.error('Unable to read PDF draft', error)
    return null
  }
}

export const clearPdfDraft = (pdfPath: string): void => {
  try {
    localStorage.removeItem(draftKey(pdfPath))
  } catch (error) {
    console.error('Unable to clear PDF draft', error)
  }
}
