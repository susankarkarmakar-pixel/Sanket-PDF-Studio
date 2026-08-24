import { useAppStore } from '../store'
import {
  FolderOpen,
  Info,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize,
  Search,
  ChevronUp,
  ChevronDown,
  Command,
  GitCompareArrows,
  Printer,
  Save,
  Undo2,
  Redo2,
  ScanText,
  ShieldCheck,
  WandSparkles,
  Files
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { AnnotationToolbar } from '../features/annotate/AnnotationToolbar'
import { SignatureMenu } from '../features/signature/SignatureMenu'
import { SettingsModal } from './SettingsModal'
import { PageToolsMenu } from '../features/merge-split/PageToolsMenu'
import { useAnnotationStore } from '../features/annotate/annotationStore'
import { flattenAnnotations } from '../features/annotate/saveAnnotations'
import { useFeedbackStore } from '../feedbackStore'
import { AnnotationPropertiesPanel } from '../features/annotate/AnnotationPropertiesPanel'
import { clearPdfDraft } from '../draftStorage'
import { MetadataModal } from '../features/metadata/MetadataModal'
import { DocumentToolsModal } from '../features/import-export/DocumentToolsModal'
import { OcrModal } from '../features/ocr/OcrModal'
import { CompareModal } from '../features/comparison/CompareModal'
import { SecurityModal } from '../features/security/SecurityModal'
import { BatchProcessingModal } from '../features/batch/BatchProcessingModal'

export function Toolbar(): React.JSX.Element {
  const {
    theme,
    setPdf,
    pdfData,
    pdfPath,
    pageOrder,
    scale,
    setScale,
    currentPage,
    numPages,
    pageLabels,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    searchHighlightCurrent,
    searchHighlightTotal
  } = useAppStore()

  useEffect(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const { annotations, history, future, undo, redo } = useAnnotationStore()
  const { confirm, notify } = useFeedbackStore()
  const [isSaving, setIsSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [showDocumentTools, setShowDocumentTools] = useState(false)
  const [showOcr, setShowOcr] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [showSecurity, setShowSecurity] = useState(false)
  const [showBatchProcessing, setShowBatchProcessing] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const isEditing =
        target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      if (isEditing) return

      if (event.key.toLowerCase() === 'z' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (event.key.toLowerCase() === 'y' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        redo()
      } else if (
        numPages > 0 &&
        ['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp', 'Home', 'End', '+', '='].includes(
          event.key
        )
      ) {
        event.preventDefault()
        const nextPage =
          event.key === 'Home'
            ? 1
            : event.key === 'End'
              ? numPages
              : event.key === 'ArrowLeft' || event.key === 'PageUp'
                ? Math.max(1, currentPage - 1)
                : event.key === '+' || event.key === '='
                  ? currentPage
                  : Math.min(numPages, currentPage + 1)
        if (event.key === '+' || event.key === '=') {
          setScale((value) => (typeof value === 'number' ? Math.min(5, value + 0.25) : 1.25))
          return
        }
        setCurrentPage(nextPage)
        window.dispatchEvent(new CustomEvent('page-change-request', { detail: nextPage }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [redo, undo])

  const handleOpenFile = async (): Promise<void> => {
    if (
      (annotations.length > 0 || pageOrder !== null) &&
      !(await confirm('You have unsaved changes. Open another PDF and discard them?'))
    )
      return
    const file = await window.api.openFile()
    if (file) {
      setPdf(file.path, file.data)
      useAppStore.getState().addRecentFile(file.path, file.path.split(/[\\/]/).pop() || 'Unknown')
    }
  }

  return (
    <header className="h-14 glass flex items-center justify-between px-4 shrink-0 z-50 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Undo (Ctrl/Cmd+Z)"
          aria-label="Undo"
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={redo}
          disabled={future.length === 0}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Redo (Ctrl/Cmd+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={20} />
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Command palette (Ctrl/Cmd+K)"
          aria-label="Open command palette"
        >
          <Command size={20} />
        </button>
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
        <button
          onClick={async () => {
            if (!pdfData) return

            const hasRedactions = annotations.some((a) => a.type === 'redact')
            if (hasRedactions) {
              const proceed = await confirm(
                'This will permanently remove content in the marked areas from the redacted page(s). This cannot be undone once saved. Continue?',
                'Confirm permanent redaction'
              )
              if (!proceed) return
            }

            setIsSaving(true)
            try {
              const newPdfData = await flattenAnnotations(pdfData, annotations)
              const sourceName = pdfPath
                ?.split(/[\\/]/)
                .pop()
                ?.replace(/\.pdf$/i, '')
              const defaultPath = sourceName ? `${sourceName}-edited.pdf` : 'annotated-document.pdf'
              const savedPath = await window.api.saveFile(newPdfData, defaultPath)
              if (savedPath) {
                if (pdfPath) clearPdfDraft(pdfPath)
                setPdf(savedPath, newPdfData)
                useAppStore
                  .getState()
                  .addRecentFile(savedPath, savedPath.split(/[\\/]/).pop() || 'Edited PDF')
              }
            } catch (err) {
              console.error(err)
              notify('Failed to save the PDF. Please try again.', 'error')
            } finally {
              setIsSaving(false)
            }
          }}
          disabled={!pdfData || isSaving}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          title="Save Annotations (Save As)"
        >
          <Save size={20} />
        </button>
        <AnnotationToolbar />
        <PageToolsMenu />
        <SignatureMenu />
        <AnnotationPropertiesPanel />
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
            {pageLabels?.[currentPage - 1] && (
              <span className="text-xs text-gray-500">({pageLabels[currentPage - 1]})</span>
            )}
          </div>
        )}

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setScale((s) => (typeof s === 'number' ? Math.max(0.25, s - 0.25) : 0.75))
            }
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="w-12 text-center text-sm">
            {typeof scale === 'number'
              ? `${Math.round(scale * 100)}%`
              : scale === 'page-width'
                ? 'Width'
                : 'Fit'}
          </span>
          <button
            onClick={() =>
              setScale((s) => (typeof s === 'number' ? Math.min(5.0, s + 0.25) : 1.25))
            }
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => {
              setScale((s) => (s === 1.0 ? 'page-width' : 1.0))
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
                window.dispatchEvent(
                  new CustomEvent('pdf-search', {
                    detail: { query: searchQuery, type: 'next' }
                  })
                )
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
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('pdf-search', { detail: { query: searchQuery, type: 'prev' } })
              )
            }
            className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('pdf-search', { detail: { query: searchQuery, type: 'next' } })
              )
            }
            className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        <button
          onClick={() => setShowBatchProcessing(true)}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Batch conversion and optimization"
          aria-label="Open batch conversion and optimization"
        >
          <Files size={20} />
        </button>
        <button
          onClick={() => setShowSecurity(true)}
          disabled={!pdfData}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40"
          title="Sign or encrypt PDF"
          aria-label="Sign or encrypt PDF"
        >
          <ShieldCheck size={20} />
        </button>
        <button
          onClick={() => setShowCompare(true)}
          disabled={!pdfData}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40"
          title="Compare with another PDF"
          aria-label="Compare with another PDF"
        >
          <GitCompareArrows size={20} />
        </button>
        <button
          onClick={() => setShowOcr(true)}
          disabled={!pdfData}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40"
          title="Create searchable PDF with OCR"
          aria-label="Create searchable PDF with OCR"
        >
          <ScanText size={20} />
        </button>
        <button
          onClick={() => setShowDocumentTools(true)}
          disabled={!pdfData}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40"
          title="Document tools"
          aria-label="Open document tools"
        >
          <WandSparkles size={20} />
        </button>
        <button
          onClick={() => setShowMetadata(true)}
          disabled={!pdfData}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-40"
          title="Edit PDF metadata"
          aria-label="Edit PDF metadata"
        >
          <Info size={20} />
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {showMetadata && <MetadataModal onClose={() => setShowMetadata(false)} />}
        {showDocumentTools && <DocumentToolsModal onClose={() => setShowDocumentTools(false)} />}
        {showOcr && <OcrModal onClose={() => setShowOcr(false)} />}
        {showCompare && <CompareModal onClose={() => setShowCompare(false)} />}
        {showSecurity && <SecurityModal onClose={() => setShowSecurity(false)} />}
        {showBatchProcessing && (
          <BatchProcessingModal onClose={() => setShowBatchProcessing(false)} />
        )}
      </div>
    </header>
  )
}
