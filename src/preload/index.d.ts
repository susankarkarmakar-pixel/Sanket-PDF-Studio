import { ElectronAPI } from '@electron-toolkit/preload'

export interface FileData {
  path: string
  data: Uint8Array
}

export interface RecentFile {
  path: string
  name: string
  lastOpened: number
}

export type SettingValue = string | number | RecentFile[] | { id: string; dataUrl: string }[]

export interface SanketApi {
  openFile: () => Promise<FileData | null>
  openFiles: () => Promise<FileData[]>
  readFile: (filePath: string) => Promise<FileData | null>
  saveFile: (data: Uint8Array, defaultPath?: string) => Promise<string | null>
  print: () => Promise<boolean>
  getSettings: () => Promise<Record<string, unknown>>
  setSetting: (key: string, value: SettingValue) => Promise<boolean>
  onOpenFileFromOS: (callback: (path: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: SanketApi
  }
}
