import { useState } from 'react'
import {
  Copy,
  CopyPlus,
  FilePlus2,
  Files,
  Loader2,
  RotateCw,
  Scissors,
  SquarePlus,
  Trash2
} from 'lucide-react'
import { MergeModal } from './MergeModal'
import { SplitModal } from './SplitModal'
import { useAppStore } from '../../store'
import {
  deletePages,
  duplicatePages,
  extractPages,
  insertBlankPages,
  insertPages,
  rearrangePdf,
  rotatePages
} from './pdfPageOps'

type PageOperation = (pdfData: Uint8Array) => Promise<Uint8Array>

export function PageToolsMenu(): React.JSX.Element {
  const [showMerge, setShowMerge] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const {
    pdfData,
    currentPage,
    numPages,
    selectedPagesForExtraction,
    clearSelectedPagesForExtraction,
    setPdf,
    pageOrder,
    setPageOrder
  } = useAppStore()

  const selectedPages =
    selectedPagesForExtraction.length > 0 ? selectedPagesForExtraction : [currentPage]

  const saveAndOpen = async (data: Uint8Array, defaultPath: string): Promise<void> => {
    const savedPath = await window.api.saveFile(data, defaultPath)
    if (!savedPath) return
    setPdf(savedPath, data)
    useAppStore.getState().addRecentFile(savedPath, savedPath.split(/[\\/]/).pop() || defaultPath)
    clearSelectedPagesForExtraction()
    setPageOrder(null)
  }

  const runPageOperation = async (operation: PageOperation, defaultPath: string): Promise<void> => {
    if (!pdfData || isProcessing) return
    setIsProcessing(true)
    try {
      await saveAndOpen(await operation(pdfData), defaultPath)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'The PDF operation failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (selectedPages.length >= numPages) {
      alert('A PDF must contain at least one page.')
      return
    }
    await runPageOperation((data) => deletePages(data, selectedPages), 'pages-deleted.pdf')
  }

  const handleRotate = async (): Promise<void> => {
    await runPageOperation((data) => rotatePages(data, selectedPages), 'pages-rotated.pdf')
  }

  const handleDuplicate = async (): Promise<void> => {
    await runPageOperation((data) => duplicatePages(data, selectedPages), 'pages-duplicated.pdf')
  }

  const handleInsertPdf = async (): Promise<void> => {
    if (!pdfData || isProcessing) return
    const sourceFile = await window.api.openFile()
    if (!sourceFile) return
    await runPageOperation(
      (data) => insertPages(data, sourceFile.data, Math.max(0, currentPage - 1)),
      'pages-inserted.pdf'
    )
  }

  const handleInsertBlank = async (): Promise<void> => {
    if (!pdfData || isProcessing) return
    const value = window.prompt(
      'How many blank A4 pages should be inserted before the current page?',
      '1'
    )
    if (value === null) return
    const count = Number(value)
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      alert('Enter a whole number between 1 and 100.')
      return
    }
    await runPageOperation(
      (data) => insertBlankPages(data, count, Math.max(0, currentPage - 1)),
      'blank-pages-inserted.pdf'
    )
  }

  const handleMergeSuccess = async (newPdfData: Uint8Array): Promise<void> => {
    setShowMerge(false)
    await saveAndOpen(newPdfData, 'merged-document.pdf')
  }

  const handleSplitSuccess = async (newPdfs: Uint8Array[]): Promise<void> => {
    setShowSplit(false)
    let successCount = 0
    for (let i = 0; i < newPdfs.length; i += 1) {
      const savedPath = await window.api.saveFile(newPdfs[i], `split-part-${i + 1}.pdf`)
      if (!savedPath) break
      successCount += 1
    }
    if (successCount > 0)
      alert(`Successfully split into ${successCount} file${successCount === 1 ? '' : 's'}.`)
  }

  const handleExtract = async (): Promise<void> => {
    if (!pdfData || selectedPagesForExtraction.length === 0) return
    await runPageOperation(
      (data) => extractPages(data, selectedPagesForExtraction),
      'extracted-pages.pdf'
    )
  }

  const handleApplyOrder = async (): Promise<void> => {
    if (!pdfData || !pageOrder) return
    await runPageOperation((data) => rearrangePdf(data, pageOrder), 'reordered-document.pdf')
  }

  const hasOrderChanged = pageOrder !== null
  const hasSelection = selectedPagesForExtraction.length > 0
  const buttonClass =
    'p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <>
      <div className="flex items-center gap-1 border-l border-gray-300 dark:border-gray-700 pl-2">
        <button
          onClick={() => setShowMerge(true)}
          className={buttonClass}
          title="Merge PDFs"
          aria-label="Merge PDFs"
        >
          <Files size={16} />
        </button>
        <button
          onClick={() => setShowSplit(true)}
          disabled={!pdfData || isProcessing}
          className={buttonClass}
          title="Split PDF"
          aria-label="Split PDF"
        >
          <Scissors size={16} />
        </button>
        <button
          onClick={handleInsertPdf}
          disabled={!pdfData || isProcessing}
          className={buttonClass}
          title="Insert PDF before current page"
          aria-label="Insert PDF"
        >
          <FilePlus2 size={16} />
        </button>
        <button
          onClick={handleInsertBlank}
          disabled={!pdfData || isProcessing}
          className={buttonClass}
          title="Insert blank A4 page"
          aria-label="Insert blank page"
        >
          <SquarePlus size={16} />
        </button>
        <button
          onClick={handleDelete}
          disabled={!pdfData || isProcessing}
          className={buttonClass}
          title="Delete selected/current page"
          aria-label="Delete pages"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={handleRotate}
          disabled={!pdfData || isProcessing}
          className={buttonClass}
          title="Rotate selected/current page"
          aria-label="Rotate pages"
        >
          <RotateCw size={16} />
        </button>
        <button
          onClick={handleDuplicate}
          disabled={!pdfData || isProcessing}
          className={buttonClass}
          title="Duplicate selected/current page"
          aria-label="Duplicate pages"
        >
          <Copy size={16} />
        </button>
        {isProcessing && (
          <Loader2 size={16} className="animate-spin text-primary" aria-label="Processing" />
        )}

        {hasSelection && (
          <button
            onClick={handleExtract}
            disabled={isProcessing}
            className="flex items-center gap-1 p-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded text-sm transition-colors font-semibold ml-2"
            title={`Extract ${selectedPagesForExtraction.length} pages`}
          >
            <CopyPlus size={16} />
            <span className="hidden xl:inline">Extract ({selectedPagesForExtraction.length})</span>
          </button>
        )}

        {hasOrderChanged && (
          <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded ml-2 text-sm">
            <span className="font-semibold">Order changed</span>
            <button
              onClick={handleApplyOrder}
              disabled={isProcessing}
              className="ml-2 hover:underline"
            >
              Save As
            </button>
            <button
              onClick={() => setPageOrder(null)}
              disabled={isProcessing}
              className="ml-2 text-red-500 hover:underline"
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {showMerge && (
        <MergeModal onClose={() => setShowMerge(false)} onSuccess={handleMergeSuccess} />
      )}
      {showSplit && (
        <SplitModal onClose={() => setShowSplit(false)} onSuccess={handleSplitSuccess} />
      )}
    </>
  )
}
