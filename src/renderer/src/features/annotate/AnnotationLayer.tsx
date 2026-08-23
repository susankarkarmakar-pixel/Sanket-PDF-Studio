import { useRef, useState } from 'react'
import {
  useAnnotationStore,
  DrawAnnotation,
  HighlightAnnotation,
  RedactAnnotation,
  ShapeAnnotation,
  SignatureAnnotation,
  StickyAnnotation,
  TextAnnotation
} from './annotationStore'
import { Trash2 } from 'lucide-react'

interface AnnotationLayerProps {
  pageNum: number
  scale: number
  width: number
  height: number
}

export function AnnotationLayer({
  pageNum,
  scale,
  width,
  height
}: AnnotationLayerProps): React.JSX.Element {
  const {
    currentTool,
    currentColor,
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectedAnnotationId,
    setSelectedAnnotationId,
    setCurrentTool
  } = useAnnotationStore()

  const layerRef = useRef<HTMLDivElement>(null)

  const pageAnnotations = annotations.filter((a) => a.page === pageNum)

  // -- Drawing State --
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([])
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // -- Reposition & Resize State --
  const [draggingAnnId, setDraggingAnnId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [resizingAnnId, setResizingAnnId] = useState<string | null>(null)

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
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

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent): void => {
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
    } else if (
      currentTool === 'highlight' ||
      currentTool === 'underline' ||
      currentTool === 'redact' ||
      currentTool === 'rectangle' ||
      currentTool === 'ellipse' ||
      currentTool === 'line' ||
      currentTool === 'arrow'
    ) {
      setIsDrawing(true)
      setStartPoint({ x, y })
      setCurrentRect({ x, y, width: 0, height: 0 })
    } else if (currentTool === 'text') {
      const id = crypto.randomUUID()
      addAnnotation({
        id,
        page: pageNum,
        type: 'text',
        color: currentColor,
        x,
        y,
        text: ''
      } as TextAnnotation)
      setSelectedAnnotationId(id)
      setCurrentTool('pointer')
    } else if (currentTool === 'sticky') {
      const id = crypto.randomUUID()
      addAnnotation({
        id,
        page: pageNum,
        type: 'sticky',
        color: currentColor,
        x,
        y,
        text: '',
        expanded: true
      } as StickyAnnotation)
      setSelectedAnnotationId(id)
      setCurrentTool('pointer')
    }
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent): void => {
    if (!isDrawing) return
    const { x, y } = getCoordinates(e)

    if (currentTool === 'draw') {
      setCurrentPath((prev) => [...prev, { x, y }])
    } else if (
      (currentTool === 'highlight' ||
        currentTool === 'underline' ||
        currentTool === 'redact' ||
        currentTool === 'rectangle' ||
        currentTool === 'ellipse' ||
        currentTool === 'line' ||
        currentTool === 'arrow') &&
      startPoint
    ) {
      setCurrentRect({
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        width: Math.abs(x - startPoint.x),
        height: Math.abs(y - startPoint.y)
      })
    }
  }

  const handlePointerUp = (): void => {
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
    } else if (
      (currentTool === 'highlight' ||
        currentTool === 'underline' ||
        currentTool === 'redact' ||
        currentTool === 'rectangle' ||
        currentTool === 'ellipse' ||
        currentTool === 'line' ||
        currentTool === 'arrow') &&
      currentRect &&
      currentRect.width > 5 &&
      currentRect.height > 5
    ) {
      const id = crypto.randomUUID()
      addAnnotation({
        id,
        page: pageNum,
        type: currentTool,
        color: currentColor,
        rects: [currentRect]
      } as HighlightAnnotation | RedactAnnotation)
      setSelectedAnnotationId(id)
    } else if (
      (currentTool === 'rectangle' ||
        currentTool === 'ellipse' ||
        currentTool === 'line' ||
        currentTool === 'arrow') &&
      currentRect &&
      currentRect.width > 5 &&
      currentRect.height > 5
    ) {
      const id = crypto.randomUUID()
      addAnnotation({
        id,
        page: pageNum,
        type: currentTool,
        color: currentColor,
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.width,
        height: currentRect.height
      } as ShapeAnnotation)
      setSelectedAnnotationId(id)
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
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const dataUrl = e.dataTransfer.getData('signature')
        if (dataUrl) {
          const { x, y } = getCoordinates(e)
          addAnnotation({
            id: crypto.randomUUID(),
            page: pageNum,
            type: 'signature',
            color: '#000',
            x,
            y,
            width: 150,
            height: 50,
            dataUrl
          } as SignatureAnnotation)
        }
      }}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <svg
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ pointerEvents: currentTool === 'pointer' ? 'auto' : 'none' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedAnnotationId(null)
        }}
      >
        <defs>
          <marker
            id="annotation-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
          </marker>
        </defs>
        {pageAnnotations.map((ann) => {
          if (ann.type === 'draw') {
            const d = (ann as DrawAnnotation).path
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`)
              .join(' ')
            return (
              <path
                key={ann.id}
                d={d}
                stroke={ann.color}
                strokeWidth={2 * scale}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: currentTool === 'pointer' ? 'stroke' : 'none' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedAnnotationId(ann.id)
                }}
              />
            )
          } else if (ann.type === 'highlight' || ann.type === 'underline') {
            return (ann as HighlightAnnotation).rects.map((rect, i) => (
              <rect
                key={`${ann.id}-${i}`}
                x={rect.x * scale}
                y={
                  ann.type === 'highlight'
                    ? rect.y * scale
                    : (rect.y + rect.height) * scale - 2 * scale
                }
                width={rect.width * scale}
                height={ann.type === 'highlight' ? rect.height * scale : 2 * scale}
                fill={ann.type === 'highlight' ? ann.color : 'transparent'}
                fillOpacity={0.3}
                stroke={ann.type === 'underline' ? ann.color : 'none'}
                strokeWidth={ann.type === 'underline' ? 2 * scale : 0}
                style={{ pointerEvents: currentTool === 'pointer' ? 'all' : 'none' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedAnnotationId(ann.id)
                }}
              />
            ))
          } else if (
            ann.type === 'rectangle' ||
            ann.type === 'ellipse' ||
            ann.type === 'line' ||
            ann.type === 'arrow'
          ) {
            const shape = ann as ShapeAnnotation
            const x = shape.x * scale
            const y = shape.y * scale
            const shapeWidth = shape.width * scale
            const shapeHeight = shape.height * scale
            if (ann.type === 'line' || ann.type === 'arrow') {
              return (
                <line
                  key={ann.id}
                  x1={x}
                  y1={y}
                  x2={x + shapeWidth}
                  y2={y + shapeHeight}
                  stroke={ann.color}
                  strokeWidth={2 * scale}
                  markerEnd={ann.type === 'arrow' ? 'url(#annotation-arrow)' : undefined}
                  style={{ pointerEvents: currentTool === 'pointer' ? 'stroke' : 'none' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedAnnotationId(ann.id)
                  }}
                />
              )
            }
            return ann.type === 'ellipse' ? (
              <ellipse
                key={ann.id}
                cx={x + shapeWidth / 2}
                cy={y + shapeHeight / 2}
                rx={Math.abs(shapeWidth) / 2}
                ry={Math.abs(shapeHeight) / 2}
                fill="transparent"
                stroke={ann.color}
                strokeWidth={2 * scale}
                style={{ pointerEvents: currentTool === 'pointer' ? 'all' : 'none' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedAnnotationId(ann.id)
                }}
              />
            ) : (
              <rect
                key={ann.id}
                x={x}
                y={y}
                width={shapeWidth}
                height={shapeHeight}
                fill="transparent"
                stroke={ann.color}
                strokeWidth={2 * scale}
                style={{ pointerEvents: currentTool === 'pointer' ? 'all' : 'none' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedAnnotationId(ann.id)
                }}
              />
            )
          }
          return null
        })}
        {/* Active drawing paths, rectangles, and shapes */}
        {currentTool === 'draw' && currentPath.length > 0 && (
          <path
            d={currentPath
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`)
              .join(' ')}
            stroke={currentColor}
            strokeWidth={2 * scale}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {(currentTool === 'highlight' ||
          currentTool === 'underline' ||
          currentTool === 'redact' ||
          currentTool === 'rectangle') &&
          currentRect && (
            <rect
              x={currentRect.x * scale}
              y={
                currentTool === 'highlight' ||
                currentTool === 'redact' ||
                currentTool === 'rectangle'
                  ? currentRect.y * scale
                  : (currentRect.y + currentRect.height) * scale - 2 * scale
              }
              width={currentRect.width * scale}
              height={
                currentTool === 'highlight' ||
                currentTool === 'redact' ||
                currentTool === 'rectangle'
                  ? currentRect.height * scale
                  : 2 * scale
              }
              fill={
                currentTool === 'highlight'
                  ? currentColor
                  : currentTool === 'redact'
                    ? '#000000'
                    : 'transparent'
              }
              fillOpacity={currentTool === 'redact' ? 1.0 : 0.3}
              stroke={
                currentTool === 'underline' || currentTool === 'rectangle' ? currentColor : 'none'
              }
              strokeWidth={
                currentTool === 'underline' || currentTool === 'rectangle' ? 2 * scale : 0
              }
            />
          )}
        {currentTool === 'ellipse' && currentRect && (
          <ellipse
            cx={(currentRect.x + currentRect.width / 2) * scale}
            cy={(currentRect.y + currentRect.height / 2) * scale}
            rx={Math.abs(currentRect.width * scale) / 2}
            ry={Math.abs(currentRect.height * scale) / 2}
            fill="transparent"
            stroke={currentColor}
            strokeWidth={2 * scale}
          />
        )}
        {(currentTool === 'line' || currentTool === 'arrow') && currentRect && (
          <line
            x1={currentRect.x * scale}
            y1={currentRect.y * scale}
            x2={(currentRect.x + currentRect.width) * scale}
            y2={(currentRect.y + currentRect.height) * scale}
            stroke={currentColor}
            strokeWidth={2 * scale}
            markerEnd={currentTool === 'arrow' ? 'url(#annotation-arrow)' : undefined}
          />
        )}
      </svg>

      {/* HTML based annotations (Text, Sticky Notes) and Selection Overlays */}
      {pageAnnotations.map((ann) => {
        if (ann.type === 'redact') {
          const rAnn = ann as RedactAnnotation
          const isSelected = selectedAnnotationId === ann.id
          return (
            <div key={ann.id}>
              {rAnn.rects.map((r, i) => (
                <div
                  key={i}
                  className={`absolute bg-black ${isSelected ? 'ring-2 ring-red-500' : ''}`}
                  style={{
                    left: r.x * scale,
                    top: r.y * scale,
                    width: r.width * scale,
                    height: r.height * scale,
                    pointerEvents: currentTool === 'pointer' ? 'auto' : 'none'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (currentTool === 'pointer') setSelectedAnnotationId(ann.id)
                  }}
                />
              ))}
              {isSelected && (
                <div
                  className="absolute pointer-events-auto"
                  style={{
                    left: rAnn.rects[0].x * scale - 5,
                    top: rAnn.rects[0].y * scale - 5
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
              )}
            </div>
          )
        }
        const isSelected = selectedAnnotationId === ann.id

        if (ann.type === 'signature') {
          const sigAnn = ann as SignatureAnnotation
          return (
            <div
              key={ann.id}
              className={`absolute group ${isSelected ? 'ring-2 ring-primary border-primary border-dashed' : 'border-transparent'}`}
              style={{
                left: sigAnn.x * scale,
                top: sigAnn.y * scale,
                width: sigAnn.width * scale,
                height: sigAnn.height * scale,
                pointerEvents: currentTool === 'pointer' ? 'auto' : 'none',
                cursor: currentTool === 'pointer' ? 'move' : 'default'
              }}
              onPointerDown={(e) => {
                if (currentTool !== 'pointer') return
                e.stopPropagation()
                setSelectedAnnotationId(ann.id)
                // Start drag
                const { x, y } = getCoordinates(e)
                setDraggingAnnId(ann.id)
                setDragOffset({ x: x - sigAnn.x, y: y - sigAnn.y })
                ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
              }}
              onPointerMove={(e) => {
                if (draggingAnnId !== ann.id || !dragOffset) return
                const { x, y } = getCoordinates(e)
                updateAnnotation(ann.id, { x: x - dragOffset.x, y: y - dragOffset.y })
              }}
              onPointerUp={(e) => {
                if (draggingAnnId === ann.id) {
                  setDraggingAnnId(null)
                  setDragOffset(null)
                  ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
                }
              }}
            >
              <img
                src={sigAnn.dataUrl}
                alt="Signature"
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />

              {isSelected && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteAnnotation(ann.id)
                    }}
                    className="absolute -top-8 -right-4 bg-red-500 text-white rounded p-1 shadow z-50 pointer-events-auto"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize shadow pointer-events-auto"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setResizingAnnId(ann.id)
                      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                    }}
                    onPointerMove={(e) => {
                      if (resizingAnnId !== ann.id) return
                      const { x } = getCoordinates(e)
                      const newWidth = Math.max(20, x - sigAnn.x)
                      const aspectRatio = sigAnn.width / sigAnn.height
                      updateAnnotation(ann.id, { width: newWidth, height: newWidth / aspectRatio })
                    }}
                    onPointerUp={(e) => {
                      if (resizingAnnId === ann.id) {
                        setResizingAnnId(null)
                        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
                      }
                    }}
                  />
                </>
              )}
            </div>
          )
        }

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
              onClick={(e) => {
                e.stopPropagation()
                if (currentTool === 'pointer') setSelectedAnnotationId(ann.id)
              }}
            >
              <textarea
                value={tAnn.text}
                onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                className="bg-transparent border-none outline-none resize-none overflow-hidden whitespace-nowrap min-w-[50px] min-h-[30px]"
                autoFocus={isSelected}
                placeholder={isSelected ? 'Type text...' : ''}
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
                e.stopPropagation()
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
                  onClick={(e) => e.stopPropagation()}
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
        if (
          isSelected &&
          (ann.type === 'draw' ||
            ann.type === 'highlight' ||
            ann.type === 'underline' ||
            ann.type === 'rectangle' ||
            ann.type === 'ellipse' ||
            ann.type === 'line' ||
            ann.type === 'arrow')
        ) {
          // Calculate bounding box
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity
          if (ann.type === 'draw') {
            ;(ann as DrawAnnotation).path.forEach((p) => {
              minX = Math.min(minX, p.x)
              minY = Math.min(minY, p.y)
              maxX = Math.max(maxX, p.x)
              maxY = Math.max(maxY, p.y)
            })
          } else if (ann.type === 'highlight' || ann.type === 'underline') {
            ;(ann as HighlightAnnotation).rects.forEach((r) => {
              minX = Math.min(minX, r.x)
              minY = Math.min(minY, r.y)
              maxX = Math.max(maxX, r.x + r.width)
              maxY = Math.max(maxY, r.y + r.height)
            })
          } else {
            const shape = ann as ShapeAnnotation
            minX = shape.x
            minY = shape.y
            maxX = shape.x + shape.width
            maxY = shape.y + shape.height
          }

          return (
            <div
              key={`${ann.id}-sel`}
              className="absolute border-2 border-primary/50 border-dashed pointer-events-auto flex items-start justify-end"
              style={{
                left: minX * scale - 5,
                top: minY * scale - 5,
                width: (maxX - minX) * scale + 10,
                height: (maxY - minY) * scale + 10
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
