import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  saveFile: (data: Uint8Array, defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', data, defaultPath),
  print: () => ipcRenderer.invoke('print:pdf'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value)
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
