/// <reference types="vite/client" />

interface Window {
  api: {
    openFile: () => Promise<{ path: string; data: Uint8Array } | null>
    readFile: (filePath: string) => Promise<{ path: string; data: Uint8Array } | null>
    saveFile: (data: Uint8Array, defaultPath?: string) => Promise<string | null>
    print: () => Promise<boolean>
    getSettings: () => Promise<Record<string, any>>
    setSetting: (key: string, value: any) => Promise<boolean>
    onOpenFileFromOS?: (callback: (path: string) => void) => void
  }
}
