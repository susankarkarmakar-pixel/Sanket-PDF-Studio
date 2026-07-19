import { useState } from 'react'

import { mergePdfs } from './pdfPageOps'
import { X, ArrowUp, ArrowDown } from 'lucide-react'

interface MergeModalProps {
  onClose: () => void
  onSuccess: (newPdfData: Uint8Array) => void
}

export function MergeModal({ onClose, onSuccess }: MergeModalProps) {
  const [files, setFiles] = useState<{ path: string, data: Uint8Array, name: string }[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAddFiles = async () => {
    const file = await window.api.openFile() // Ideally this should be a multi-select IPC, but we'll adapt.
    // For this implementation, since our IPC openFile only supports single selection (unless modified),
    // we'll just allow adding them one by one to the list for now.
    if (file) {
      setFiles(prev => [...prev, {
        path: file.path,
        data: file.data,
        name: file.path.split(/[/\\]/).pop() || 'Unknown'
      }])
    }
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newFiles = [...files]
    const temp = newFiles[index - 1]
    newFiles[index - 1] = newFiles[index]
    newFiles[index] = temp
    setFiles(newFiles)
  }

  const handleMoveDown = (index: number) => {
    if (index === files.length - 1) return
    const newFiles = [...files]
    const temp = newFiles[index + 1]
    newFiles[index + 1] = newFiles[index]
    newFiles[index] = temp
    setFiles(newFiles)
  }

  const handleRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('Please add at least 2 files to merge.')
      return
    }

    setIsProcessing(true)
    try {
      const mergedData = await mergePdfs(files.map(f => f.data))
      onSuccess(mergedData)
    } catch (err) {
      console.error(err)
      alert('Failed to merge files.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-panel-light)] dark:bg-[var(--color-panel-dark)] rounded-lg shadow-xl p-6 w-[500px] max-w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Merge PDFs</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X size={20}/></button>
        </div>

        <div className="mb-4 max-h-[300px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-2">
          {files.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No files added yet.</p>
          ) : (
            files.map((file, i) => (
              <div key={`${file.path}-${i}`} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded group">
                <span className="truncate flex-1 mr-2" title={file.name}>{file.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleMoveUp(i)} disabled={i===0} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded disabled:opacity-30"><ArrowUp size={16}/></button>
                  <button onClick={() => handleMoveDown(i)} disabled={i===files.length-1} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded disabled:opacity-30"><ArrowDown size={16}/></button>
                  <button onClick={() => handleRemove(i)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"><X size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={handleAddFiles}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
          >
            Add File
          </button>

          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">Cancel</button>
            <button
              onClick={handleMerge}
              disabled={files.length < 2 || isProcessing}
              className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded disabled:opacity-50"
            >
              {isProcessing ? 'Merging...' : 'Merge & Save As'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
