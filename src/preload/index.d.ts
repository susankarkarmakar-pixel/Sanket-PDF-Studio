import { ElectronAPI } from '@electron-toolkit/preload'

export interface FileData {
  path: string
  data: Uint8Array
}

export interface RecentFile {
  path: string
  name: string
  lastOpened: number
}

export type SettingValue = string | number | RecentFile[] | { id: string; dataUrl: string }[]

export interface SignPdfOptions {
  p12Data: Uint8Array
  passphrase: string
  name: string
  reason: string
  location: string
  contactInfo: string
}

export interface PdfSignatureVerification {
  present: boolean
  valid: boolean
  signer: string | null
  issuer: string | null
  serialNumber: string | null
  validFrom: string | null
  validTo: string | null
  fingerprint: string | null
  error: string | null
}

export interface EncryptPdfOptions {
  userPassword: string
  ownerPassword?: string
  allowPrinting: boolean
  allowCopying: boolean
  allowAnnotations: boolean
  allowFormFilling: boolean
}

export interface SanketApi {
  openFile: () => Promise<FileData | null>
  openFiles: () => Promise<FileData[]>
  openImages: () => Promise<FileData[]>
  readFile: (filePath: string) => Promise<FileData | null>
  saveFile: (data: Uint8Array, defaultPath?: string) => Promise<string | null>
  print: () => Promise<boolean>
  signPdf: (data: Uint8Array, options: SignPdfOptions) => Promise<Uint8Array>
  encryptPdf: (data: Uint8Array, options: EncryptPdfOptions) => Promise<Uint8Array>
  hasSignature: (data: Uint8Array) => Promise<boolean>
  verifySignature: (data: Uint8Array) => Promise<PdfSignatureVerification>
  getSettings: () => Promise<Record<string, unknown>>
  setSetting: (key: string, value: SettingValue) => Promise<boolean>
  onOpenFileFromOS: (callback: (path: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: SanketApi
  }
}
