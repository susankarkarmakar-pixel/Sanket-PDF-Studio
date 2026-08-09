import { app, shell, BrowserWindow, ipcMain, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

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



let fileToOpenOnStartup: string | null = null;
if (process.argv.length >= 2) {
  const arg = process.argv[process.argv.length - 1];
  if (arg.toLowerCase().endsWith('.pdf')) {
    fileToOpenOnStartup = arg;
  }
}

app.on('open-file', (event, path) => {
  event.preventDefault();
  if (app.isReady()) {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      wins[0].webContents.send('open-file-from-os', path);
    }
  } else {
    fileToOpenOnStartup = path;
  }
});

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
      mainWindow.webContents.send('open-file-from-os', fileToOpenOnStartup);
      fileToOpenOnStartup = null;
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


  ipcMain.handle('pdf:flatten', async (_, pdfData: Uint8Array, annotations: any[], deletedPages: number[], pageOrder: number[], rotations: Record<number, number>, redactionImages: any[]) => {
    try {
      const pdfDoc = await PDFDocument.load(pdfData)
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

      const originalPageCount = pdfDoc.getPageCount()
      if (!pageOrder || pageOrder.length === 0) {
        pageOrder = Array.from({ length: originalPageCount }, (_, i) => i + 1)
      }

      const finalOrder = pageOrder.filter((p: number) => !deletedPages.includes(p))
      const newPdf = await PDFDocument.create()
      const indicesToCopy = finalOrder.map((p: number) => p - 1)
      const copiedPages = await newPdf.copyPages(pdfDoc, indicesToCopy)

      for (let i = 0; i < copiedPages.length; i++) {
        const page = copiedPages[i]
        newPdf.addPage(page)
        const originalPageNum = finalOrder[i]

        // Apply Redaction Image if present
        const redImg = (redactionImages || []).find(r => r.page === originalPageNum)
        if (redImg) {
           const base64Data = redImg.dataUrl.split(',')[1]
           const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
           const pdfImage = await newPdf.embedJpg(imageBytes)

           const { width, height } = page.getSize()
           const newPage = newPdf.insertPage(i + 1, [width, height])
           newPage.drawImage(pdfImage, { x: 0, y: 0, width, height })

           // Copy rotation
           newPage.setRotation(page.getRotation())
           newPdf.removePage(i)
        }

        // Apply rotations
        const addedRotation = rotations[originalPageNum] || 0
        if (addedRotation !== 0) {
          const actualPage = newPdf.getPages()[i]
          const current = actualPage.getRotation().angle
          actualPage.setRotation(degrees((current + addedRotation) % 360))
        }
      }

      const pages = newPdf.getPages()

      for (const ann of annotations) {
        if (ann.type === 'redact') continue // handled above

        const newPageIndex = finalOrder.indexOf(ann.page)
        if (newPageIndex === -1) continue

        const page = pages[newPageIndex]
        const { height, width } = page.getSize()
        const pageRotation = page.getRotation().angle

        const getPdfRgb = (hex: string) => {
          const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex)
          if (result) {
            return rgb(parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255)
          }
          return rgb(0, 0, 0)
        }

        const color = getPdfRgb(ann.color)

        // Transform coordinates for rotated pages
        // The React UI gives us (x, y) coordinates relative to the top-left of the rotated page view.
        // PDF-lib expects (x, y) relative to the bottom-left of the unrotated page.
        // We must map UI (x, y) back to PDF-lib space based on the rotation.

        const transformCoords = (uiX: number, uiY: number) => {
           let pdfX = uiX;
           let pdfY = uiY;

           if (pageRotation === 90) {
              pdfX = uiY;
              pdfY = width - uiX;
           } else if (pageRotation === 180) {
              pdfX = width - uiX;
              pdfY = height - uiY;
           } else if (pageRotation === 270) {
              pdfX = height - uiY;
              pdfY = uiX;
           }
           return { x: pdfX, y: height - pdfY } // Convert to bottom-left origin
        }

        if (ann.type === 'highlight') {
          for (const rect of ann.rects) {
            const { x, y } = transformCoords(rect.x, rect.y + rect.height) // Bottom-left of rect
            // Need to transform width/height too if rotated
            let w = rect.width, h = rect.height;
            if (pageRotation === 90 || pageRotation === 270) {
               w = rect.height; h = rect.width;
            }
            page.drawRectangle({ x, y, width: w, height: h, color, opacity: 0.3 })
          }
        } else if (ann.type === 'underline') {
          for (const rect of ann.rects) {
            const start = transformCoords(rect.x, rect.y + rect.height)
            const end = transformCoords(rect.x + rect.width, rect.y + rect.height)
            page.drawLine({ start, end, thickness: 2, color })
          }
        } else if (ann.type === 'draw') {
          if (ann.path.length < 2) continue
          const svgPath = ann.path.map((p: any, i: number) => {
             const pt = transformCoords(p.x, p.y)
             return `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`
          }).join(' ')
          page.drawSvgPath(svgPath, { borderColor: color, borderWidth: 2 })
        } else if (ann.type === 'text') {
          const pt = transformCoords(ann.x, ann.y)
          page.drawText(ann.text, { font: helveticaFont, x: pt.x, y: pt.y, size: 16, color })
        } else if (ann.type === 'sticky') {
          const pt = transformCoords(ann.x, ann.y)
          page.drawCircle({ x: pt.x, y: pt.y, size: 10, color })
          page.drawText('Note', { font: helveticaFont, x: pt.x + 15, y: pt.y - 5, size: 10, color: rgb(0,0,0) })
          if (ann.text) {
            page.drawText(ann.text, { font: helveticaFont, x: pt.x + 15, y: pt.y - 20, size: 12, color: rgb(0,0,0) })
          }
        } else if (ann.type === 'signature') {
          try {
             const base64Data = ann.dataUrl.split(',')[1]
             if (base64Data) {
               const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
               const pdfImage = await newPdf.embedPng(imageBytes)
               const pt = transformCoords(ann.x, ann.y + ann.height)
               let w = ann.width, h = ann.height;
               if (pageRotation === 90 || pageRotation === 270) {
                  w = ann.height; h = ann.width;
               }
               page.drawImage(pdfImage, { x: pt.x, y: pt.y, width: w, height: h })
             }
          } catch (e) {
             console.error('Signature embed fail', e)
          }
        }
      }

      return await newPdf.save()
    } catch (err) {
      console.error('Error flattening in main process:', err)
      throw err
    }
  })

  // Add the other IPC handlers to fully offload pdf-lib
  ipcMain.handle('pdf:merge', async (_, fileDatas: Uint8Array[]) => {
    const mergedPdf = await PDFDocument.create()
    for (const data of fileDatas) {
      const pdf = await PDFDocument.load(data)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => mergedPdf.addPage(page))
    }
    return await mergedPdf.save()
  })

  ipcMain.handle('pdf:split', async (_, pdfData: Uint8Array, rangesString: string) => {
    const pdf = await PDFDocument.load(pdfData)
    const numPages = pdf.getPageCount()

    // Helper inline
    const parseRanges = (rangesString: string, maxPages: number): number[][] => {
      const ranges: number[][] = []
      const parts = rangesString.split(',').map(s => s.trim()).filter(s => s)
      for (const part of parts) {
        const range: number[] = []
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-')
          const start = parseInt(startStr, 10)
          const end = endStr ? parseInt(endStr, 10) : maxPages
          if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) throw new Error(`Invalid range: ${part}`)
          for (let i = start; i <= end; i++) range.push(i - 1)
        } else {
          const page = parseInt(part, 10)
          if (isNaN(page) || page < 1 || page > maxPages) throw new Error(`Invalid page: ${part}`)
          range.push(page - 1)
        }
        ranges.push(range)
      }
      return ranges
    }

    const ranges = parseRanges(rangesString, numPages)
    const resultPdfs: Uint8Array[] = []
    for (const range of ranges) {
      const newPdf = await PDFDocument.create()
      const copiedPages = await newPdf.copyPages(pdf, range)
      copiedPages.forEach((page) => newPdf.addPage(page))
      resultPdfs.push(await newPdf.save())
    }
    return resultPdfs
  })

  ipcMain.handle('pdf:rearrange', async (_, pdfData: Uint8Array, newOrder: number[]) => {
    const pdf = await PDFDocument.load(pdfData)
    const newPdf = await PDFDocument.create()
    const indices = newOrder.map(page => page - 1)
    const copiedPages = await newPdf.copyPages(pdf, indices)
    copiedPages.forEach((page) => newPdf.addPage(page))
    return await newPdf.save()
  })

  ipcMain.handle('pdf:extract', async (_, pdfData: Uint8Array, pageNumbers: number[]) => {
    const pdf = await PDFDocument.load(pdfData)
    const newPdf = await PDFDocument.create()
    const indices = pageNumbers.map(page => page - 1).sort((a, b) => a - b)
    const copiedPages = await newPdf.copyPages(pdf, indices)
    copiedPages.forEach((page) => newPdf.addPage(page))
    return await newPdf.save()
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
