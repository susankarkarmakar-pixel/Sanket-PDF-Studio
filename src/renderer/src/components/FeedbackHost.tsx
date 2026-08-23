import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useFeedbackStore } from '../feedbackStore'

const toneClasses = {
  info: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
  success:
    'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
  error:
    'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
}

export function FeedbackHost(): React.JSX.Element {
  const { toasts, confirmation, dismissToast, resolveConfirmation } = useFeedbackStore()

  return (
    <>
      <div
        className="fixed right-4 top-16 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg ${toneClasses[toast.tone]}`}
            role="status"
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : toast.tone === 'error' ? (
              <XCircle size={18} className="mt-0.5 shrink-0" />
            ) : (
              <Info size={18} className="mt-0.5 shrink-0" />
            )}
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded p-0.5 hover:bg-black/10"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {confirmation && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
          >
            <h2 id="confirmation-title" className="text-lg font-semibold">
              {confirmation.title}
            </h2>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{confirmation.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => resolveConfirmation(false)}
                className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveConfirmation(true)}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
