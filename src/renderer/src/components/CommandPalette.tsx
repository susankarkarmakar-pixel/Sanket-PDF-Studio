import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useAppStore } from '../store'
import { useFeedbackStore } from '../feedbackStore'

interface CommandPaletteProps {
  onClose: () => void
}

type Command = { id: string; label: string; run: () => void | Promise<void> }

export function CommandPalette({ onClose }: CommandPaletteProps): React.JSX.Element {
  const { setPdf, currentPage, numPages, setCurrentPage, setScale } = useAppStore()
  const { notify } = useFeedbackStore()
  const [query, setQuery] = useState('')

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'open',
        label: 'Open PDF',
        run: async () => {
          const file = await window.api.openFile()
          if (!file) return
          setPdf(file.path, file.data)
          useAppStore
            .getState()
            .addRecentFile(file.path, file.path.split(/[\\/]/).pop() || 'Unknown')
          onClose()
        }
      },
      {
        id: 'next',
        label: 'Go to next page',
        run: () => {
          const page = Math.min(numPages, currentPage + 1)
          setCurrentPage(page)
          window.dispatchEvent(new CustomEvent('page-change-request', { detail: page }))
          onClose()
        }
      },
      {
        id: 'previous',
        label: 'Go to previous page',
        run: () => {
          const page = Math.max(1, currentPage - 1)
          setCurrentPage(page)
          window.dispatchEvent(new CustomEvent('page-change-request', { detail: page }))
          onClose()
        }
      },
      {
        id: 'fit-width',
        label: 'Fit page to width',
        run: () => {
          setScale('page-width')
          onClose()
        }
      },
      {
        id: 'zoom-in',
        label: 'Zoom in',
        run: () => {
          setScale((value) => (typeof value === 'number' ? Math.min(5, value + 0.25) : 1.25))
          onClose()
        }
      },
      {
        id: 'zoom-out',
        label: 'Zoom out',
        run: () => {
          setScale((value) => (typeof value === 'number' ? Math.max(0.25, value - 0.25) : 0.75))
          onClose()
        }
      },
      {
        id: 'print',
        label: 'Print current PDF',
        run: async () => {
          const success = await window.api.print()
          if (!success) notify('Unable to start printing.', 'error')
          onClose()
        }
      }
    ],
    [currentPage, notify, numPages, onClose, setCurrentPage, setPdf, setScale]
  )

  const filteredCommands = commands.filter((command) =>
    command.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-[105] flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-700">
          <Search size={18} className="text-gray-500" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
              if (event.key === 'Enter' && filteredCommands[0]) void filteredCommands[0].run()
            }}
            placeholder="Search commands..."
            className="flex-1 bg-transparent py-3 outline-none"
            aria-label="Search commands"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close command palette"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="command-palette-title" className="sr-only">
          Command palette
        </h2>
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">No matching commands.</p>
          ) : (
            filteredCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                onClick={() => void command.run()}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-gray-800"
              >
                {command.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
