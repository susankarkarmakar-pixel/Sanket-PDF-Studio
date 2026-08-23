export interface OcrLanguagePack {
  code: string
  label: string
}

export const OCR_LANGUAGE_PACKS: OcrLanguagePack[] = [
  { code: 'eng', label: 'English' },
  { code: 'ben', label: 'বাংলা (Bengali)' },
  { code: 'hin', label: 'हिन्दी (Hindi)' },
  { code: 'spa', label: 'Español (Spanish)' },
  { code: 'fra', label: 'Français (French)' },
  { code: 'deu', label: 'Deutsch (German)' },
  { code: 'jpn', label: '日本語 (Japanese)' },
  { code: 'chi_sim', label: '简体中文 (Chinese Simplified)' }
]

const validLanguageCodes = new Set(OCR_LANGUAGE_PACKS.map((pack) => pack.code))

export const normalizeOcrLanguages = (languages: string): string => {
  const selected = languages.split('+').filter((code) => validLanguageCodes.has(code))
  return selected.length > 0 ? [...new Set(selected)].join('+') : 'eng'
}
