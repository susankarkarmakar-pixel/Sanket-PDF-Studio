import { AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import type { RuntimeCapabilities, RuntimeToolStatus } from '../../../preload/index.d'

interface SettingsModalProps {
  onClose: () => void
}

const statusLabel = (status: RuntimeToolStatus): string => {
  if (status.available)
    return status.source === 'bundled' ? 'Bundled and available' : 'System and available'
  return 'Unavailable'
}

export function SettingsModal({ onClose }: SettingsModalProps): React.JSX.Element {
  const { theme, setTheme, defaultZoom, setDefaultZoom } = useAppStore()
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities | null>(null)
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(true)

  const refreshCapabilities = async (): Promise<void> => {
    setIsLoadingCapabilities(true)
    try {
      setCapabilities(await window.api.getRuntimeCapabilities())
    } catch (error) {
      console.error('Failed to load runtime capabilities:', error)
      setCapabilities(null)
    } finally {
      setIsLoadingCapabilities(false)
    }
  }

  useEffect(() => {
    void refreshCapabilities()
  }, [])

  const renderToolStatus = (
    label: string,
    status: RuntimeToolStatus | undefined
  ): React.JSX.Element => {
    const available = status?.available === true
    return (
      <div className="flex items-start justify-between gap-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {status
              ? statusLabel(status)
              : isLoadingCapabilities
                ? 'Checking...'
                : 'No diagnostic data'}
          </p>
          {status?.version && (
            <p className="mt-1 font-mono text-[11px] text-gray-500">{status.version}</p>
          )}
        </div>
        {available ? (
          <CheckCircle2
            size={18}
            className="shrink-0 text-green-600"
            aria-label={`${label} available`}
          />
        ) : (
          <AlertTriangle
            size={18}
            className="shrink-0 text-amber-600"
            aria-label={`${label} unavailable`}
          />
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-panel-light)] p-6 text-gray-900 shadow-xl dark:bg-[var(--color-panel-dark)] dark:text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id="settings-title" className="text-xl font-bold">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block font-medium">Theme</label>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`rounded border px-4 py-2 capitalize ${theme === value ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800'}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block font-medium">Default Zoom</label>
            <select
              value={defaultZoom.toString()}
              onChange={(event) => {
                const value = event.target.value
                setDefaultZoom(
                  value === 'page-width' || value === 'page-fit' ? value : Number.parseFloat(value)
                )
              }}
              className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-gray-600"
            >
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
              <option value="page-width">Fit Width</option>
              <option value="page-fit">Fit Page</option>
            </select>
          </div>

          <section
            className="border-t border-gray-200 pt-5 dark:border-gray-700"
            aria-labelledby="runtime-title"
          >
            <div className="flex items-center justify-between">
              <h3 id="runtime-title" className="font-semibold">
                Runtime capabilities
              </h3>
              <button
                onClick={() => void refreshCapabilities()}
                disabled={isLoadingCapabilities}
                className="rounded p-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                title="Refresh runtime diagnostics"
                aria-label="Refresh runtime diagnostics"
              >
                <RefreshCw size={16} className={isLoadingCapabilities ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              qpdf is required for encryption and PDF optimization. OpenSSL is used by signature
              verification. OCR uses the bundled worker, core, and language packs.
            </p>
            <div className="mt-3 space-y-2">
              {renderToolStatus('qpdf', capabilities?.qpdf)}
              {renderToolStatus('OpenSSL', capabilities?.openssl)}
              {renderToolStatus('Offline OCR', capabilities?.ocr)}
            </div>
          </section>

          <div className="border-t border-gray-200 pt-5 dark:border-gray-700">
            <h3 className="text-lg font-semibold">About</h3>
            <p className="mt-1 text-sm text-gray-500">Sanket PDF Studio</p>
            <p className="text-sm text-gray-500">Version 1.0.0, Susankar Karmakar</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
