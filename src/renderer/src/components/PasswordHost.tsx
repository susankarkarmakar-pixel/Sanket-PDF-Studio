import { FormEvent, useState } from 'react'
import { usePasswordStore } from '../passwordStore'

export function PasswordHost(): React.JSX.Element | null {
  const { request, resolvePassword } = usePasswordStore()
  const [password, setPassword] = useState('')
  if (!request) return null

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    resolvePassword(password)
    setPassword('')
  }

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-title"
      >
        <h2 id="password-title" className="text-lg font-semibold">
          Password required
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Enter the password to open this protected PDF.
        </p>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-4 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-gray-600"
          aria-label="PDF password"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setPassword('')
              resolvePassword(null)
            }}
            className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Open PDF
          </button>
        </div>
      </form>
    </div>
  )
}
