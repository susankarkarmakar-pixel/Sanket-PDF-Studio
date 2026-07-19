import { useState, useRef, useEffect } from 'react'
import { FileSignature, Plus, Trash2 } from 'lucide-react'
import { useSignatureStore } from './signatureStore'
import { SignatureModal } from './SignatureModal'

export function SignatureMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { savedSignatures, loadSignatures, deleteSignature } = useSignatureStore()

  useEffect(() => {
    loadSignatures()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Add Signature Image"
      >
        <FileSignature size={20} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-50 p-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Visual Signature Stamp</div>

          <div className="max-h-60 overflow-y-auto mb-2 space-y-2">
            {savedSignatures.length === 0 ? (
              <p className="text-sm text-gray-500 px-2 italic">No saved signatures.</p>
            ) : (
              savedSignatures.map(sig => (
                <div key={sig.id} className="relative group border border-gray-200 dark:border-gray-700 rounded p-1 hover:border-primary">
                  <div
                    className="w-full h-16 bg-white flex items-center justify-center cursor-grab"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('signature', sig.dataUrl)
                      setIsOpen(false)
                    }}
                    title="Drag to page"
                  >
                    <img src={sig.dataUrl} alt="Signature" className="max-w-full max-h-full object-contain pointer-events-none" />
                  </div>
                  <button
                    onClick={() => deleteSignature(sig.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete saved signature"
                  >
                    <Trash2 size={12} />
                  </button>
                  <p className="text-[10px] text-center text-gray-400 mt-1">Drag onto document</p>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => {
              setIsOpen(false)
              setShowModal(true)
            }}
            className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Create New Signature
          </button>
        </div>
      )}

      {showModal && <SignatureModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
