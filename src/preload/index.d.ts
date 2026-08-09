import { ElectronAPI } from '@electron-toolkit/preload'

export interface FileData {
  path: string
  data: Uint8Array
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<FileData | null>
      readFile: (filePath: string) => Promise<FileData | null>
      saveFile: (data: Uint8Array, defaultPath?: string) => Promise<string | null>
      print: () => Promise<boolean>
      getSettings: () => Promise<Record<string, any>>
      setSetting: (key: string, value: any) => Promise<boolean>
      onOpenFileFromOS?: (callback: (path: string) => void) => void

      flattenPdf: (pdfData: Uint8Array, annotations: any[], deletedPages: number[], pageOrder: number[], rotations: Record<number, number>, redactionImages: any[]) => Promise<Uint8Array>
      mergePdfs: (fileDatas: Uint8Array[]) => Promise<Uint8Array>
      splitPdf: (pdfData: Uint8Array, rangesString: string) => Promise<Uint8Array[]>
      rearrangePdf: (pdfData: Uint8Array, newOrder: number[]) => Promise<Uint8Array>
      extractPages: (pdfData: Uint8Array, pageNumbers: number[]) => Promise<Uint8Array>
    }
  }
}
