import { useEffect, useState } from 'react'
import { LockKeyhole, PenLine, ShieldCheck, X } from 'lucide-react'
import { useAppStore } from '../../store'
import { useFeedbackStore } from '../../feedbackStore'
import type {
  EncryptPdfOptions,
  PdfSignatureVerification,
  SignPdfOptions
} from '../../../../preload/index.d'

interface SecurityModalProps {
  onClose: () => void
}

type SecurityTab = 'sign' | 'encrypt'

export function SecurityModal({ onClose }: SecurityModalProps): React.JSX.Element {
  const { pdfData, setPdf } = useAppStore()
  const { notify } = useFeedbackStore()
  const [tab, setTab] = useState<SecurityTab>('sign')
  const [certificate, setCertificate] = useState<Uint8Array | null>(null)
  const [certificateName, setCertificateName] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [signerName, setSignerName] = useState('')
  const [reason, setReason] = useState('Document approval')
  const [location, setLocation] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [allowCopying, setAllowCopying] = useState(false)
  const [allowAnnotations, setAllowAnnotations] = useState(true)
  const [allowFormFilling, setAllowFormFilling] = useState(true)
  const [hasSignature, setHasSignature] = useState(false)
  const [verification, setVerification] = useState<PdfSignatureVerification | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!pdfData) return
    setVerification(null)
    void window.api
      .hasSignature(pdfData)
      .then(setHasSignature)
      .catch(() => setHasSignature(false))
  }, [pdfData])

  const handleVerify = async (): Promise<void> => {
    if (!pdfData || isVerifying) return
    setIsVerifying(true)
    try {
      setVerification(await window.api.verifySignature(pdfData))
    } catch (error) {
      setVerification({
        present: true,
        valid: false,
        signer: null,
        issuer: null,
        serialNumber: null,
        validFrom: null,
        validTo: null,
        fingerprint: null,
        error: error instanceof Error ? error.message : 'Signature verification failed.'
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCertificate = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return
    setCertificate(new Uint8Array(await file.arrayBuffer()))
    setCertificateName(file.name)
  }

  const saveOutput = async (
    data: Uint8Array,
    defaultName: string,
    message: string
  ): Promise<void> => {
    const savedPath = await window.api.saveFile(data, defaultName)
    if (!savedPath) return
    setPdf(savedPath, data)
    useAppStore.getState().addRecentFile(savedPath, savedPath.split(/[\\/]/).pop() || defaultName)
    notify(message, 'success')
    onClose()
  }

  const handleSign = async (): Promise<void> => {
    if (!pdfData || !certificate || isProcessing) return
    setIsProcessing(true)
    try {
      const options: SignPdfOptions = {
        p12Data: certificate,
        passphrase,
        name: signerName,
        reason,
        location,
        contactInfo
      }
      await saveOutput(
        await window.api.signPdf(pdfData, options),
        'digitally-signed.pdf',
        'PDF digitally signed successfully.'
      )
    } catch (error) {
      console.error(error)
      notify(error instanceof Error ? error.message : 'Unable to digitally sign this PDF.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEncrypt = async (): Promise<void> => {
    if (!pdfData || isProcessing) return
    setIsProcessing(true)
    try {
      const options: EncryptPdfOptions = {
        userPassword,
        ownerPassword,
        allowPrinting,
        allowCopying,
        allowAnnotations,
        allowFormFilling
      }
      await saveOutput(
        await window.api.encryptPdf(pdfData, options),
        'encrypted-document.pdf',
        'Encrypted PDF saved successfully.'
      )
    } catch (error) {
      console.error(error)
      notify(error instanceof Error ? error.message : 'Unable to encrypt this PDF.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="security-title" className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck size={20} /> PDF Security
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded p-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
            aria-label="Close security dialog"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mt-5 flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setTab('sign')}
            className={`flex items-center gap-2 px-4 py-2 text-sm ${tab === 'sign' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
          >
            <PenLine size={16} /> Digital signature
          </button>
          <button
            type="button"
            onClick={() => setTab('encrypt')}
            className={`flex items-center gap-2 px-4 py-2 text-sm ${tab === 'encrypt' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
          >
            <LockKeyhole size={16} /> Encryption
          </button>
        </div>
        {tab === 'sign' && (
          <div className="space-y-3 pt-5">
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Digital signatures require a PKCS#12 certificate (`.p12` or `.pfx`). Any later PDF
              edit will invalidate the signature.
            </p>
            {hasSignature && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">
                <div className="flex items-center justify-between gap-3">
                  <span>This document contains a PDF signature field.</span>
                  <button
                    type="button"
                    onClick={() => void handleVerify()}
                    disabled={isVerifying}
                    className="rounded bg-green-700 px-3 py-1 text-white disabled:opacity-50"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify signature'}
                  </button>
                </div>
                {verification && (
                  <div
                    className="mt-3 space-y-1 border-t border-green-200 pt-3 text-xs dark:border-green-800"
                    aria-live="polite"
                  >
                    <p className="font-semibold">
                      {verification.valid
                        ? 'Signature integrity valid'
                        : 'Signature integrity could not be verified'}
                    </p>
                    {verification.signer && <p>Signer: {verification.signer}</p>}
                    {verification.issuer && <p>Issuer: {verification.issuer}</p>}
                    {verification.serialNumber && <p>Serial: {verification.serialNumber}</p>}
                    {verification.validFrom && <p>Valid from: {verification.validFrom}</p>}
                    {verification.validTo && <p>Valid to: {verification.validTo}</p>}
                    {verification.fingerprint && (
                      <p className="break-all">SHA-256: {verification.fingerprint}</p>
                    )}
                    {verification.error && (
                      <p className="break-words">Details: {verification.error}</p>
                    )}
                    <p className="mt-2">
                      Integrity is checked against the embedded signature. Certificate trust and
                      revocation are not evaluated.
                    </p>
                  </div>
                )}
              </div>
            )}
            <label className="block text-sm font-medium">
              Certificate file
              <input
                type="file"
                accept=".p12,.pfx,application/x-pkcs12"
                onChange={(event) => void handleCertificate(event)}
                disabled={isProcessing}
                className="mt-1 block w-full text-sm"
              />
              {certificateName && (
                <span className="text-xs text-gray-500">Selected: {certificateName}</span>
              )}
            </label>
            <label className="block text-sm font-medium">
              Certificate passphrase
              <input
                type="password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                disabled={isProcessing}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
              />
            </label>
            <label className="block text-sm font-medium">
              Signer name
              <input
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                disabled={isProcessing}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium">
                Reason
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={isProcessing}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
                />
              </label>
              <label className="block text-sm font-medium">
                Location
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  disabled={isProcessing}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Contact information
              <input
                value={contactInfo}
                onChange={(event) => setContactInfo(event.target.value)}
                disabled={isProcessing}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
              />
            </label>
          </div>
        )}
        {tab === 'encrypt' && (
          <div className="space-y-3 pt-5">
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
              Encryption is applied to a new PDF copy. The original file is not overwritten.
            </p>
            <label className="block text-sm font-medium">
              User password
              <input
                type="password"
                value={userPassword}
                onChange={(event) => setUserPassword(event.target.value)}
                disabled={isProcessing}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
              />
            </label>
            <label className="block text-sm font-medium">
              Owner password <span className="font-normal text-gray-500">(optional)</span>
              <input
                type="password"
                value={ownerPassword}
                onChange={(event) => setOwnerPassword(event.target.value)}
                disabled={isProcessing}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
              />
            </label>
            <fieldset className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <legend className="px-1 text-sm font-medium">Permissions</legend>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                {(
                  [
                    ['Print', allowPrinting, setAllowPrinting],
                    ['Copy text', allowCopying, setAllowCopying],
                    ['Annotations', allowAnnotations, setAllowAnnotations],
                    ['Fill forms', allowFormFilling, setAllowFormFilling]
                  ] as const
                ).map(([label, checked, setter]) => (
                  <label key={label} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => setter(event.target.checked)}
                      disabled={isProcessing}
                      className="accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void (tab === 'sign' ? handleSign() : handleEncrypt())}
            disabled={isProcessing || !pdfData || (tab === 'sign' ? !certificate : !userPassword)}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isProcessing
              ? 'Processing...'
              : tab === 'sign'
                ? 'Sign and Save As'
                : 'Encrypt and Save As'}
          </button>
        </div>
      </div>
    </div>
  )
}
