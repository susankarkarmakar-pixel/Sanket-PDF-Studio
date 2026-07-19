import { useState } from 'react'
import { splitPdf } from './pdfPageOps'
import { X } from 'lucide-react'
import { useAppStore } from '../../store'

interface SplitModalProps {
  onClose: () => void
  onSuccess: (newPdfs: Uint8Array[]) => void
}

export function SplitModal({ onClose, onSuccess }: SplitModalProps) {
  const { pdfData, numPages } = useAppStore()
  const [rangesString, setRangesString] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSplit = async () => {
    if (!pdfData) return
    setError(null)
    setIsProcessing(true)

    try {
      const resultPdfs = await splitPdf(pdfData, rangesString)
      onSuccess(resultPdfs)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to split PDF. Check your ranges.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-panel-light)] dark:bg-[var(--color-panel-dark)] rounded-lg shadow-xl p-6 w-[400px] max-w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Split PDF</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X size={20}/></button>
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-2 text-gray-600 dark:text-gray-300">
            Enter page ranges separated by commas.<br/>
            E.g., <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">1-5, 6-10, 11-</code>
          </label>
          <input
            type="text"
            value={rangesString}
            onChange={e => setRangesString(e.target.value)}
            placeholder="1-5, 6-10"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent focus:border-primary outline-none"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">Total pages in document: {numPages}</p>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">Cancel</button>
          <button
            onClick={handleSplit}
            disabled={!rangesString.trim() || isProcessing}
            className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded disabled:opacity-50"
          >
            {isProcessing ? 'Splitting...' : 'Split & Save As'}
          </button>
        </div>
      </div>
    </div>
  )
}
