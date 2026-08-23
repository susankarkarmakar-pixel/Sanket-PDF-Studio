import { useState } from 'react'
import { GitCompareArrows, X } from 'lucide-react'
import { useAppStore } from '../../store'
import { useFeedbackStore } from '../../feedbackStore'
import { comparePdfs, type PdfComparisonResult } from './comparePdf'

interface CompareModalProps {
  onClose: () => void
}

export function CompareModal({ onClose }: CompareModalProps): React.JSX.Element {
  const { pdfData, pdfPath } = useAppStore()
  const { notify } = useFeedbackStore()
  const [result, setResult] = useState<PdfComparisonResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ page: 0, total: 0 })

  const handleCompare = async (): Promise<void> => {
    if (!pdfData || isProcessing) return
    const secondFile = await window.api.openFile()
    if (!secondFile || secondFile.path === pdfPath) return
    setIsProcessing(true)
    setResult(null)
    try {
      setResult(
        await comparePdfs(pdfData, secondFile.data, (page, total) => setProgress({ page, total }))
      )
    } catch (error) {
      console.error(error)
      notify(error instanceof Error ? error.message : 'Unable to compare these PDFs.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="compare-title" className="flex items-center gap-2 text-lg font-semibold">
            <GitCompareArrows size={20} /> Compare PDFs
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close compare dialog"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Choose another PDF to compare with the currently open document. Comparison checks
          extracted text and a low-resolution visual render for each page.
        </p>
        <button
          type="button"
          onClick={() => void handleCompare()}
          disabled={isProcessing || !pdfData}
          className="mt-5 self-start rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isProcessing
            ? `Comparing page ${progress.page} of ${progress.total}...`
            : 'Choose PDF and compare'}
        </button>
        {result && (
          <div className="mt-5 min-h-0 overflow-auto">
            <div className="mb-3 rounded-lg bg-primary/10 p-3 text-sm">
              <strong>{result.changedPages}</strong> of <strong>{result.pages.length}</strong> pages
              differ by text or visual content.
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-2 py-2">Page</th>
                  <th className="px-2 py-2">Text</th>
                  <th className="px-2 py-2">Visual difference</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.pages.map((page) => {
                  const changed = page.textChanged || page.visualDifference > 0.02
                  return (
                    <tr key={page.page} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-2">{page.page}</td>
                      <td className="px-2 py-2">{page.textChanged ? 'Changed' : 'Same'}</td>
                      <td className="px-2 py-2">{Math.round(page.visualDifference * 100)}%</td>
                      <td
                        className={`px-2 py-2 font-medium ${changed ? 'text-orange-600' : 'text-green-600'}`}
                      >
                        {changed ? 'Different' : 'Same'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
