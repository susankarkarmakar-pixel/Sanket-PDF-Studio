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
  setPdf: (path, data) => set({ pdfPath: path, pdfData: data, currentPage: 1, scale: 1.0 }),
  setScale: (scale) => set((state) => ({ scale: typeof scale === 'function' ? scale(state.scale) : scale })),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setNumPages: (numPages) => set({ numPages }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchHighlightCurrent: (searchHighlightCurrent) => set({ searchHighlightCurrent }),
  setSearchHighlightTotal: (searchHighlightTotal) => set({ searchHighlightTotal })
}))
