import { FileImage, FolderOutput, Gauge, Play, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useFeedbackStore } from '../../feedbackStore'
import {
  convertImageToPdf,
  fileSizeLabel,
  optimizePdf,
  outputNameFor,
  parseTargetSize,
  type BatchItem,
  type BatchMode,
  type BatchOptimizeOptions,
  type TargetSizeUnit
} from './batchProcessing'

interface BatchProcessingModalProps {
  onClose: () => void
}

const initialOptions: BatchOptimizeOptions = {
  linearize: false,
  generateObjectStreams: true,
  recompressStreams: true,
  compressionLevel: 6,
  targetSizeBytes: null
}

const displayName = (path: string): string => path.split(/[\\/]/).pop() || path

export function BatchProcessingModal({ onClose }: BatchProcessingModalProps): React.JSX.Element {
  const { notify } = useFeedbackStore()
  const [mode, setMode] = useState<BatchMode>('optimize-pdfs')
  const [items, setItems] = useState<BatchItem[]>([])
  const [outputDirectory, setOutputDirectory] = useState<string | null>(null)
  const [options, setOptions] = useState<BatchOptimizeOptions>(initialOptions)
  const [targetValue, setTargetValue] = useState('')
  const [targetUnit, setTargetUnit] = useState<TargetSizeUnit>('MB')
  const [isProcessing, setIsProcessing] = useState(false)
  const cancelRequested = useRef(false)

  const updateItem = (id: string, update: Partial<BatchItem>): void => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...update } : item)))
  }

  const chooseInputs = async (): Promise<void> => {
    const files =
      mode === 'convert-images' ? await window.api.openImages() : await window.api.openFiles()
    if (files.length === 0) return
    setItems((current) => {
      const existing = new Set(current.map((item) => item.input.path))
      const additions = files
        .filter((file) => !existing.has(file.path))
        .map((input, index) => ({
          id: `${Date.now()}-${index}-${input.path}`,
          input,
          status: 'queued' as const,
          outputPath: null,
          originalBytes: input.data.byteLength,
          outputBytes: null,
          targetReached: null,
          error: null
        }))
      return [...current, ...additions]
    })
  }

  const changeMode = (nextMode: BatchMode): void => {
    if (isProcessing || nextMode === mode) return
    setMode(nextMode)
    setItems([])
  }

  const handleRun = async (): Promise<void> => {
    if (isProcessing || items.length === 0) return
    if (!outputDirectory) {
      notify('Choose an output folder before starting the batch.', 'error')
      return
    }

    let targetBytes: number | null = null
    if (mode === 'optimize-pdfs') {
      try {
        targetBytes = parseTargetSize(targetValue, targetUnit)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Enter a valid target size.', 'error')
        return
      }
    }

    const runOptions = { ...options, targetSizeBytes: targetBytes }
    cancelRequested.current = false
    setIsProcessing(true)
    setItems((current) =>
      current.map((item) => ({ ...item, status: 'queued', error: null, targetReached: null }))
    )
    let completed = 0
    let failed = 0

    for (const item of items) {
      if (cancelRequested.current) {
        updateItem(item.id, { status: 'cancelled' })
        continue
      }

      updateItem(item.id, { status: 'processing', error: null })
      try {
        const output =
          mode === 'convert-images'
            ? await convertImageToPdf(item.input)
            : await optimizePdf(item.input, runOptions)
        if (cancelRequested.current) {
          updateItem(item.id, { status: 'cancelled' })
          continue
        }
        const savedPath = await window.api.writeOutputFile(
          output,
          outputDirectory,
          outputNameFor(item.input, mode)
        )
        if (!savedPath) throw new Error('The output file could not be written.')
        updateItem(item.id, {
          status: 'completed',
          outputPath: savedPath,
          outputBytes: output.byteLength,
          targetReached: targetBytes === null ? null : output.byteLength <= targetBytes
        })
        completed += 1
      } catch (error) {
        failed += 1
        updateItem(item.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'This file could not be processed.'
        })
      }
    }

    setIsProcessing(false)
    if (cancelRequested.current) {
      notify(`Batch stopped. ${completed} completed, ${failed} failed.`, 'error')
    } else {
      notify(
        `Batch finished. ${completed} completed, ${failed} failed.`,
        failed ? 'error' : 'success'
      )
    }
  }

  const completedCount = items.filter((item) => item.status === 'completed').length
  const targetReachedCount = items.filter((item) => item.targetReached === true).length
  const finishedCount = items.filter((item) =>
    ['completed', 'failed', 'cancelled'].includes(item.status)
  ).length
  const progress = items.length === 0 ? 0 : Math.round((finishedCount / items.length) * 100)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-processing-title"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="batch-processing-title" className="text-lg font-semibold">
              Batch processing
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Convert or optimize multiple files locally in one queue.
            </p>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
            aria-label="Close batch processing dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => changeMode('optimize-pdfs')}
            className={`rounded-lg border p-3 text-left ${mode === 'optimize-pdfs' ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Gauge size={18} /> Optimize PDFs
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Compress streams, object streams, and optionally linearize.
            </p>
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => changeMode('convert-images')}
            className={`rounded-lg border p-3 text-left ${mode === 'convert-images' ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <div className="flex items-center gap-2 font-medium">
              <FileImage size={18} /> Convert images to PDFs
            </div>
            <p className="mt-1 text-xs text-gray-500">Create one PDF per PNG or JPEG image.</p>
          </button>
        </div>

        {mode === 'optimize-pdfs' && (
          <fieldset className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <legend className="px-1 text-sm font-medium">Optimization options</legend>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.recompressStreams}
                  disabled={isProcessing}
                  onChange={(event) =>
                    setOptions({ ...options, recompressStreams: event.target.checked })
                  }
                  className="accent-primary"
                />
                Recompress streams
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.generateObjectStreams}
                  disabled={isProcessing}
                  onChange={(event) =>
                    setOptions({ ...options, generateObjectStreams: event.target.checked })
                  }
                  className="accent-primary"
                />
                Generate object streams
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.linearize}
                  disabled={isProcessing}
                  onChange={(event) => setOptions({ ...options, linearize: event.target.checked })}
                  className="accent-primary"
                />
                Fast web view
              </label>
            </div>
            <label className="mt-3 flex items-center gap-3 text-sm">
              Compression level
              <input
                type="range"
                min={0}
                max={9}
                value={options.compressionLevel}
                disabled={isProcessing}
                onChange={(event) =>
                  setOptions({ ...options, compressionLevel: Number(event.target.value) })
                }
                className="flex-1 accent-primary"
              />
              <span className="w-4 text-right">{options.compressionLevel}</span>
            </label>
            <div className="mt-4 rounded-md bg-gray-50 p-3 dark:bg-gray-800/70">
              <label
                className="flex items-center gap-2 text-sm font-medium"
                htmlFor="batch-target-size"
              >
                Maximum output size
                <input
                  id="batch-target-size"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={targetValue}
                  disabled={isProcessing}
                  onChange={(event) => setTargetValue(event.target.value)}
                  placeholder="Optional"
                  className="w-28 rounded border border-gray-300 bg-white px-2 py-1 text-right dark:border-gray-600 dark:bg-gray-900"
                />
                <select
                  aria-label="Target size unit"
                  value={targetUnit}
                  disabled={isProcessing}
                  onChange={(event) => setTargetUnit(event.target.value as TargetSizeUnit)}
                  className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                >
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Best effort maximum. The original content is preserved; some PDFs cannot reach a
                smaller target without lossy image recompression.
              </p>
            </div>
          </fieldset>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => void chooseInputs()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Add {mode === 'convert-images' ? 'images' : 'PDFs'}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() =>
              void window.api
                .selectOutputDirectory()
                .then((path) => path && setOutputDirectory(path))
            }
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <FolderOutput size={16} />{' '}
            {outputDirectory ? displayName(outputDirectory) : 'Choose output folder'}
          </button>
          <button
            type="button"
            disabled={isProcessing || items.length === 0}
            onClick={() => setItems([])}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <Trash2 size={16} /> Clear queue
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          {items.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">Add files to begin.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" title={item.input.path}>
                      {displayName(item.input.path)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fileSizeLabel(item.originalBytes)}
                      {item.outputBytes === null ? '' : ` → ${fileSizeLabel(item.outputBytes)}`}
                    </p>
                    {item.targetReached !== null && item.outputBytes !== null && (
                      <p
                        className={`mt-1 text-xs ${item.targetReached ? 'text-green-600' : 'text-amber-600 dark:text-amber-400'}`}
                      >
                        {item.targetReached
                          ? 'Target size reached'
                          : 'Target not reached; best effort output'}
                      </p>
                    )}
                    {item.error && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{item.error}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs ${item.status === 'completed' ? 'text-green-600' : item.status === 'failed' ? 'text-red-600' : item.status === 'processing' ? 'text-primary' : 'text-gray-500'}`}
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {completedCount} of {items.length} completed
                {targetValue.trim() && mode === 'optimize-pdfs'
                  ? ` · ${targetReachedCount} met target`
                  : ''}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
          >
            Close
          </button>
          {isProcessing ? (
            <button
              type="button"
              onClick={() => {
                cancelRequested.current = true
              }}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
            >
              Stop after current file
            </button>
          ) : (
            <button
              type="button"
              disabled={items.length === 0 || !outputDirectory}
              onClick={() => void handleRun()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              <Play size={16} /> Start batch
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
