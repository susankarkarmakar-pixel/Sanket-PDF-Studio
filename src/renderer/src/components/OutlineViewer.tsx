import { useEffect, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useAppStore } from '../store'
import { useFeedbackStore } from '../feedbackStore'

type OutlineItem = NonNullable<Awaited<ReturnType<pdfjsLib.PDFDocumentProxy['getOutline']>>>[number]

export function OutlineViewer(): React.JSX.Element | null {
  const { pdfData, setCurrentPage } = useAppStore()
  const { notify } = useFeedbackStore()
  const [outline, setOutline] = useState<OutlineItem[]>([])

  useEffect(() => {
    if (!pdfData) {
      setOutline([])
      return
    }
    let mounted = true
    const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice() })
    loadingTask.promise
      .then((document) => document.getOutline())
      .then((items) => {
        if (mounted) setOutline((items ?? []) as OutlineItem[])
      })
      .catch(() => {
        if (mounted) notify('Unable to read this PDF outline.', 'error')
      })
    return () => {
      mounted = false
      void loadingTask.destroy()
    }
  }, [notify, pdfData])

  const goToDestination = async (destination: OutlineItem['dest']): Promise<void> => {
    if (!pdfData || destination === null || destination === undefined) return
    const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice() })
    try {
      const document = await loadingTask.promise
      const resolved =
        typeof destination === 'string' ? await document.getDestination(destination) : destination
      if (!resolved || !Array.isArray(resolved) || resolved.length === 0) return
      const pageIndex = await document.getPageIndex(resolved[0])
      const page = pageIndex + 1
      setCurrentPage(page)
      window.dispatchEvent(new CustomEvent('page-change-request', { detail: page }))
    } catch (error) {
      console.error(error)
      notify('Unable to navigate to that bookmark.', 'error')
    } finally {
      await loadingTask.destroy()
    }
  }

  if (!pdfData) return null

  return (
    <section
      className="border-b border-gray-200 p-2 dark:border-gray-700"
      aria-label="Document outline"
    >
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Bookmarks
      </h2>
      {outline.length === 0 ? (
        <p className="px-1 text-xs text-gray-500">No bookmarks in this document.</p>
      ) : (
        <div className="space-y-1">
          {outline.map((item, index) => (
            <button
              key={`${item.title}-${index}`}
              type="button"
              onClick={() => goToDestination(item.dest)}
              className="block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-gray-800"
              title={item.title}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
