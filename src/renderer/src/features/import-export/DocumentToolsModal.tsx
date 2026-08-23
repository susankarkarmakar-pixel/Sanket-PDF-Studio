import { useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store'
import { useFeedbackStore } from '../../feedbackStore'
import {
  addPageNumbers,
  addWatermark,
  cropPages,
  normalizePageSize,
  type StandardPageSize
} from './pdfDocumentTools'

type DocumentOperation = 'watermark' | 'pageNumbers' | 'crop' | 'pageSize'

interface DocumentToolsModalProps {
  onClose: () => void
}

export function DocumentToolsModal({ onClose }: DocumentToolsModalProps): React.JSX.Element {
  const { pdfData, setPdf } = useAppStore()
  const { notify } = useFeedbackStore()
  const [operation, setOperation] = useState<DocumentOperation>('watermark')
  const [watermark, setWatermark] = useState('CONFIDENTIAL')
  const [margin, setMargin] = useState('24')
  const [pageSize, setPageSize] = useState<StandardPageSize>('A4')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApply = async (): Promise<void> => {
    if (!pdfData || isProcessing) return
    setIsProcessing(true)
    try {
      const updatedData =
        operation === 'watermark'
          ? await addWatermark(pdfData, watermark)
          : operation === 'pageNumbers'
            ? await addPageNumbers(pdfData)
            : operation === 'crop'
              ? await cropPages(pdfData, Number(margin))
              : await normalizePageSize(pdfData, pageSize)
      const savedPath = await window.api.saveFile(updatedData, `${operation}-document.pdf`)
      if (savedPath) {
        setPdf(savedPath, updatedData)
        useAppStore
          .getState()
          .addRecentFile(savedPath, savedPath.split(/[\\/]/).pop() || `${operation}-document.pdf`)
        notify('Document transformation saved successfully.', 'success')
        onClose()
      }
    } catch (error) {
      console.error(error)
      notify(error instanceof Error ? error.message : 'Unable to transform this PDF.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-tools-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="document-tools-title" className="text-lg font-semibold">
            Document Tools
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close document tools"
          >
            <X size={20} />
          </button>
        </div>
        <label className="mt-5 block text-sm">
          <span className="mb-1 block text-gray-600 dark:text-gray-300">Operation</span>
          <select
            value={operation}
            onChange={(event) => setOperation(event.target.value as DocumentOperation)}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
          >
            <option value="watermark">Add watermark</option>
            <option value="pageNumbers">Add page numbers</option>
            <option value="crop">Crop every page</option>
            <option value="pageSize">Normalize page size</option>
          </select>
        </label>
        {operation === 'watermark' && (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-gray-600 dark:text-gray-300">Watermark text</span>
            <input
              value={watermark}
              onChange={(event) => setWatermark(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
            />
          </label>
        )}
        {operation === 'crop' && (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-gray-600 dark:text-gray-300">
              Crop margin (PDF points)
            </span>
            <input
              type="number"
              min="0"
              value={margin}
              onChange={(event) => setMargin(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
            />
          </label>
        )}
        {operation === 'pageSize' && (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-gray-600 dark:text-gray-300">Page size</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value as StandardPageSize)}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </label>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessing || !pdfData}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Apply and Save As'}
          </button>
        </div>
      </div>
    </div>
  )
}
