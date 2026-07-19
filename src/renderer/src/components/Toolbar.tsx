import { useAppStore } from '../store'
import { FolderOpen, Moon, Sun, ZoomIn, ZoomOut, Maximize, Search, ChevronUp, ChevronDown, Printer } from 'lucide-react'
import { useEffect } from 'react'

export function Toolbar() {
  const {
    isDarkMode,
    setDarkMode,
    setPdf,
    scale,
    setScale,
    currentPage,
    numPages,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    searchHighlightCurrent,
    searchHighlightTotal
  } = useAppStore()

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const handleOpenFile = async () => {
    const file = await window.api.openFile()
    if (file) {
      setPdf(file.path, file.data)
    }
  }

  return (
    <header className="h-14 bg-[var(--color-panel-light)] dark:bg-[var(--color-panel-dark)] border-b border-gray-300 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.api.print()}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Print"
        >
          <Printer size={20} />
        </button>
        <button
          onClick={handleOpenFile}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Open File"
        >
          <FolderOpen size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {numPages > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (val >= 1 && val <= numPages) {
                  setCurrentPage(val)
                  // Dispatch custom event to scroll main view
                  window.dispatchEvent(new CustomEvent('page-change-request', { detail: val }))
                }
              }}
              className="w-12 px-1 text-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
            />
            <span>of {numPages}</span>
          </div>
        )}

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => typeof s === 'number' ? Math.max(0.25, s - 0.25) : 0.75)}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="w-12 text-center text-sm">{typeof scale === 'number' ? `${Math.round(scale * 100)}%` : (scale === 'page-width' ? 'Width' : 'Fit')}</span>
          <button
            onClick={() => setScale((s) => typeof s === 'number' ? Math.min(5.0, s + 0.25) : 1.25)}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => {
              setScale((s) => s === 1.0 ? 'page-width' : 1.0)
            }}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded ml-1"
            title="Fit Width/Page"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 border border-gray-300 dark:border-gray-600 focus-within:border-primary">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            placeholder="Find in document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                window.dispatchEvent(new CustomEvent('pdf-search', {
                  detail: { query: searchQuery, type: 'next' }
                }))
              }
            }}
            className="bg-transparent border-none outline-none text-sm w-40 px-1"
          />
          {searchHighlightTotal > 0 && (
            <span className="text-xs text-gray-500 min-w-[40px] text-center">
              {searchHighlightCurrent} / {searchHighlightTotal}
            </span>
          )}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('pdf-search', { detail: { query: searchQuery, type: 'prev' } }))}
            className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('pdf-search', { detail: { query: searchQuery, type: 'next' } }))}
            className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        <button
          onClick={() => setDarkMode(!isDarkMode)}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  )
}
