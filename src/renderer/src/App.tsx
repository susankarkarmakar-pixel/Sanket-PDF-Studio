import { useEffect, useState } from 'react'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { PDFViewer } from './components/PDFViewer'
import { ThumbnailViewer } from './components/ThumbnailViewer'
import { useAppStore } from './store'

function App() {
  const { setDarkMode, setPdf } = useAppStore()
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    // Load settings
    window.api.getSettings().then((settings) => {
      if (settings.isDarkMode !== undefined) {
        setDarkMode(settings.isDarkMode)
      }
    })
  }, [])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      const fileData = await window.api.readFile((file as any).path)
      if (fileData) {
        setPdf(fileData.path, fileData.data)
      }
    }
  }

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Toolbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar>
          <ThumbnailViewer />
        </Sidebar>
        <main className="flex-1 overflow-hidden relative bg-gray-200 dark:bg-gray-800">
          <PDFViewer />
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Open a PDF to begin
          </div>
        </main>
      </div>
      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-primary border-dashed m-4 rounded-xl">
          <p className="text-3xl font-bold text-primary dark:text-white drop-shadow-md">Drop PDF Here</p>
        </div>
      )}
    </div>
  )
}

export default App
