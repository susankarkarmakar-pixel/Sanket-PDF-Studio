import { useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store'
import { useFeedbackStore } from '../../feedbackStore'
import { ocrPdf, type OcrProgress } from './ocrPdf'
import { OCR_LANGUAGE_PACKS, normalizeOcrLanguages } from './ocrLanguages'

interface OcrModalProps {
  onClose: () => void
}

export function OcrModal({ onClose }: OcrModalProps): React.JSX.Element {
  const { pdfData, setPdf, ocrLanguages, setOcrLanguages } = useAppStore()
  const { notify } = useFeedbackStore()
  const [progress, setProgress] = useState<OcrProgress | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    normalizeOcrLanguages(ocrLanguages).split('+')
  )

  const handleOcr = async (): Promise<void> => {
    if (!pdfData || isProcessing) return
    setIsProcessing(true)
    try {
      const languages = normalizeOcrLanguages(selectedLanguages.join('+'))
      setOcrLanguages(languages)
      const output = await ocrPdf(pdfData, setProgress, languages)
      const savedPath = await window.api.saveFile(output, 'searchable-document.pdf')
      if (savedPath) {
        setPdf(savedPath, output)
        useAppStore
          .getState()
          .addRecentFile(savedPath, savedPath.split(/[\\/]/).pop() || 'searchable-document.pdf')
        notify('Searchable PDF created successfully.', 'success')
        onClose()
      }
    } catch (error) {
      console.error(error)
      notify(error instanceof Error ? error.message : 'OCR failed for this PDF.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const percent = progress ? Math.round(progress.progress * 100) : 0

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocr-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="ocr-title" className="text-lg font-semibold">
            Create searchable PDF
          </h2>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
            aria-label="Close OCR dialog"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          OCR renders each page locally and adds an invisible searchable text layer. The original
          visual content is preserved. Select every language that may appear in the document.
        </p>
        <fieldset className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <legend className="px-1 text-sm font-medium">Language packs</legend>
          <div className="grid grid-cols-2 gap-2">
            {OCR_LANGUAGE_PACKS.map((pack) => (
              <label key={pack.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedLanguages.includes(pack.code)}
                  disabled={isProcessing}
                  onChange={(event) =>
                    setSelectedLanguages((current) =>
                      event.target.checked
                        ? [...new Set([...current, pack.code])]
                        : current.filter((code) => code !== pack.code)
                    )
                  }
                  className="accent-primary"
                />
                <span>{pack.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Selected packs: {normalizeOcrLanguages(selectedLanguages.join('+'))}
          </p>
        </fieldset>
        {progress && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Page {progress.page} of {progress.totalPages}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
              <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500">{progress.status}</p>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing || !pdfData}
            onClick={() => void handleOcr()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isProcessing ? 'Running OCR...' : 'Run OCR and Save As'}
          </button>
        </div>
      </div>
    </div>
  )
}
