import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../../store'
import { useFeedbackStore } from '../../feedbackStore'
import { readPdfMetadata, writePdfMetadata, type PdfMetadata } from './pdfMetadata'

interface MetadataModalProps {
  onClose: () => void
}

const EMPTY_METADATA: PdfMetadata = {
  title: '',
  author: '',
  subject: '',
  keywords: '',
  creator: ''
}

export function MetadataModal({ onClose }: MetadataModalProps): React.JSX.Element {
  const { pdfData, setPdf } = useAppStore()
  const { notify } = useFeedbackStore()
  const [metadata, setMetadata] = useState<PdfMetadata>(EMPTY_METADATA)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!pdfData) return
    readPdfMetadata(pdfData)
      .then(setMetadata)
      .catch(() => notify('Unable to read this PDF metadata.', 'error'))
      .finally(() => setIsLoading(false))
  }, [notify, pdfData])

  const updateField = (field: keyof PdfMetadata, value: string): void => {
    setMetadata((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async (): Promise<void> => {
    if (!pdfData || isSaving) return
    setIsSaving(true)
    try {
      const updatedData = await writePdfMetadata(pdfData, metadata)
      const savedPath = await window.api.saveFile(updatedData, 'metadata-updated.pdf')
      if (savedPath) {
        setPdf(savedPath, updatedData)
        useAppStore
          .getState()
          .addRecentFile(savedPath, savedPath.split(/[\\/]/).pop() || 'metadata-updated.pdf')
        notify('PDF metadata saved successfully.', 'success')
        onClose()
      }
    } catch (error) {
      console.error(error)
      notify(error instanceof Error ? error.message : 'Unable to save PDF metadata.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const fields: { key: keyof PdfMetadata; label: string; placeholder: string }[] = [
    { key: 'title', label: 'Title', placeholder: 'Document title' },
    { key: 'author', label: 'Author', placeholder: 'Author name' },
    { key: 'subject', label: 'Subject', placeholder: 'Document subject' },
    { key: 'keywords', label: 'Keywords', placeholder: 'Comma-separated keywords' },
    { key: 'creator', label: 'Creator', placeholder: 'Creating application' }
  ]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="metadata-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="metadata-title" className="text-lg font-semibold">
            PDF Metadata
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close metadata editor"
          >
            <X size={20} />
          </button>
        </div>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-500">Reading metadata...</p>
        ) : (
          <div className="mt-5 space-y-3">
            {fields.map((field) => (
              <label key={field.key} className="block text-sm">
                <span className="mb-1 block text-gray-600 dark:text-gray-300">{field.label}</span>
                <input
                  value={metadata[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-gray-600"
                />
              </label>
            ))}
          </div>
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
            onClick={handleSave}
            disabled={isLoading || isSaving || !pdfData}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save As'}
          </button>
        </div>
      </div>
    </div>
  )
}
