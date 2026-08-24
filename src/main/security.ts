import { randomBytes } from 'crypto'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { PDFDocument } from 'pdf-lib'
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib'
import { SignPdf } from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'
import { extractSignature } from '@signpdf/utils'
import { getQpdfInvocation } from './runtime'

const execFileAsync = promisify(execFile)

type TrustStatus = 'trusted' | 'untrusted' | 'expired' | 'unknown'
type RevocationStatus = 'good' | 'revoked' | 'offline' | 'unknown' | 'not-available'

export interface SignPdfOptions {
  p12Data: Uint8Array
  passphrase: string
  name: string
  reason: string
  location: string
  contactInfo: string
}

export interface EncryptPdfOptions {
  userPassword: string
  ownerPassword?: string
  allowPrinting: boolean
  allowCopying: boolean
  allowAnnotations: boolean
  allowFormFilling: boolean
}

export interface PdfSignatureVerification {
  present: boolean
  valid: boolean
  signer: string | null
  issuer: string | null
  serialNumber: string | null
  validFrom: string | null
  validTo: string | null
  fingerprint: string | null
  trustStatus: TrustStatus
  trustSource: string | null
  revocationStatus: RevocationStatus
  revocationSource: string | null
  error: string | null
}

const requirePassword = (password: string, label: string): void => {
  if (password.length < 6) throw new Error(`${label} must contain at least 6 characters.`)
}

export const signPdfDocument = async (
  pdfData: Uint8Array,
  options: SignPdfOptions
): Promise<Uint8Array> => {
  requirePassword(options.passphrase, 'Certificate passphrase')
  if (!options.name.trim()) throw new Error('Signer name is required.')
  const pdfDoc = await PDFDocument.load(pdfData)
  pdflibAddPlaceholder({
    pdfDoc,
    reason: options.reason.trim() || 'Document approval',
    contactInfo: options.contactInfo.trim(),
    name: options.name.trim(),
    location: options.location.trim(),
    signingTime: new Date(),
    appName: 'Sanket PDF Studio',
    widgetRect: [0, 0, 0, 0]
  })
  const preparedPdf = await pdfDoc.save({ useObjectStreams: false })
  const signer = new P12Signer(Buffer.from(options.p12Data), { passphrase: options.passphrase })
  const signedPdf = await new SignPdf().sign(Buffer.from(preparedPdf), signer)
  return new Uint8Array(signedPdf)
}

