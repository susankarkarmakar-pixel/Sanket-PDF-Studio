import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { EventBus, PDFFindController, PDFLinkService, PDFViewer as PDFJSViewer } from 'pdfjs-dist/web/pdf_viewer.mjs'
import 'pdfjs-dist/web/pdf_viewer.css'
import { useAppStore } from '../store'
import { createPortal } from 'react-dom'
import { AnnotationLayer } from '../features/annotate/AnnotationLayer'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()

export function PDFViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  const [, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pdfViewer, setPdfViewer] = useState<PDFJSViewer | null>(null)
  const [pdfFindController, setPdfFindController] = useState<PDFFindController | null>(null)
  const [eventBus, setEventBus] = useState<EventBus | null>(null)

  const [pageViews, setPageViews] = useState<{ id: number, element: HTMLElement, scale: number, width: number, height: number }[]>([])


  const {
    pdfData,
    scale,
    setCurrentPage,
    setNumPages,
    setSearchHighlightCurrent,
    setSearchHighlightTotal
  } = useAppStore()

  useEffect(() => {
    if (!containerRef.current || !viewerRef.current) return

    const bus = new EventBus()
    const linkService = new PDFLinkService({ eventBus: bus })

    const findController = new PDFFindController({
      eventBus: bus,
      linkService,
    })

    const viewer = new PDFJSViewer({
      container: containerRef.current,
      viewer: viewerRef.current,
      eventBus: bus,
      linkService,
      findController,
      removePageBorders: true,
    })

    linkService.setViewer(viewer)

    setEventBus(bus)
    setPdfViewer(viewer)
    setPdfFindController(findController)

    return () => {
      // Cleanup
    }
  }, [])

  useEffect(() => {
    if (!pdfData || !pdfViewer || !eventBus) return

    const loadDocument = async () => {
      let timeoutId: any;
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfData })

        // Add a timeout to catch hanging worker
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("PDF failed to load: worker did not respond (timeout after 15s)"));
          }, 15000);
        });

        const doc = await Promise.race([loadingTask.promise, timeoutPromise]) as pdfjsLib.PDFDocumentProxy;
        clearTimeout(timeoutId);

        setPdfDocument(doc)
        setNumPages(doc.numPages)

        pdfViewer.setDocument(doc)
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('Error loading PDF:', err)
        alert(`Couldn't open this PDF: ${err.message || err}`)
      }
    }

    loadDocument()

    return () => {
      // Cleanup document if needed
    }
  }, [pdfData, pdfViewer, eventBus, setNumPages])

  useEffect(() => {
    if (pdfViewer) {
      pdfViewer.currentScaleValue = scale.toString()
    }
  }, [scale, pdfViewer])

  useEffect(() => {
    if (!eventBus) return

    const handlePageChange = (e: any) => {
      setCurrentPage(e.pageNumber)
    }

    const handleUpdateFindControlState = (e: any) => {
      setSearchHighlightCurrent(e.matchesCount.current)
      setSearchHighlightTotal(e.matchesCount.total)
    }


    const handlePageRendered = (e: any) => {
      const pageNumber = e.pageNumber;
      const pageView = ((pdfViewer as any)?._pages)[pageNumber - 1]; // Access internal pages array

      if (pageView && pageView.div) {
        setPageViews(prev => {
          // Check if already exists to avoid duplicates on re-render
          const existing = prev.findIndex(p => p.id === pageNumber);
          const newEntry = {
            id: pageNumber,
            element: pageView.div,
            scale: pageView.scale,
            width: pageView.width,
            height: pageView.height
          };

          if (existing >= 0) {
            const next = [...prev];
            next[existing] = newEntry;
            return next;
          }
          return [...prev, newEntry];
        });
      }
    }

    eventBus.on('pagerendered', handlePageRendered)

    eventBus.on('pagechanging', handlePageChange)
    eventBus.on('updatefindcontrolstate', handleUpdateFindControlState)

    return () => {
      eventBus.off('pagerendered', handlePageRendered)
      eventBus.off('pagechanging', handlePageChange)
      eventBus.off('updatefindcontrolstate', handleUpdateFindControlState)
    }
  }, [eventBus, setCurrentPage, setSearchHighlightCurrent, setSearchHighlightTotal])

  useEffect(() => {
    const handleSearchRequest = (e: CustomEvent) => {
      if (!eventBus || !pdfFindController) return

      const { query, type } = e.detail
      eventBus.dispatch('find', {
        type: type === 'next' ? 'findagain' : (type === 'prev' ? 'findagain' : 'find'),
        query: query,
        phraseSearch: true,
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious: type === 'prev'
      })
    }

    const handlePageChangeRequest = (e: CustomEvent) => {
      if (pdfViewer) {
        pdfViewer.currentPageNumber = e.detail
      }
    }

    window.addEventListener('pdf-search', handleSearchRequest as EventListener)
    window.addEventListener('page-change-request', handlePageChangeRequest as EventListener)

    return () => {
      window.removeEventListener('pdf-search', handleSearchRequest as EventListener)
      window.removeEventListener('page-change-request', handlePageChangeRequest as EventListener)
    }
  }, [eventBus, pdfFindController, pdfViewer])

  if (!pdfData) return null

  return (
    <div className="absolute inset-0 overflow-auto bg-gray-200 dark:bg-gray-800" ref={containerRef}>
      <div id="viewer" className="pdfViewer" ref={viewerRef}></div>

      {pageViews.map(page =>
        createPortal(
          <AnnotationLayer
            pageNum={page.id}
            scale={page.scale}
            width={page.width}
            height={page.height}
          />,
          page.element
        )
      )}

      <style>{`
        .page {
          margin: 10px auto !important;
          border-radius: 4px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: none !important;
          background-color: white;
        }
        .dark .page {
          filter: invert(90%) hue-rotate(180deg);
        }
        .dark .textLayer {
          filter: invert(100%) hue-rotate(180deg);
        }
      `}</style>
    </div>
  )
}
