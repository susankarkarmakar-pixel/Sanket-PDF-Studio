import { useAnnotationStore, type TextAnnotation } from './annotationStore'

export function AnnotationPropertiesPanel(): React.JSX.Element | null {
  const { annotations, selectedAnnotationId, updateAnnotation } = useAnnotationStore()
  const selected = annotations.find((annotation) => annotation.id === selectedAnnotationId)
  if (!selected) return null

  const isText = selected.type === 'text'
  const textAnnotation = isText ? (selected as TextAnnotation) : null

  return (
    <div
      className="absolute left-2 top-12 z-[60] flex items-center gap-3 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-sm shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-900/95"
      role="region"
      aria-label="Annotation properties"
    >
      <label className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Color</span>
        <input
          type="color"
          value={selected.color}
          onChange={(event) => updateAnnotation(selected.id, { color: event.target.value })}
          className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label="Annotation color"
        />
      </label>
      {isText && textAnnotation && (
        <>
          <label className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Size</span>
            <select
              value={textAnnotation.fontSize ?? 16}
              onChange={(event) =>
                updateAnnotation(selected.id, { fontSize: Number(event.target.value) })
              }
              className="rounded border border-gray-300 bg-transparent px-2 py-1 dark:border-gray-600"
              aria-label="Text size"
            >
              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              updateAnnotation(selected.id, {
                fontWeight: textAnnotation.fontWeight === 'bold' ? 'normal' : 'bold'
              })
            }
            className={`rounded px-2 py-1 font-bold ${textAnnotation.fontWeight === 'bold' ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-pressed={textAnnotation.fontWeight === 'bold'}
            aria-label="Toggle bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() =>
              updateAnnotation(selected.id, {
                fontStyle: textAnnotation.fontStyle === 'italic' ? 'normal' : 'italic'
              })
            }
            className={`rounded px-2 py-1 italic ${textAnnotation.fontStyle === 'italic' ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            aria-pressed={textAnnotation.fontStyle === 'italic'}
            aria-label="Toggle italic"
          >
            I
          </button>
        </>
      )}
    </div>
  )
}
