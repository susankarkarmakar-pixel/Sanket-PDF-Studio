// Main process offloaded PDF operations
export const mergePdfs = async (fileDatas: Uint8Array[]): Promise<Uint8Array> => {
  return await window.api.mergePdfs(fileDatas)
}

export const splitPdf = async (pdfData: Uint8Array, rangesString: string): Promise<Uint8Array[]> => {
  return await window.api.splitPdf(pdfData, rangesString)
}

export const rearrangePdf = async (pdfData: Uint8Array, newOrder: number[]): Promise<Uint8Array> => {
  return await window.api.rearrangePdf(pdfData, newOrder)
}

export const extractPages = async (pdfData: Uint8Array, pageNumbers: number[]): Promise<Uint8Array> => {
  return await window.api.extractPages(pdfData, pageNumbers)
}
