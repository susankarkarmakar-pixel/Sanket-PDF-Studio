import { useEffect, useState } from 'react'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { PDFViewer } from './components/PDFViewer'
import { ThumbnailViewer } from './components/ThumbnailViewer'
import { useAppStore } from './store'

function App() {
  const { loadSettings, setPdf } = useAppStore()
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    // Load settings
    loadSettings()
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
        useAppStore.getState().addRecentFile(fileData.path, file.name)
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

          {!useAppStore.getState().pdfData && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-800 p-8">
            <h1 className="text-4xl font-bold text-gray-400 mb-8">Sanket PDF Studio</h1>

            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-4 border-b border-gray-200 dark:border-gray-600 pb-2">Recent Files</h2>

              {useAppStore.getState().recentFiles.length === 0 ? (
                <p className="text-gray-500 italic py-4">No recent files. Open a PDF to begin.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {useAppStore.getState().recentFiles.map((file, i) => (
                    <button
                      key={i}
                      onClick={async () => {
                        const fileData = await window.api.readFile(file.path)
                        if (fileData) {
                          setPdf(fileData.path, fileData.data)
                          useAppStore.getState().addRecentFile(fileData.path, file.name)
                        } else {
                          alert('File not found.')
                          useAppStore.getState().removeRecentFile(file.path)
                        }
                      }}
                      className="w-full text-left px-4 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-600 flex justify-between items-center group transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-500"
                    >
                      <div className="truncate flex-1">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 truncate" title={file.path}>{file.path}</p>
                      </div>
                      <span className="text-xs text-gray-400 ml-4 hidden group-hover:block">
                        {new Date(file.lastOpened).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-center">
                 <button
                    onClick={async () => {
                      const file = await window.api.openFile()
                      if (file) {
                        setPdf(file.path, file.data)
                        useAppStore.getState().addRecentFile(file.path, file.path.split(/[\\/]/).pop() || 'Unknown')
                      }
                    }}
                    className="px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark font-medium shadow"
                 >
                   Open File...
                 </button>
              </div>
            </div>
          </div>

          )}
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
