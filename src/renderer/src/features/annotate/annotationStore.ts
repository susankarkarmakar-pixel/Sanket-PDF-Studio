import { create } from 'zustand'

export type AnnotationTool = 'pointer' | 'highlight' | 'underline' | 'draw' | 'text' | 'sticky'

export interface BaseAnnotation {
  id: string
  page: number
  type: AnnotationTool
  color: string
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight' | 'underline'
  rects: { x: number, y: number, width: number, height: number }[]
}

export interface DrawAnnotation extends BaseAnnotation {
  type: 'draw'
  path: { x: number, y: number }[]
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  x: number
  y: number
  text: string
}

export interface StickyAnnotation extends BaseAnnotation {
  type: 'sticky'
  x: number
  y: number
  text: string
  expanded: boolean
}

export type Annotation = HighlightAnnotation | DrawAnnotation | TextAnnotation | StickyAnnotation

interface AnnotationState {
  currentTool: AnnotationTool
  currentColor: string
  annotations: Annotation[]
  selectedAnnotationId: string | null
  setCurrentTool: (tool: AnnotationTool) => void
  setCurrentColor: (color: string) => void
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  deleteAnnotation: (id: string) => void
  setSelectedAnnotationId: (id: string | null) => void
  clearAnnotations: () => void
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  currentTool: 'pointer',
  currentColor: '#facc15', // Default yellow
  annotations: [],
  selectedAnnotationId: null,
  setCurrentTool: (currentTool) => set({ currentTool }),
  setCurrentColor: (currentColor) => set({ currentColor }),
  addAnnotation: (annotation) => set((state) => ({ annotations: [...state.annotations, annotation] })),
  updateAnnotation: (id, updates) => set((state) => ({
    annotations: state.annotations.map(a => a.id === id ? { ...a, ...updates } as Annotation : a)
  })),
  deleteAnnotation: (id) => set((state) => ({
    annotations: state.annotations.filter(a => a.id !== id),
    selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId
  })),
  setSelectedAnnotationId: (selectedAnnotationId) => set({ selectedAnnotationId }),
  clearAnnotations: () => set({ annotations: [], selectedAnnotationId: null })
}))
