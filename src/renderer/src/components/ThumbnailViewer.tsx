import { useEffect, useState, memo, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useAppStore } from '../store'

export function ThumbnailViewer() {
  const { pdfData, numPages, currentPage } = useAppStore()
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)

  // Create a virtualized container
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const itemHeight = 220

  // Render slightly more items than visible to prevent blank space while scrolling
  const visibleItemCount = Math.ceil(window.innerHeight / itemHeight) + 4
  const visibleEndIndex = Math.min(numPages, visibleStartIndex + visibleItemCount)
  const visiblePages = Array.from(
    { length: visibleEndIndex - visibleStartIndex },
    (_, i) => visibleStartIndex + i + 1
  )

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2) // Render 2 items above viewport
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
        if (isMounted) {
          setPdfDoc(doc)
        }
      } catch (err) {
        console.error('Thumbnail PDF loading error', err)
      }
    }

    loadPdf()

    return () => {
      isMounted = false
    }
  }, [pdfData])

  useEffect(() => {
    if (containerRef.current && currentPage) {
      // Basic auto-scroll to current page when selected outside
      const currentScroll = containerRef.current.scrollTop
      const targetScroll = (currentPage - 1) * itemHeight

      // Only scroll if item is out of view
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
        {visiblePages.map((pageNum) => (
          <div
            key={pageNum}
            style={{
              position: 'absolute',
              top: (pageNum - 1) * itemHeight,
              left: 0,
              width: '100%',
              height: itemHeight
            }}
          >
            <Thumbnail
              pageNum={pageNum}
              pdfDoc={pdfDoc}
              isActive={pageNum === currentPage}
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
  isActive
}: {
  pageNum: number
  pdfDoc: pdfjsLib.PDFDocumentProxy
  isActive: boolean
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

        const viewport = page.getViewport({ scale: 0.2 }) // Small scale for thumbnail
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
      if (renderTask) {
        renderTask.cancel()
      }
    }
  }, [canvasRef, pdfDoc, pageNum])

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('page-change-request', { detail: pageNum }))
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 cursor-pointer p-2 mx-2 rounded-lg transition-colors h-[200px] ${
        isActive ? 'bg-gray-200 dark:bg-gray-700 ring-2 ring-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
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
