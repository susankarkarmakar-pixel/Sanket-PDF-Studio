import { describe, expect, it } from 'vitest'
import { normalizeOcrLanguages } from './ocrLanguages'

describe('OCR language selection', () => {
  it('keeps supported unique language packs in order', () => {
    expect(normalizeOcrLanguages('eng+ben+eng+hin')).toBe('eng+ben+hin')
  })

  it('falls back to English when no language pack is valid', () => {
    expect(normalizeOcrLanguages('unknown+invalid')).toBe('eng')
  })
})
