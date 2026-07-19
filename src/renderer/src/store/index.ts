import { create } from 'zustand'

type ScaleType = number | 'page-width' | 'page-fit'

interface AppState {
  isDarkMode: boolean
  pdfPath: string | null
  pdfData: Uint8Array | null
  scale: ScaleType
  currentPage: number
  numPages: number
  searchQuery: string
  searchHighlightCurrent: number
  searchHighlightTotal: number
  setDarkMode: (dark: boolean) => void

  selectedPagesForExtraction: number[]
  pageOrder: number[] | null
  togglePageSelection: (page: number, multi: boolean) => void
  clearSelectedPagesForExtraction: () => void
  setPageOrder: (order: number[] | null) => void
  setPdf: (path: string | null, data: Uint8Array | null) => void

  setScale: (scale: ScaleType | ((prev: ScaleType) => ScaleType)) => void
  setCurrentPage: (page: number) => void
  setNumPages: (num: number) => void
  setSearchQuery: (query: string) => void
  setSearchHighlightCurrent: (current: number) => void
  setSearchHighlightTotal: (total: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: false,
  pdfPath: null,
  pdfData: null,
  scale: 1.0,
  currentPage: 1,
  numPages: 0,
  searchQuery: '',
  searchHighlightCurrent: 0,
  searchHighlightTotal: 0,
  setDarkMode: (dark) => {
    set({ isDarkMode: dark })
    window.api.setSetting('isDarkMode', dark)
  },

  selectedPagesForExtraction: [],
  pageOrder: null,
  togglePageSelection: (page, multi) => set((state) => {
    if (!multi) return { selectedPagesForExtraction: [page] }
    const exists = state.selectedPagesForExtraction.includes(page)
    if (exists) {
      return { selectedPagesForExtraction: state.selectedPagesForExtraction.filter(p => p !== page) }
    } else {
      return { selectedPagesForExtraction: [...state.selectedPagesForExtraction, page].sort((a,b) => a-b) }
    }
  }),
  clearSelectedPagesForExtraction: () => set({ selectedPagesForExtraction: [] }),
  setPageOrder: (order) => set({ pageOrder: order }),
  setPdf: (path, data) => set({ pdfPath: path, pdfData: data, currentPage: 1, scale: 1.0, pageOrder: null, selectedPagesForExtraction: [] }),

  setScale: (scale) => set((state) => ({ scale: typeof scale === 'function' ? scale(state.scale) : scale })),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setNumPages: (numPages) => set({ numPages }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchHighlightCurrent: (searchHighlightCurrent) => set({ searchHighlightCurrent }),
  setSearchHighlightTotal: (searchHighlightTotal) => set({ searchHighlightTotal })
}))
