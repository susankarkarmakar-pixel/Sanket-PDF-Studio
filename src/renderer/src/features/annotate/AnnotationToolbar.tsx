import {
  ArrowUpRight,
  Circle,
  Eraser,
  Highlighter,
  Minus,
  MousePointer2,
  PenTool,
  Square,
  StickyNote,
  Type,
  Underline
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { useAnnotationStore, type AnnotationTool } from './annotationStore'

type ToolDefinition = { id: AnnotationTool; icon: LucideIcon; label: string }

const TOOLS: ToolDefinition[] = [
  { id: 'pointer', icon: MousePointer2, label: 'Select' },
  { id: 'highlight', icon: Highlighter, label: 'Highlight' },
  { id: 'underline', icon: Underline, label: 'Underline' },
  { id: 'draw', icon: PenTool, label: 'Draw' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
  { id: 'redact', icon: Eraser, label: 'Redact' }
]

const COLORS = ['#facc15', '#4ade80', '#60a5fa', '#f87171', '#000000']

export function AnnotationToolbar(): React.JSX.Element {
  const { currentTool, setCurrentTool, currentColor, setCurrentColor } = useAnnotationStore()

  return (
    <div className="flex items-center gap-2 px-2 border-l border-gray-300 dark:border-gray-700 ml-2 h-8">
      <div
        className="flex bg-gray-100 dark:bg-gray-800 rounded p-1"
        role="toolbar"
        aria-label="Annotation tools"
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          const isActive = currentTool === tool.id
          return (
            <button
              key={tool.id}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={isActive}
              onClick={() => setCurrentTool(tool.id)}
              className={clsx(
                'p-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-primary'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
              )}
            >
              <Icon size={16} />
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-1 ml-2" role="group" aria-label="Annotation colors">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setCurrentColor(color)}
            aria-label={`Use ${color}`}
            aria-pressed={currentColor === color}
            className={clsx(
              'w-6 h-6 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              currentColor === color
                ? 'border-primary scale-110'
                : 'border-transparent hover:scale-110'
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}
