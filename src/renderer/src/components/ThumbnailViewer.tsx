import { useEffect, useState, memo, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useAppStore } from '../store'

export function ThumbnailViewer() {
  const { pdfData, numPages, currentPage, selectedPagesForExtraction, togglePageSelection, pageOrder, setPageOrder } = useAppStore()
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const itemHeight = 220

  const visibleItemCount = Math.ceil(window.innerHeight / itemHeight) + 4
  const visibleEndIndex = Math.min(numPages, visibleStartIndex + visibleItemCount)
  const actualPageOrder = pageOrder || Array.from({ length: numPages }, (_, i) => i + 1)
  const visiblePages = actualPageOrder.slice(visibleStartIndex, visibleEndIndex)

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx)
  }

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return
    const newOrder = [...actualPageOrder]
    const [moved] = newOrder.splice(draggedIdx, 1)
    newOrder.splice(targetIdx, 0, moved)
    setPageOrder(newOrder)
    setDraggedIdx(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2)
      setVisibleStartIndex(startIndex)
    }
  }

  useEffect(() => {
    if (!pdfData) return
    let isMounted = true

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfData })
        const doc = await loadingTask.promise
        if (isMounted) setPdfDoc(doc)
      } catch (err) {
        console.error('Thumbnail PDF loading error', err)
      }
    }
    loadPdf()
    return () => { isMounted = false }
  }, [pdfData])

  useEffect(() => {
    if (containerRef.current && currentPage) {
      const currentScroll = containerRef.current.scrollTop
      const targetScroll = (currentPage - 1) * itemHeight
      if (targetScroll < currentScroll || targetScroll > currentScroll + window.innerHeight) {
        containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' })
      }
    }
  }, [currentPage])

  if (!pdfDoc || numPages === 0) return null

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full h-full p-2 overflow-y-auto overflow-x-hidden"
    >
      <div style={{ height: numPages * itemHeight, position: 'relative' }}>
        {visiblePages.map((pageNum, i) => (
          <div
            key={`${pageNum}-${i}`}
            draggable
            onDragStart={() => handleDragStart(visibleStartIndex + i)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(visibleStartIndex + i)}
            style={{
              position: 'absolute',
              top: (visibleStartIndex + i) * itemHeight,
              left: 0,
              width: '100%',
              height: itemHeight
            }}
          >
            <Thumbnail
              pageNum={pageNum}
              index={pageNum - 1}
              pdfDoc={pdfDoc}
              isActive={pageNum === currentPage}
              isSelected={selectedPagesForExtraction.includes(pageNum)}
              onSelect={(multi) => togglePageSelection(pageNum, multi)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const Thumbnail = memo(({
  pageNum,
  pdfDoc,
  isActive,
  isSelected,
  onSelect
}: {
  pageNum: number
  index: number
  pdfDoc: pdfjsLib.PDFDocumentProxy
  isActive: boolean
  isSelected?: boolean
  onSelect?: (multi: boolean) => void
}) => {
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!canvasRef || !pdfDoc) return
    let isMounted = true
    let renderTask: pdfjsLib.RenderTask | null = null

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum)
        if (!isMounted) return
        const viewport = page.getViewport({ scale: 0.2 })
        const canvas = canvasRef
        const context = canvas.getContext('2d')
        if (!context) return
        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          canvas: canvas,
          viewport: viewport
        }
        renderTask = page.render(renderContext)
        await renderTask.promise
      } catch (err) {
        if ((err as any).name !== 'RenderingCancelledException') {
          console.error(`Error rendering thumbnail page ${pageNum}`, err)
        }
      }
    }
    renderPage()
    return () => {
      isMounted = false
      if (renderTask) renderTask.cancel()
    }
  }, [canvasRef, pdfDoc, pageNum])

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      if (onSelect) onSelect(true)
    } else {
      if (onSelect) onSelect(false)
      window.dispatchEvent(new CustomEvent('page-change-request', { detail: pageNum }))
    }
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 cursor-pointer p-2 mx-2 rounded-lg transition-colors h-[200px] ${
        isSelected ? "bg-primary/20 ring-2 ring-primary" : isActive ? 'bg-gray-200 dark:bg-gray-700 ring-2 ring-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      onClick={handleClick}
    >
      <div className="flex-1 flex items-center justify-center min-h-0 w-full overflow-hidden">
        <canvas
          ref={setCanvasRef}
          className="shadow-sm rounded border border-gray-300 dark:border-gray-600 bg-white max-h-full max-w-full object-contain"
        />
      </div>
      <span className="text-xs text-gray-500 mt-1">{pageNum}</span>
    </div>
  )
})

Thumbnail.displayName = 'Thumbnail'
