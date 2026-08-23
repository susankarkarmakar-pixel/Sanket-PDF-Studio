import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { FileData, SanketApi, SettingValue } from './index.d'

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
  readFile: async (filePath: string) =>
    toFileData(await ipcRenderer.invoke('fs:readFile', filePath)),
  saveFile: (data: Uint8Array, defaultPath?: string) =>
    ipcRenderer.invoke('dialog:saveFile', data, defaultPath) as Promise<string | null>,
  print: () => ipcRenderer.invoke('print:pdf') as Promise<boolean>,
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
