import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openFile: async () => {
    const res = await ipcRenderer.invoke('dialog:openFile')
    if (res) {
      res.data = new Uint8Array(res.data)
    }
    return res
  },
  readFile: async (filePath: string) => {
    const res = await ipcRenderer.invoke('fs:readFile', filePath)
    if (res) {
      res.data = new Uint8Array(res.data)
    }
    return res
  },
  saveFile: (data: Uint8Array, defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', data, defaultPath),
  print: () => ipcRenderer.invoke('print:pdf'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
  onOpenFileFromOS: (callback: (path: string) => void) => {
    ipcRenderer.on('open-file-from-os', (_, path) => callback(path))
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
