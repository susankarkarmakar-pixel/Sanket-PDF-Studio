import { app, shell, BrowserWindow, ipcMain, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs'
import { extname } from 'path'

const MAX_PDF_SIZE_BYTES = 250 * 1024 * 1024
const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg'])
const SETTINGS_KEYS = new Set(['theme', 'defaultZoom', 'recentFiles', 'savedSignatures'])

type FileData = { path: string; data: Uint8Array }

function readImageFile(filePath: string): FileData | null {
  try {
    if (!IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase())) return null
    const stats = fs.statSync(filePath)
    if (!stats.isFile() || stats.size > MAX_IMAGE_SIZE_BYTES) return null
    return { path: filePath, data: new Uint8Array(fs.readFileSync(filePath)) }
  } catch (error) {
    console.error('Failed to read image:', error)
    return null
  }
}

function readPdfFile(filePath: string): FileData | null {
  try {
    if (extname(filePath).toLowerCase() !== '.pdf') return null
    const stats = fs.statSync(filePath)
    if (!stats.isFile() || stats.size > MAX_PDF_SIZE_BYTES) return null
    const data = fs.readFileSync(filePath)
    return { path: filePath, data: new Uint8Array(data) }
  } catch (error) {
    console.error('Failed to read PDF:', error)
    return null
  }
}

// Polyfill for Map.prototype.getOrInsertComputed (required by pdfjs-dist 4.0+)
type MapWithGetOrInsertComputed = Map<unknown, unknown> & {
  getOrInsertComputed?: <T>(key: unknown, fallback: () => T) => T
}

const mapPrototype = Map.prototype as MapWithGetOrInsertComputed
if (!mapPrototype.getOrInsertComputed) {
  mapPrototype.getOrInsertComputed = function <T>(
    this: Map<unknown, T>,
    key: unknown,
    fallback: () => T
  ): T {
    if (this.has(key)) return this.get(key) as T
    const value = fallback()
    this.set(key, value)
    return value
  }
}

let fileToOpenOnStartup: string | null = null
if (process.argv.length >= 2) {
  const arg = process.argv[process.argv.length - 1]
  if (arg.toLowerCase().endsWith('.pdf')) {
    fileToOpenOnStartup = arg
  }
}

app.on('open-file', (event, path) => {
  event.preventDefault()
  if (app.isReady()) {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) {
      wins[0].webContents.send('open-file-from-os', path)
    }
  } else {
    fileToOpenOnStartup = path
  }
})

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
    if (fileToOpenOnStartup) {
      mainWindow.webContents.send('open-file-from-os', fileToOpenOnStartup)
      fileToOpenOnStartup = null
    }
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

    return readPdfFile(filePaths[0])
  })

  ipcMain.handle('dialog:openImages', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
    })
    if (canceled) return []
    return filePaths.map(readImageFile).filter((file): file is FileData => file !== null)
  })

  ipcMain.handle('dialog:openFiles', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    })

    if (canceled) return []
    return filePaths.map(readPdfFile).filter((file): file is FileData => file !== null)
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => readPdfFile(filePath))

  ipcMain.handle('dialog:saveFile', async (_, data: ArrayBuffer, defaultPath?: string) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: defaultPath || 'annotated.pdf',
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      })

      if (canceled || !filePath) return null

      const outputPath = extname(filePath).toLowerCase() === '.pdf' ? filePath : `${filePath}.pdf`
      fs.writeFileSync(outputPath, Buffer.from(data))
      return outputPath
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
        const settings = JSON.parse(data)
        return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {}
      }
    } catch (err) {
      console.error('Failed to read settings:', err)
    }
    return {}
  })

  ipcMain.handle('settings:set', async (_, key: string, value: unknown) => {
    try {
      if (!SETTINGS_KEYS.has(key)) return false

      let settings: Record<string, unknown> = {}
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf8')
        const parsed = JSON.parse(data)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          settings = parsed as Record<string, unknown>
        }
      }
      settings[key] = value
      const temporaryPath = `${settingsPath}.tmp`
      fs.writeFileSync(temporaryPath, JSON.stringify(settings, null, 2), 'utf8')
      fs.renameSync(temporaryPath, settingsPath)
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
