import { useState, useRef, useEffect } from 'react'
import { X, Upload, Eraser } from 'lucide-react'
import { useSignatureStore } from './signatureStore'

interface SignatureModalProps {
  onClose: () => void
}

export function SignatureModal({ onClose }: SignatureModalProps) {
  const [tab, setTab] = useState<'draw' | 'upload'>('draw')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const { addSignature } = useSignatureStore()

  // Setup drawing canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || tab !== 'draw') return

    // Set internal resolution higher for better quality
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(2, 2)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
    }
  }, [tab])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      const { x, y } = getCoordinates(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      const { x, y } = getCoordinates(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const handleSaveDraw = () => {
    const canvas = canvasRef.current
    if (canvas) {
      // Check if canvas is empty (simplified check)
      const ctx = canvas.getContext('2d')
      const pixels = ctx?.getImageData(0, 0, canvas.width, canvas.height).data
      const hasContent = pixels?.some((channel, i) => i % 4 === 3 && channel > 0)

      if (!hasContent) {
        alert("Please draw a signature first.")
        return
      }

      const dataUrl = canvas.toDataURL('image/png')
      addSignature(dataUrl)
      onClose()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        addSignature(dataUrl)
        onClose()
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-panel-light)] dark:bg-[var(--color-panel-dark)] rounded-lg shadow-xl p-6 w-[500px] max-w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Signature Image</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X size={20}/></button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          This creates a visual signature stamp to place on the document. It is not a legally-binding cryptographic digital signature.
        </p>

        <div className="flex border-b border-gray-300 dark:border-gray-700 mb-4">
          <button
            className={`px-4 py-2 font-medium ${tab === 'draw' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setTab('draw')}
          >
            Draw
          </button>
          <button
            className={`px-4 py-2 font-medium ${tab === 'upload' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setTab('upload')}
          >
            Upload
          </button>
        </div>

        {tab === 'draw' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-300 rounded overflow-hidden relative">
              <canvas
                ref={canvasRef}
                className="w-full h-[200px] touch-none cursor-crosshair"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              />
              <button
                onClick={clearCanvas}
                className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded shadow-sm text-xs flex items-center gap-1"
              >
                <Eraser size={14} /> Clear
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">Cancel</button>
              <button onClick={handleSaveDraw} className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded">Save Signature</button>
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center text-center h-[200px]">
              <Upload size={32} className="text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">Upload a transparent PNG</p>
              <label className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded cursor-pointer">
                Browse Files
                <input
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
