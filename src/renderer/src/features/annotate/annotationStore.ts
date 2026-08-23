import { create } from 'zustand'

export type AnnotationTool =
  | 'pointer'
  | 'highlight'
  | 'underline'
  | 'draw'
  | 'text'
  | 'sticky'
  | 'signature'
  | 'redact'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'

export interface BaseAnnotation {
  id: string
  page: number
  type: AnnotationTool
  color: string
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight' | 'underline'
  rects: { x: number; y: number; width: number; height: number }[]
}

export interface DrawAnnotation extends BaseAnnotation {
  type: 'draw'
  path: { x: number; y: number }[]
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  x: number
  y: number
  text: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
}

export interface StickyAnnotation extends BaseAnnotation {
  type: 'sticky'
  x: number
  y: number
  text: string
  expanded: boolean
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature'
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
}

export interface RedactAnnotation extends BaseAnnotation {
  type: 'redact'
  rects: { x: number; y: number; width: number; height: number }[]
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'ellipse' | 'line' | 'arrow'
  x: number
  y: number
  width: number
  height: number
}

export type Annotation =
  | HighlightAnnotation
  | DrawAnnotation
  | TextAnnotation
  | StickyAnnotation
  | SignatureAnnotation
  | RedactAnnotation
  | ShapeAnnotation

type HistoryAction = { kind: 'update'; id: string } | { kind: 'other' }

interface AnnotationState {
  currentTool: AnnotationTool
  currentColor: string
  annotations: Annotation[]
  selectedAnnotationId: string | null
  history: Annotation[][]
  future: Annotation[][]
  historyAction: HistoryAction | null
  setCurrentTool: (tool: AnnotationTool) => void
  setCurrentColor: (color: string) => void
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  setSelectedAnnotationId: (id: string | null) => void
  clearAnnotations: () => void
  undo: () => void
  redo: () => void
}

const MAX_HISTORY_ENTRIES = 100

const pushHistory = (history: Annotation[][], snapshot: Annotation[]): Annotation[][] => {
  const nextHistory = [...history, snapshot]
  return nextHistory.length > MAX_HISTORY_ENTRIES
    ? nextHistory.slice(-MAX_HISTORY_ENTRIES)
    : nextHistory
}

const cloneAnnotations = (annotations: Annotation[]): Annotation[] => structuredClone(annotations)

export const useAnnotationStore = create<AnnotationState>((set) => ({
  currentTool: 'pointer',
  currentColor: '#facc15',
  annotations: [],
  selectedAnnotationId: null,
  history: [],
  future: [],
  historyAction: null,
  setCurrentTool: (currentTool) => set({ currentTool, historyAction: null }),
  setCurrentColor: (currentColor) => set({ currentColor }),
  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
      history: pushHistory(state.history, cloneAnnotations(state.annotations)),
      future: [],
      historyAction: { kind: 'other' },
      selectedAnnotationId: annotation.id
    })),
  updateAnnotation: (id, updates) =>
    set((state) => {
      const currentAnnotation = state.annotations.find((annotation) => annotation.id === id)
      if (!currentAnnotation) return state

      const nextAnnotations = state.annotations.map((annotation) =>
        annotation.id === id ? ({ ...annotation, ...updates } as Annotation) : annotation
      )
      if (JSON.stringify(nextAnnotations) === JSON.stringify(state.annotations)) return state

      const isSameUpdateGroup =
        state.historyAction?.kind === 'update' && state.historyAction.id === id
      return {
        annotations: nextAnnotations,
        history: isSameUpdateGroup
          ? state.history
          : pushHistory(state.history, cloneAnnotations(state.annotations)),
        future: [],
        historyAction: { kind: 'update', id }
      }
    }),
  deleteAnnotation: (id) =>
    set((state) => {
      const nextAnnotations = state.annotations.filter((annotation) => annotation.id !== id)
      if (nextAnnotations.length === state.annotations.length) return state
      return {
        annotations: nextAnnotations,
        history: pushHistory(state.history, cloneAnnotations(state.annotations)),
        future: [],
        historyAction: { kind: 'other' },
        selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId
      }
    }),
  setSelectedAnnotationId: (selectedAnnotationId) =>
    set({ selectedAnnotationId, historyAction: null }),
  clearAnnotations: () =>
    set({
      annotations: [],
      selectedAnnotationId: null,
      history: [],
      future: [],
      historyAction: null
    }),
  undo: () =>
    set((state) => {
      const previousAnnotations = state.history.at(-1)
      if (!previousAnnotations) return state
      const future = [...state.future, cloneAnnotations(state.annotations)]
      const selectedAnnotationId =
        state.selectedAnnotationId &&
        previousAnnotations.some((annotation) => annotation.id === state.selectedAnnotationId)
          ? state.selectedAnnotationId
          : null
      return {
        annotations: cloneAnnotations(previousAnnotations),
        selectedAnnotationId,
        history: state.history.slice(0, -1),
        future,
        historyAction: null
      }
    }),
  redo: () =>
    set((state) => {
      const nextAnnotations = state.future.at(-1)
      if (!nextAnnotations) return state
      const history = pushHistory(state.history, cloneAnnotations(state.annotations))
      const selectedAnnotationId =
        state.selectedAnnotationId &&
        nextAnnotations.some((annotation) => annotation.id === state.selectedAnnotationId)
          ? state.selectedAnnotationId
          : null
      return {
        annotations: cloneAnnotations(nextAnnotations),
        selectedAnnotationId,
        history,
        future: state.future.slice(0, -1),
        historyAction: null
      }
    })
}))
