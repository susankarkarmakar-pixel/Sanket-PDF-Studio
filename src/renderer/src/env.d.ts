/// <reference types="vite/client" />

import type { SanketApi } from '../../../preload/index.d'

declare global {
  interface Window {
    api: SanketApi
  }
}

export {}
