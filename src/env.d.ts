/// <reference types="vite/client" />

interface Window {
  api: {
    openFile: () => Promise<{ path: string, data: Uint8Array } | null>
    readFile: (filePath: string) => Promise<{ path: string, data: Uint8Array } | null>
    saveFile: (data: Uint8Array, defaultPath?: string) => Promise<string | null>
    print: () => Promise<void>
    getSettings: () => Promise<any>
    setSetting: (key: string, value: any) => Promise<void>
    onOpenFileFromOS?: (callback: (path: string) => void) => void

    flattenPdf: (pdfData: Uint8Array, annotations: any[], deletedPages: number[], pageOrder: number[], rotations: Record<number, number>, redactionImages: any[]) => Promise<Uint8Array>
    mergePdfs: (fileDatas: Uint8Array[]) => Promise<Uint8Array>
    splitPdf: (pdfData: Uint8Array, rangesString: string) => Promise<Uint8Array[]>
    rearrangePdf: (pdfData: Uint8Array, newOrder: number[]) => Promise<Uint8Array>
    extractPages: (pdfData: Uint8Array, pageNumbers: number[]) => Promise<Uint8Array>
  }
}
