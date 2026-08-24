import { mkdir, writeFile } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { afterAll, describe, expect, it } from 'vitest'
import { optimizePdfDocument } from '../src/main/batch'

const execFileAsync = promisify(execFile)
const REPORT_PATH = 'benchmark-results/compression.json'
const ITERATIONS = 3

interface BenchmarkCase {
  name: 'small' | 'medium' | 'large'
  pages: number
  rowsPerPage: number
}

interface BenchmarkResult {
  name: BenchmarkCase['name']
  pages: number
  inputBytes: number
  outputBytes: number
  reductionPercent: number
  compressionRatio: number
  averageMs: number
  minMs: number
  maxMs: number
  peakRssBytes: number
  targetBytes: number
  targetReached: boolean
  iterations: number
}

const cases: BenchmarkCase[] = [
  { name: 'small', pages: 1, rowsPerPage: 15 },
  { name: 'medium', pages: 25, rowsPerPage: 70 },
  { name: 'large', pages: 100, rowsPerPage: 100 }
]

const createFixture = async ({ pages, rowsPerPage }: BenchmarkCase): Promise<Uint8Array> => {
  const document = await PDFDocument.create()
  const font = await document.embedFont(StandardFonts.Helvetica)
  const line = 'Benchmark content for compression performance measurement. '
  const repeatedLine = line.repeat(5)

  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const page = document.addPage([612, 792])
    page.drawText(`Compression benchmark page ${pageIndex + 1}`, {
      x: 48,
      y: 750,
      size: 14,
      font,
      color: rgb(0.1, 0.2, 0.4)
    })
    for (let row = 0; row < rowsPerPage; row += 1) {
      page.drawText(`${row + 1}. ${repeatedLine}`, {
        x: 48,
        y: 725 - row * 10,
        size: 7,
        font,
        color: rgb(0.15, 0.15, 0.15)
      })
    }
  }

  return document.save({ useObjectStreams: false })
}

const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const runBenchmark = async (testCase: BenchmarkCase): Promise<BenchmarkResult> => {
  const input = await createFixture(testCase)
  const targetBytes = Math.floor(input.byteLength * 0.9)
  const durations: number[] = []
  let output = new Uint8Array()
  let peakRssBytes = process.memoryUsage().rss

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const start = performance.now()
    output = await optimizePdfDocument(input, {
      compressionLevel: 6,
      generateObjectStreams: true,
      recompressStreams: true,
      linearize: false,
      targetSizeBytes: targetBytes
    })
    durations.push(performance.now() - start)
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss)
  }

  const averageMs = durations.reduce((sum, value) => sum + value, 0) / durations.length
  const reductionPercent = ((input.byteLength - output.byteLength) / input.byteLength) * 100

  return {
    name: testCase.name,
    pages: testCase.pages,
    inputBytes: input.byteLength,
    outputBytes: output.byteLength,
    reductionPercent: round(reductionPercent),
    compressionRatio: round(output.byteLength / input.byteLength, 4),
    averageMs: round(averageMs),
    minMs: round(Math.min(...durations)),
    maxMs: round(Math.max(...durations)),
    peakRssBytes,
    targetBytes,
    targetReached: output.byteLength <= targetBytes,
    iterations: ITERATIONS
  }
}

describe('PDF compression performance benchmark', () => {
  let report: {
    generatedAt: string
    nodeVersion: string
    qpdfVersion: string
    results: BenchmarkResult[]
  } | null = null

  it('benchmarks small, medium, and large representative PDFs', async () => {
    const qpdf = await execFileAsync('qpdf', ['--version'])
    const results: BenchmarkResult[] = []

    for (const testCase of cases) {
      const result = await runBenchmark(testCase)
      expect(result.outputBytes).toBeGreaterThan(0)
      expect(result.outputBytes).toBeLessThanOrEqual(result.inputBytes * 1.1)
      const optimizedDocument = await PDFDocument.load(
        await optimizePdfDocument(await createFixture(testCase), { targetSizeBytes: null })
      )
      expect(optimizedDocument.getPageCount()).toBe(testCase.pages)
      results.push(result)
    }

    report = {
      generatedAt: new Date().toISOString(),
      nodeVersion: process.version,
      qpdfVersion: qpdf.stdout.trim().split(/\r?\n/)[0],
      results
    }

    await mkdir('benchmark-results', { recursive: true })
    await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

    expect(results.map((result) => result.name)).toEqual(['small', 'medium', 'large'])
    expect(results.map((result) => result.pages)).toEqual([1, 25, 100])
  }, 120_000)

  afterAll(() => {
    if (report) {
      console.table(
        report.results.map(
          ({ name, inputBytes, outputBytes, reductionPercent, averageMs, targetReached }) => ({
            size: name,
            inputBytes,
            outputBytes,
            reductionPercent,
            averageMs,
            targetReached
          })
        )
      )
      console.log(`Benchmark report written to ${REPORT_PATH}`)
    }
  })
})
