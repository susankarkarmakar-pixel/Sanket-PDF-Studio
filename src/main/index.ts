import { app, shell, BrowserWindow, ipcMain, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'

// Polyfill for Map.prototype.getOrInsertComputed (required by pdfjs-dist 4.0+)
if (!(Map.prototype as any).getOrInsertComputed) {
  (Map.prototype as any).getOrInsertComputed = function (key: any, fallback: () => any) {
    if (this.has(key)) return this.get(key);
    const value = fallback();
    this.set(key, value);
    return value;
  };
}


function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.sanket.pdfstudio')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.webContents.toggleDevTools()
  })


  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    })

    if (canceled || filePaths.length === 0) {
      return null
    }

    try {
      const filePath = filePaths[0]
      const data = fs.readFileSync(filePath)
      return { path: filePath, data: new Uint8Array(data) }
    } catch (err) {
      console.error('Failed to read file:', err)
      return null
    }
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
     try {
       const data = fs.readFileSync(filePath)
       return { path: filePath, data: new Uint8Array(data) }
     } catch (err) {
       console.error('Failed to read file:', err)
       return null
     }
  })

  ipcMain.handle('dialog:saveFile', async (_, data: ArrayBuffer, defaultPath?: string) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: defaultPath || 'annotated.pdf',
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      })

      if (canceled || !filePath) return null

      fs.writeFileSync(filePath, Buffer.from(data))
      return filePath
    } catch (err) {
      console.error('Failed to save file:', err)
      return null
    }
  })

  ipcMain.handle('print:pdf', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) {
        window.webContents.print({ silent: false, printBackground: true })
        return true
      }
      return false
    } catch (err) {
      console.error('Print failed', err)
      return false
    }
  })

  const settingsPath = join(app.getPath('userData'), 'settings.json')

  ipcMain.handle('settings:get', async () => {
    try {
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf8')
        return JSON.parse(data)
      }
    } catch (err) {
      console.error('Failed to read settings:', err)
    }
    return {}
  })

  ipcMain.handle('settings:set', async (_, key: string, value: any) => {
    try {
      let settings: Record<string, any> = {}
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf8')
        settings = JSON.parse(data)
      }
      settings[key] = value
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
      return true
    } catch (err) {
      console.error('Failed to save settings:', err)
      return false
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})


app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
