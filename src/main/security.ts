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

const execFileAsync = promisify(execFile)

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
    await execFileAsync('qpdf', args)
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
  const line = output.split(/\r?\n/).find((value) => value.startsWith(`${key}=`))
  return line ? line.slice(key.length + 1).trim() || null : null
}

export const verifyPdfSignature = async (
  pdfData: Uint8Array
): Promise<PdfSignatureVerification> => {
  if (!hasPdfSignature(pdfData)) {
    return {
      present: false,
      valid: false,
      signer: null,
      issuer: null,
      serialNumber: null,
      validFrom: null,
      validTo: null,
      fingerprint: null,
      error: null
    }
  }
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'sanket-pdf-verify-'))
  const signaturePath = join(temporaryDirectory, 'signature.der')
  const contentPath = join(temporaryDirectory, 'signed-content.bin')
  const certificatePath = join(temporaryDirectory, 'certificate.pem')
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

    let certificateOutput = ''
    try {
      await execFileAsync('openssl', [
        'pkcs7',
        '-inform',
        'DER',
        '-in',
        signaturePath,
        '-print_certs',
        '-out',
        certificatePath
      ])
      const certificate = await execFileAsync('openssl', [
        'x509',
        '-in',
        certificatePath,
        '-noout',
        '-subject',
        '-issuer',
        '-serial',
        '-startdate',
        '-enddate',
        '-fingerprint',
        '-sha256'
      ])
      certificateOutput = certificate.stdout
    } catch (certificateError) {
      error =
        error ||
        (certificateError instanceof Error
          ? certificateError.message
          : 'Signer certificate metadata could not be read.')
    }

    return {
      present: true,
      valid,
      signer: parseCertificateValue(certificateOutput, 'subject'),
      issuer: parseCertificateValue(certificateOutput, 'issuer'),
      serialNumber: parseCertificateValue(certificateOutput, 'serial'),
      validFrom: parseCertificateValue(certificateOutput, 'notBefore'),
      validTo: parseCertificateValue(certificateOutput, 'notAfter'),
      fingerprint: parseCertificateValue(certificateOutput, 'sha256 Fingerprint'),
      error
    }
  } catch (verificationError) {
    return {
      present: true,
      valid: false,
      signer: null,
      issuer: null,
      serialNumber: null,
      validFrom: null,
      validTo: null,
      fingerprint: null,
      error:
        verificationError instanceof Error
          ? verificationError.message
          : 'Unable to parse the PDF signature.'
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}
