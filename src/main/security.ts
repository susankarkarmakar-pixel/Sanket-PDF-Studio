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
