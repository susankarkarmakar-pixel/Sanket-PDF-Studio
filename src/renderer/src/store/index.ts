import { create } from 'zustand'

type ScaleType = number | 'page-width' | 'page-fit'

interface AppState {
  theme: 'light' | 'dark' | 'system'
  defaultZoom: ScaleType
  recentFiles: { path: string, name: string, lastOpened: number }[]
  pdfPath: string | null
  pdfData: Uint8Array | null
  scale: ScaleType
  currentPage: number
  numPages: number
  searchQuery: string
  searchHighlightCurrent: number
  searchHighlightTotal: number
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setDefaultZoom: (zoom: ScaleType) => void
  addRecentFile: (path: string, name: string) => void
  removeRecentFile: (path: string) => void
  loadSettings: () => Promise<void>

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
  theme: 'system',
  defaultZoom: 1.0,
  recentFiles: [],
  pdfPath: null,
  pdfData: null,
  scale: 1.0,
  currentPage: 1,
  numPages: 0,
  searchQuery: '',
  searchHighlightCurrent: 0,
  searchHighlightTotal: 0,
  setTheme: (theme) => {
    set({ theme })
    window.api.setSetting('theme', theme)
  },
  setDefaultZoom: (defaultZoom) => {
    set({ defaultZoom })
    window.api.setSetting('defaultZoom', defaultZoom)
  },
  addRecentFile: (path, name) => set((state) => {
    const recent = state.recentFiles.filter(f => f.path !== path)
    recent.unshift({ path, name, lastOpened: Date.now() })
    const updated = recent.slice(0, 10) // Keep last 10
    window.api.setSetting('recentFiles', updated)
    return { recentFiles: updated }
  }),
  removeRecentFile: (path) => set((state) => {
    const updated = state.recentFiles.filter(f => f.path !== path)
    window.api.setSetting('recentFiles', updated)
    return { recentFiles: updated }
  }),
  loadSettings: async () => {
    const settings = await window.api.getSettings()
    set((state) => ({
      theme: settings.theme || state.theme,
      defaultZoom: settings.defaultZoom || state.defaultZoom,
      recentFiles: settings.recentFiles || state.recentFiles
    }))
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
  setPdf: (path, data) => set((state) => ({ pdfPath: path, pdfData: data, currentPage: 1, scale: state.defaultZoom, pageOrder: null, selectedPagesForExtraction: [] })),

  setScale: (scale) => set((state) => ({ scale: typeof scale === 'function' ? scale(state.scale) : scale })),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setNumPages: (numPages) => set({ numPages }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchHighlightCurrent: (searchHighlightCurrent) => set({ searchHighlightCurrent }),
  setSearchHighlightTotal: (searchHighlightTotal) => set({ searchHighlightTotal })
}))
