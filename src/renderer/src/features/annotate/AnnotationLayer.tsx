import { useRef, useState } from 'react'
import { useAnnotationStore, DrawAnnotation, HighlightAnnotation, TextAnnotation, StickyAnnotation } from './annotationStore'
import { Trash2 } from 'lucide-react'

interface AnnotationLayerProps {
  pageNum: number
  scale: number
  width: number
  height: number
}

export function AnnotationLayer({ pageNum, scale, width, height }: AnnotationLayerProps) {
  const { currentTool, currentColor, annotations, addAnnotation, updateAnnotation, deleteAnnotation, selectedAnnotationId, setSelectedAnnotationId } = useAnnotationStore()

  const layerRef = useRef<HTMLDivElement>(null)

  const pageAnnotations = annotations.filter(a => a.page === pageNum)

  // -- Drawing State --
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([])
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null)
  const [currentRect, setCurrentRect] = useState<{x: number, y: number, width: number, height: number} | null>(null)

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!layerRef.current) return { x: 0, y: 0 }
    const rect = layerRef.current.getBoundingClientRect()
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    }
  }

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (currentTool === 'pointer') {
      if (e.target === layerRef.current) {
        setSelectedAnnotationId(null)
      }
      return
    }

    const { x, y } = getCoordinates(e)

    if (currentTool === 'draw') {
      setIsDrawing(true)
      setCurrentPath([{ x, y }])
    } else if (currentTool === 'highlight' || currentTool === 'underline') {
      setIsDrawing(true)
      setStartPoint({ x, y })
      setCurrentRect({ x, y, width: 0, height: 0 })
    } else if (currentTool === 'text') {
      addAnnotation({
        id: crypto.randomUUID(),
        page: pageNum,
        type: 'text',
        color: currentColor,
        x,
        y,
        text: ''
      } as TextAnnotation)
      setSelectedAnnotationId(null) // Keep simple for now, might want to auto-select new text
    } else if (currentTool === 'sticky') {
      addAnnotation({
        id: crypto.randomUUID(),
        page: pageNum,
        type: 'sticky',
        color: currentColor,
        x,
        y,
        text: '',
        expanded: true
      } as StickyAnnotation)
    }
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const { x, y } = getCoordinates(e)

    if (currentTool === 'draw') {
      setCurrentPath(prev => [...prev, { x, y }])
    } else if ((currentTool === 'highlight' || currentTool === 'underline') && startPoint) {
      setCurrentRect({
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        width: Math.abs(x - startPoint.x),
        height: Math.abs(y - startPoint.y)
      })
    }
  }

  const handlePointerUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (currentTool === 'draw' && currentPath.length > 1) {
      addAnnotation({
        id: crypto.randomUUID(),
        page: pageNum,
        type: 'draw',
        color: currentColor,
        path: currentPath
      } as DrawAnnotation)
    } else if ((currentTool === 'highlight' || currentTool === 'underline') && currentRect && currentRect.width > 5 && currentRect.height > 5) {
      addAnnotation({
        id: crypto.randomUUID(),
        page: pageNum,
        type: currentTool,
        color: currentColor,
        rects: [currentRect]
      } as HighlightAnnotation)
    }

    setCurrentPath([])
    setStartPoint(null)
    setCurrentRect(null)
  }

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 z-10"
      style={{ cursor: currentTool === 'pointer' ? 'default' : 'crosshair' }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
        {pageAnnotations.map(ann => {
          if (ann.type === 'draw') {
            const d = (ann as DrawAnnotation).path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`).join(' ')
            return <path key={ann.id} d={d} stroke={ann.color} strokeWidth={2 * scale} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          } else if (ann.type === 'highlight' || ann.type === 'underline') {
            return (ann as HighlightAnnotation).rects.map((rect, i) => (
              <rect
                key={`${ann.id}-${i}`}
                x={rect.x * scale}
                y={ann.type === 'highlight' ? rect.y * scale : (rect.y + rect.height) * scale - (2*scale)}
                width={rect.width * scale}
                height={ann.type === 'highlight' ? rect.height * scale : 2 * scale}
                fill={ann.type === 'highlight' ? ann.color : 'transparent'}
                fillOpacity={0.3}
                stroke={ann.type === 'underline' ? ann.color : 'none'}
                strokeWidth={ann.type === 'underline' ? 2 * scale : 0}
              />
            ))
          }
          return null
        })}
        {/* Active drawing paths/rects */}
        {currentTool === 'draw' && currentPath.length > 0 && (
          <path
            d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`).join(' ')}
            stroke={currentColor}
            strokeWidth={2 * scale}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {(currentTool === 'highlight' || currentTool === 'underline') && currentRect && (
          <rect
            x={currentRect.x * scale}
            y={currentTool === 'highlight' ? currentRect.y * scale : (currentRect.y + currentRect.height) * scale - (2*scale)}
            width={currentRect.width * scale}
            height={currentTool === 'highlight' ? currentRect.height * scale : 2 * scale}
            fill={currentTool === 'highlight' ? currentColor : 'transparent'}
            fillOpacity={0.3}
            stroke={currentTool === 'underline' ? currentColor : 'none'}
            strokeWidth={currentTool === 'underline' ? 2 * scale : 0}
          />
        )}
      </svg>

      {/* HTML based annotations (Text, Sticky Notes) and Selection Overlays */}
      {pageAnnotations.map(ann => {
        const isSelected = selectedAnnotationId === ann.id

        if (ann.type === 'text') {
          const tAnn = ann as TextAnnotation
          return (
            <div
              key={ann.id}
              className={`absolute border ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'} hover:border-gray-300 group`}
              style={{
                left: tAnn.x * scale,
                top: tAnn.y * scale,
                transform: 'translate(0, -100%)',
                color: tAnn.color,
                fontSize: `${16 * scale}px`,
                pointerEvents: currentTool === 'pointer' ? 'auto' : 'none'
              }}
              onClick={(e) => { e.stopPropagation(); if (currentTool === 'pointer') setSelectedAnnotationId(ann.id) }}
            >
              <textarea
                value={tAnn.text}
                onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                className="bg-transparent border-none outline-none resize-none overflow-hidden whitespace-nowrap min-w-[50px] min-h-[30px]"
                autoFocus={isSelected}
                placeholder={isSelected ? "Type text..." : ""}
                style={{ color: tAnn.color }}
              />
              {isSelected && (
                <button
                  onClick={() => deleteAnnotation(ann.id)}
                  className="absolute -top-6 -right-6 bg-red-500 text-white rounded p-1"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )
        } else if (ann.type === 'sticky') {
          const sAnn = ann as StickyAnnotation
          return (
            <div
              key={ann.id}
              className={`absolute cursor-pointer group`}
              style={{
                left: sAnn.x * scale,
                top: sAnn.y * scale,
                transform: 'translate(0, -100%)',
                pointerEvents: currentTool === 'pointer' ? 'auto' : 'none'
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (currentTool === 'pointer') {
                  setSelectedAnnotationId(ann.id)
                  updateAnnotation(ann.id, { expanded: !sAnn.expanded })
                }
              }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 ${isSelected ? 'border-primary' : 'border-white'}`}
                style={{ backgroundColor: sAnn.color }}
              >
                 {/* Icon inside sticky note marker */}
                 <span className="text-white font-bold text-xs">A</span>
              </div>

              {sAnn.expanded && (
                <div
                  className="absolute top-10 left-0 bg-yellow-100 border border-yellow-300 p-2 shadow-lg rounded w-48 z-50 text-black text-sm"
                  onClick={e => e.stopPropagation()}
                >
                  <textarea
                    value={sAnn.text}
                    onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                    className="w-full bg-transparent border-none outline-none resize-none h-24 text-black"
                    placeholder="Add a comment..."
                    autoFocus
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => deleteAnnotation(ann.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete Note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        }

        // Selection overlay for path/rects
        if (isSelected && (ann.type === 'draw' || ann.type === 'highlight' || ann.type === 'underline')) {
           // Calculate bounding box
           let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
           if (ann.type === 'draw') {
             (ann as DrawAnnotation).path.forEach(p => {
                minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
                maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
             })
           } else {
             (ann as HighlightAnnotation).rects.forEach(r => {
                minX = Math.min(minX, r.x); minY = Math.min(minY, r.y)
                maxX = Math.max(maxX, r.x + r.width); maxY = Math.max(maxY, r.y + r.height)
             })
           }

           return (
             <div
               key={`${ann.id}-sel`}
               className="absolute border-2 border-primary/50 border-dashed pointer-events-auto flex items-start justify-end"
               style={{
                 left: (minX * scale) - 5,
                 top: (minY * scale) - 5,
                 width: ((maxX - minX) * scale) + 10,
                 height: ((maxY - minY) * scale) + 10,
               }}
               onClick={(e) => e.stopPropagation()}
             >
                <button
                  onClick={() => deleteAnnotation(ann.id)}
                  className="absolute -top-8 -right-4 bg-red-500 text-white rounded p-1 shadow z-50"
                >
                  <Trash2 size={12} />
                </button>
             </div>
           )
        }

        return null
      })}
    </div>
  )
}
