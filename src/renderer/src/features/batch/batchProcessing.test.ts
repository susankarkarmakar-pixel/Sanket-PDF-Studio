import { describe, expect, it } from 'vitest'
import { fileSizeLabel, outputNameFor, parseTargetSize } from './batchProcessing'

describe('batch target-size helpers', () => {
  it('converts KB and MB values to whole bytes', () => {
    expect(parseTargetSize('512', 'KB')).toBe(512 * 1024)
    expect(parseTargetSize('1.5', 'MB')).toBe(1.5 * 1024 * 1024)
  })

  it('treats a blank target as no maximum', () => {
    expect(parseTargetSize('', 'MB')).toBeNull()
    expect(parseTargetSize('   ', 'KB')).toBeNull()
  })

  it('rejects zero, negative, and non-numeric targets', () => {
    expect(() => parseTargetSize('0', 'KB')).toThrow('Target size must be greater than zero.')
    expect(() => parseTargetSize('-2', 'MB')).toThrow('Target size must be greater than zero.')
    expect(() => parseTargetSize('not-a-number', 'MB')).toThrow(
      'Target size must be greater than zero.'
    )
  })

  it('generates distinct optimized and converted output names', () => {
    const input = { path: '/tmp/Annual Report.PDF', data: new Uint8Array() }
    expect(outputNameFor(input, 'optimize-pdfs')).toBe('Annual Report-optimized.pdf')
    expect(outputNameFor(input, 'convert-images')).toBe('Annual Report.pdf')
  })

  it('formats byte sizes for queue summaries', () => {
    expect(fileSizeLabel(null)).toBe('—')
    expect(fileSizeLabel(1024)).toBe('1.0 KB')
    expect(fileSizeLabel(1024 * 1024)).toBe('1.0 MB')
  })
})
