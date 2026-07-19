import { MousePointer2, Highlighter, Underline, PenTool, Type, StickyNote } from 'lucide-react'
import { useAnnotationStore, AnnotationTool } from './annotationStore'
import clsx from 'clsx'

const TOOLS: { id: AnnotationTool, icon: any, label: string }[] = [
  { id: 'pointer', icon: MousePointer2, label: 'Select' },
  { id: 'highlight', icon: Highlighter, label: 'Highlight' },
  { id: 'underline', icon: Underline, label: 'Underline' },
  { id: 'draw', icon: PenTool, label: 'Draw' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'sticky', icon: StickyNote, label: 'Sticky Note' },
]

const COLORS = [
  '#facc15', // Yellow
  '#4ade80', // Green
  '#60a5fa', // Blue
  '#f87171', // Red
  '#000000', // Black
]

export function AnnotationToolbar() {
  const { currentTool, setCurrentTool, currentColor, setCurrentColor } = useAnnotationStore()

  return (
    <div className="flex items-center gap-2 px-2 border-l border-gray-300 dark:border-gray-700 ml-2 h-8">
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-1">
        {TOOLS.map(tool => {
          const Icon = tool.icon
          const isActive = currentTool === tool.id
          return (
            <button
              key={tool.id}
              title={tool.label}
              onClick={() => setCurrentTool(tool.id)}
              className={clsx(
                "p-1.5 rounded transition-colors",
                isActive
                  ? "bg-white dark:bg-gray-600 shadow-sm text-primary"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}
            >
              <Icon size={16} />
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-1 ml-2">
        {COLORS.map(color => (
          <button
            key={color}
            onClick={() => setCurrentColor(color)}
            className={clsx(
              "w-6 h-6 rounded-full border-2 transition-transform",
              currentColor === color ? "border-primary scale-110" : "border-transparent hover:scale-110"
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}
