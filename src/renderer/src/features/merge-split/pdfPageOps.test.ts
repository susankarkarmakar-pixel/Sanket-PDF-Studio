import { describe, expect, it } from 'vitest'
import { parseRanges } from './pdfPageOps'

describe('parseRanges', () => {
  it('parses single pages, closed ranges, and open-ended ranges', () => {
    expect(parseRanges('1, 2-3, 5-', 6)).toEqual([[0], [1, 2], [4, 5]])
  })

  it('ignores empty comma-separated segments', () => {
    expect(parseRanges(' 1-2, , 4 ', 4)).toEqual([[0, 1], [3]])
  })

  it('rejects invalid or out-of-bounds ranges', () => {
    expect(() => parseRanges('0-2', 4)).toThrow('Invalid range: 0-2')
    expect(() => parseRanges('2-8', 4)).toThrow('Invalid range: 2-8')
    expect(() => parseRanges('4-2', 4)).toThrow('Invalid range: 4-2')
    expect(() => parseRanges('not-a-page', 4)).toThrow('Invalid range: not-a-page')
  })

  it('rejects an empty input', () => {
    expect(() => parseRanges(' , ', 4)).toThrow('No valid ranges provided')
  })
})
