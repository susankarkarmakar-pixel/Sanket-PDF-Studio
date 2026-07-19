import { useState } from 'react'
import { Files, Scissors, CopyPlus } from 'lucide-react'
import { MergeModal } from './MergeModal'
import { SplitModal } from './SplitModal'
import { useAppStore } from '../../store'
import { extractPages, rearrangePdf } from './pdfPageOps'

export function PageToolsMenu() {
  const [showMerge, setShowMerge] = useState(false)
  const [showSplit, setShowSplit] = useState(false)

  const { pdfData, selectedPagesForExtraction, clearSelectedPagesForExtraction, setPdf, pageOrder, setPageOrder } = useAppStore()

  const handleMergeSuccess = async (newPdfData: Uint8Array) => {
    setShowMerge(false)
    const savedPath = await window.api.saveFile(newPdfData, 'merged-document.pdf')
    if (savedPath) {
      if (confirm(`Merged successfully and saved to ${savedPath}.\nDo you want to open the new file?`)) {
         const fileData = await window.api.readFile(savedPath)
         if (fileData) setPdf(fileData.path, fileData.data)
      }
    }
  }

  const handleSplitSuccess = async (newPdfs: Uint8Array[]) => {
    setShowSplit(false)
    // We ideally want a directory picker here, but for simplicity we'll just save them sequentially with a prefix

    if (newPdfs.length > 0) {
      const firstSave = await window.api.saveFile(newPdfs[0], `split-part-1.pdf`)
      if (!firstSave) return // User cancelled

    }

    let successCount = 0
    for (let i = 0; i < newPdfs.length; i++) {
        // We already prompted for the first one, for subsequent ones we'd ideally not prompt if we had a dir picker.
        // But since we only have saveFile which prompts, we will prompt for each.
        // Real app should add a 'showOpenDialog' with properties: ['openDirectory'] for output dir selection.
        const savedPath = await window.api.saveFile(newPdfs[i], `split-part-${i+1}.pdf`)
        if (savedPath) successCount++
    }

    alert(`Successfully split into ${successCount} files.`)
  }

  const handleExtract = async () => {
    if (!pdfData || selectedPagesForExtraction.length === 0) return
    try {
      const extractedData = await extractPages(pdfData, selectedPagesForExtraction)
      const savedPath = await window.api.saveFile(extractedData, 'extracted-pages.pdf')
      if (savedPath) {
        clearSelectedPagesForExtraction()
        if (confirm(`Extracted successfully and saved to ${savedPath}.\nDo you want to open the new file?`)) {
           const fileData = await window.api.readFile(savedPath)
           if (fileData) setPdf(fileData.path, fileData.data)
        }
      }
    } catch (err) {
      console.error(err)
      alert("Extraction failed.")
    }
  }

  const handleApplyOrder = async () => {
     if (!pdfData || !pageOrder) return
     try {
       const reorderedData = await rearrangePdf(pdfData, pageOrder)
       const savedPath = await window.api.saveFile(reorderedData, 'reordered-document.pdf')
       if (savedPath) {
         setPageOrder(null)
         if (confirm(`Reordered successfully and saved to ${savedPath}.\nDo you want to open the new file?`)) {
            const fileData = await window.api.readFile(savedPath)
            if (fileData) setPdf(fileData.path, fileData.data)
         }
       }
     } catch (err) {
       console.error(err)
       alert("Reorder failed.")
     }
  }

  const hasOrderChanged = pageOrder !== null
  const hasSelection = selectedPagesForExtraction.length > 0

  return (
    <>
      <div className="flex items-center gap-1 border-l border-gray-300 dark:border-gray-700 pl-2">
        <button
          onClick={() => setShowMerge(true)}
          className="flex items-center gap-1 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm transition-colors"
          title="Merge PDFs"
        >
          <Files size={16} /> <span className="hidden xl:inline">Merge</span>
        </button>
        <button
          onClick={() => setShowSplit(true)}
          disabled={!pdfData}
          className="flex items-center gap-1 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-50"
          title="Split PDF"
        >
          <Scissors size={16} /> <span className="hidden xl:inline">Split</span>
        </button>

        {hasSelection && (
          <button
            onClick={handleExtract}
            className="flex items-center gap-1 p-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded text-sm transition-colors font-semibold ml-2"
            title={`Extract ${selectedPagesForExtraction.length} pages`}
          >
            <CopyPlus size={16} /> <span className="hidden xl:inline">Extract ({selectedPagesForExtraction.length})</span>
          </button>
        )}

        {hasOrderChanged && (
           <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded ml-2 text-sm">
             <span className="font-semibold">Order changed</span>
             <button onClick={handleApplyOrder} className="ml-2 hover:underline">Save As</button>
             <button onClick={() => setPageOrder(null)} className="ml-2 text-red-500 hover:underline">Discard</button>
           </div>
        )}
      </div>

      {showMerge && <MergeModal onClose={() => setShowMerge(false)} onSuccess={handleMergeSuccess} />}
      {showSplit && <SplitModal onClose={() => setShowSplit(false)} onSuccess={handleSplitSuccess} />}
    </>
  )
}
