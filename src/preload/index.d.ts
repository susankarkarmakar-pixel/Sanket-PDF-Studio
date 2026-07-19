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
    }
  }
}
