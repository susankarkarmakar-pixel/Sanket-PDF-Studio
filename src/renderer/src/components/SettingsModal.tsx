import { X } from 'lucide-react'
import { useAppStore } from '../store'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { theme, setTheme, defaultZoom, setDefaultZoom } = useAppStore()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-panel-light)] dark:bg-[var(--color-panel-dark)] rounded-lg shadow-xl p-6 w-[400px] max-w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X size={20}/></button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block font-medium mb-2">Theme</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`px-4 py-2 rounded border ${theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 rounded border ${theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`px-4 py-2 rounded border ${theme === 'system' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                System
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">Default Zoom</label>
            <select
              value={defaultZoom.toString()}
              onChange={(e) => {
                const val = e.target.value
                if (val === 'page-width' || val === 'page-fit') {
                  setDefaultZoom(val)
                } else {
                  setDefaultZoom(parseFloat(val))
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent focus:border-primary outline-none"
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

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-lg">About</h3>
            <p className="text-sm text-gray-500 mt-1">Sanket PDF Studio</p>
            <p className="text-sm text-gray-500">Version 1.0.0, Susankar Karmakar</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded">Close</button>
        </div>
      </div>
    </div>
  )
}