export const encryptPdfDocument = async (
  pdfData: Uint8Array,
  options: EncryptPdfOptions
): Promise<Uint8Array> => {
  requirePassword(options.userPassword, 'User password')
  const ownerPassword = options.ownerPassword?.trim() || randomBytes(24).toString('base64url')
  requirePassword(ownerPassword, 'Owner password')
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'sanket-pdf-security-'))
  const inputPath = join(temporaryDirectory, 'input.pdf')
  const outputPath = join(temporaryDirectory, 'output.pdf')
  try {
    await writeFile(inputPath, Buffer.from(pdfData))
    const args = [
      '--encrypt',
      options.userPassword,
      ownerPassword,
      '256',
      `--print=${options.allowPrinting ? 'full' : 'none'}`,
      `--modify=${options.allowAnnotations || options.allowFormFilling ? 'annotate' : 'none'}`,
      `--annotate=${options.allowAnnotations ? 'y' : 'n'}`,
      `--form=${options.allowFormFilling ? 'y' : 'n'}`,
      `--extract=${options.allowCopying ? 'y' : 'n'}`,
      '--',
      inputPath,
      outputPath
    ]
    const qpdf = await getQpdfInvocation()
    await execFileAsync(qpdf.path, args, qpdf.env ? { env: qpdf.env } : undefined)
    return new Uint8Array(await readFile(outputPath))
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

export const hasPdfSignature = (pdfData: Uint8Array): boolean => {
  const content = Buffer.from(pdfData).toString('latin1')
  return content.includes('/Type /Sig') || content.includes('/Type/Sig')
}

const parseCertificateValue = (output: string, key: string): string | null => {
  const match = output.split(/\r?\n/).find((value) => new RegExp(`^${key}\\s*=`, 'i').test(value))
  if (!match) return null
  return match.replace(new RegExp(`^${key}\\s*=`, 'i'), '').trim() || null
}

const emptyVerification = (
  present: boolean,
  error: string | null = null
): PdfSignatureVerification => ({
  present,
  valid: false,
  signer: null,
  issuer: null,
  serialNumber: null,
  validFrom: null,
  validTo: null,
  fingerprint: null,
  trustStatus: 'unknown',
  trustSource: null,
  revocationStatus: 'unknown',
  revocationSource: null,
  error
})

const isCertificateExpired = (validFrom: string | null, validTo: string | null): boolean => {
  const now = Date.now()
  const start = validFrom ? Date.parse(validFrom) : Number.NaN
  const end = validTo ? Date.parse(validTo) : Number.NaN
  return (!Number.isNaN(start) && now < start) || (!Number.isNaN(end) && now > end)
}

const trustCertificate = async (
  certificatePath: string,
  chainPath: string
): Promise<{ status: TrustStatus; source: string; error: string | null }> => {
  try {
    if (process.platform === 'win32') {
      await execFileAsync('certutil', ['-verify', '-urlfetch', certificatePath])
      return { status: 'trusted', source: 'Windows certificate trust store', error: null }
    }
    if (process.platform === 'darwin') {
      await execFileAsync('security', ['verify-cert', '-p', 'basic', '-c', certificatePath])
      return { status: 'trusted', source: 'macOS Keychain trust store', error: null }
    }
    await execFileAsync('openssl', [
      'verify',
      '-CApath',
      '/etc/ssl/certs',
      '-purpose',
      'any',
      '-untrusted',
      chainPath,
      certificatePath
    ])
    return { status: 'trusted', source: 'Linux OpenSSL system trust store', error: null }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Certificate is not trusted by the platform.'
    const expired = /expired|not yet valid|certificate has expired/i.test(message)
    return {
      status: expired ? 'expired' : 'untrusted',
      source:
        process.platform === 'win32'
          ? 'Windows certificate trust store'
          : process.platform === 'darwin'
            ? 'macOS Keychain trust store'
            : 'Linux OpenSSL system trust store',
      error: message
    }
  }
}

const extractUrls = (text: string): string[] =>
  [...text.matchAll(/URI:([^\s,]+)/gi)]
    .map((match) => match[1])
    .filter((value) => /^https?:\/\//i.test(value))

const checkRevocation = async (
  certificatePath: string,
  issuerPath: string | null,
  chainPath: string,
  temporaryDirectory: string
): Promise<{ status: RevocationStatus; source: string | null; error: string | null }> => {
  let extensionOutput = ''
  try {
    const result = await execFileAsync('openssl', [
      'x509',
      '-in',
      certificatePath,
      '-noout',
      '-ocsp_uri',
      '-text'
    ])
    extensionOutput = result.stdout
  } catch (error) {
    return {
      status: 'unknown',
      source: null,
      error: error instanceof Error ? error.message : 'Unable to read revocation endpoints.'
    }
  }

  const ocspUri =
    extensionOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^https?:\/\//i.test(line)) || null
  if (ocspUri && issuerPath) {
    try {
      const result = await execFileAsync('openssl', [
        'ocsp',
        '-issuer',
        issuerPath,
        '-cert',
        certificatePath,
        '-url',
        ocspUri,
        '-CAfile',
        chainPath,
        '-no_nonce'
      ])
      const output = result.stdout.toLowerCase()
      if (output.includes('revoked'))
        return { status: 'revoked', source: `OCSP: ${ocspUri}`, error: null }
      if (output.includes('good'))
        return { status: 'good', source: `OCSP: ${ocspUri}`, error: null }
      return {
        status: 'unknown',
        source: `OCSP: ${ocspUri}`,
        error: 'OCSP returned an indeterminate response.'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OCSP request failed.'
      const offline =
        /timed out|timeout|network|connect|fetch|unable to resolve|temporary failure|connection refused/i.test(
          message
        )
      return { status: offline ? 'offline' : 'unknown', source: `OCSP: ${ocspUri}`, error: message }
    }
  }

  const crlUri = extractUrls(extensionOutput).find((url) => !url.includes(ocspUri || '__no_ocsp__'))
  if (crlUri) {
    const crlPath = join(temporaryDirectory, 'revocation.crl')
    try {
      const response = await fetch(crlUri)
      if (!response.ok) throw new Error(`CRL endpoint returned HTTP ${response.status}.`)
      await writeFile(crlPath, Buffer.from(await response.arrayBuffer()))
      const crlPemPath = join(temporaryDirectory, 'revocation.pem')
      try {
        await execFileAsync('openssl', [
          'crl',
          '-inform',
          'DER',
          '-in',
          crlPath,
          '-out',
          crlPemPath
        ])
      } catch {
        await execFileAsync('openssl', [
          'crl',
          '-inform',
          'PEM',
          '-in',
          crlPath,
          '-out',
          crlPemPath
        ])
      }
      if (!issuerPath)
        return {
          status: 'unknown',
          source: `CRL: ${crlUri}`,
          error: 'Issuer certificate is unavailable for CRL verification.'
        }
      await execFileAsync('openssl', [
        'verify',
        '-crl_check',
        '-CAfile',
        issuerPath,
        '-CRLfile',
        crlPemPath,
        certificatePath
      ])
      return { status: 'good', source: `CRL: ${crlUri}`, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CRL request failed.'
      const revoked = /certificate revoked|revoked/i.test(message)
      const offline =
        /timed out|timeout|network|connect|fetch|unable to resolve|temporary failure|connection refused/i.test(
          message
        )
      return {
        status: revoked ? 'revoked' : offline ? 'offline' : 'unknown',
        source: `CRL: ${crlUri}`,
        error: message
      }
    }
  }

  return { status: 'not-available', source: null, error: null }
}

export const verifyPdfSignature = async (
  pdfData: Uint8Array
): Promise<PdfSignatureVerification> => {
  if (!hasPdfSignature(pdfData)) return emptyVerification(false)
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'sanket-pdf-verify-'))
  const signaturePath = join(temporaryDirectory, 'signature.der')
  const contentPath = join(temporaryDirectory, 'signed-content.bin')
  const certificateBundlePath = join(temporaryDirectory, 'certificates.pem')
  const signerCertificatePath = join(temporaryDirectory, 'signer.pem')
  const issuerCertificatePath = join(temporaryDirectory, 'issuer.pem')
  try {
    const extracted = extractSignature(Buffer.from(pdfData))
    await writeFile(signaturePath, Buffer.from(extracted.signature, 'binary'))
    await writeFile(contentPath, extracted.signedData)
    let valid = false
    let error: string | null = null
    try {
      await execFileAsync('openssl', [
        'cms',
        '-verify',
        '-inform',
        'DER',
        '-in',
        signaturePath,
        '-content',
        contentPath,
        '-binary',
        '-noverify',
        '-out',
        '/dev/null'
      ])
      valid = true
    } catch (verificationError) {
      error =
        verificationError instanceof Error
          ? verificationError.message
          : 'Signature integrity verification failed.'
    }

    await execFileAsync('openssl', [
      'pkcs7',
      '-inform',
      'DER',
      '-in',
      signaturePath,
      '-print_certs',
      '-out',
      certificateBundlePath
    ])
    const certificateBundle = await readFile(certificateBundlePath, 'utf8')
    const certificates =
      certificateBundle.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || []
    if (certificates.length === 0)
      throw new Error('No signer certificate was embedded in the signature.')
    await writeFile(signerCertificatePath, `${certificates[0]}\n`)
    const issuerPath = certificates[1] ? issuerCertificatePath : null
    if (issuerPath) await writeFile(issuerPath, `${certificates.slice(1).join('\n')}\n`)
    const chainPath = join(temporaryDirectory, 'chain.pem')
    await writeFile(chainPath, `${certificates.join('\n')}\n`)

    const certificate = await execFileAsync('openssl', [
      'x509',
      '-in',
      signerCertificatePath,
      '-noout',
      '-subject',
      '-issuer',
      '-serial',
      '-startdate',
      '-enddate',
      '-fingerprint',
      '-sha256'
    ])
    const certificateOutput = certificate.stdout
    const validFrom = parseCertificateValue(certificateOutput, 'notBefore')
    const validTo = parseCertificateValue(certificateOutput, 'notAfter')
    const trust = isCertificateExpired(validFrom, validTo)
      ? {
          status: 'expired' as TrustStatus,
          source:
            process.platform === 'win32'
              ? 'Windows certificate trust store'
              : process.platform === 'darwin'
                ? 'macOS Keychain trust store'
                : 'Linux OpenSSL system trust store',
          error: 'The signer certificate is outside its validity period.'
        }
      : await trustCertificate(signerCertificatePath, chainPath)
    const revocation = await checkRevocation(
      signerCertificatePath,
      issuerPath,
      chainPath,
      temporaryDirectory
    )

    return {
      present: true,
      valid,
      signer: parseCertificateValue(certificateOutput, 'subject'),
      issuer: parseCertificateValue(certificateOutput, 'issuer'),
      serialNumber: parseCertificateValue(certificateOutput, 'serial'),
      validFrom,
      validTo,
      fingerprint: parseCertificateValue(certificateOutput, 'sha256 Fingerprint'),
      trustStatus: trust.status,
      trustSource: trust.source,
      revocationStatus: revocation.status,
      revocationSource: revocation.source,
      error: [error, trust.error, revocation.error].filter(Boolean).join(' ') || null
    }
  } catch (verificationError) {
    return {
      ...emptyVerification(
        true,
        verificationError instanceof Error
          ? verificationError.message
          : 'Unable to parse the PDF signature.'
      ),
      valid: false
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}
