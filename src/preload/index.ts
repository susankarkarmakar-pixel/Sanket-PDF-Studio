import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  EncryptPdfOptions,
  FileData,
  PdfSignatureVerification,
  SanketApi,
  SettingValue,
  SignPdfOptions,
  RuntimeCapabilities
} from './index.d'

const toFileData = (res: FileData | null): FileData | null => {
  if (!res) return null
  return { path: res.path, data: new Uint8Array(res.data) }
}

const api: SanketApi = {
  openFile: async () => toFileData(await ipcRenderer.invoke('dialog:openFile')),
  openFiles: async () => {
    const files = (await ipcRenderer.invoke('dialog:openFiles')) as FileData[]
    return files.map((file) => ({ path: file.path, data: new Uint8Array(file.data) }))
  },
  openImages: async () => {
    const files = (await ipcRenderer.invoke('dialog:openImages')) as FileData[]
    return files.map((file) => ({ path: file.path, data: new Uint8Array(file.data) }))
  },
  selectOutputDirectory: () =>
    ipcRenderer.invoke('dialog:selectOutputDirectory') as Promise<string | null>,
  readFile: async (filePath: string) =>
    toFileData(await ipcRenderer.invoke('fs:readFile', filePath)),
  saveFile: (data: Uint8Array, defaultPath?: string) =>
    ipcRenderer.invoke('dialog:saveFile', data, defaultPath) as Promise<string | null>,
  writeOutputFile: (data: Uint8Array, outputDirectory: string, fileName: string) =>
    ipcRenderer.invoke('fs:writeOutputFile', data, outputDirectory, fileName) as Promise<
      string | null
    >,
  optimizePdf: (data, options) =>
    ipcRenderer.invoke('batch:optimizePdf', data, options) as Promise<Uint8Array>,
  getRuntimeCapabilities: () =>
    ipcRenderer.invoke('runtime:getCapabilities') as Promise<RuntimeCapabilities>,
  print: () => ipcRenderer.invoke('print:pdf') as Promise<boolean>,
  signPdf: (data: Uint8Array, options: SignPdfOptions) =>
    ipcRenderer.invoke('security:signPdf', data, options) as Promise<Uint8Array>,
  encryptPdf: (data: Uint8Array, options: EncryptPdfOptions) =>
    ipcRenderer.invoke('security:encryptPdf', data, options) as Promise<Uint8Array>,
  hasSignature: (data: Uint8Array) =>
    ipcRenderer.invoke('security:hasSignature', data) as Promise<boolean>,
  verifySignature: (data: Uint8Array) =>
    ipcRenderer.invoke('security:verifySignature', data) as Promise<PdfSignatureVerification>,
  getSettings: () => ipcRenderer.invoke('settings:get') as Promise<Record<string, unknown>>,
  setSetting: (key: string, value: SettingValue) =>
    ipcRenderer.invoke('settings:set', key, value) as Promise<boolean>,
  onOpenFileFromOS: (callback: (path: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, path: string): void => callback(path)
    ipcRenderer.on('open-file-from-os', listener)
    return () => ipcRenderer.removeListener('open-file-from-os', listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
