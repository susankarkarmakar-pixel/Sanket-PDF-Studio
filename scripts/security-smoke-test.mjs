import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib'
import { SignPdf } from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'

const root = process.cwd()
const temp = join(root, '.security-smoke')
rmSync(temp, { recursive: true, force: true })
mkdirSync(temp, { recursive: true })

const createSample = async () => {
  const pdf = await PDFDocument.create()
  pdf.addPage([300, 300])
  writeFileSync(join(temp, 'sample.pdf'), await pdf.save())
}

const main = async () => {
  await createSample()
  execFileSync('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-keyout',
    join(temp, 'key.pem'),
    '-out',
    join(temp, 'cert.pem'),
    '-days',
    '1',
    '-nodes',
    '-subj',
    '/CN=Sanket PDF Studio Test'
  ])
  execFileSync('openssl', [
    'pkcs12',
    '-export',
    '-out',
    join(temp, 'test.p12'),
    '-inkey',
    join(temp, 'key.pem'),
    '-in',
    join(temp, 'cert.pem'),
    '-passout',
    'pass:testpass'
  ])

  const pdf = await PDFDocument.load(readFileSync(join(temp, 'sample.pdf')))
  pdflibAddPlaceholder({
    pdfDoc: pdf,
    reason: 'Security smoke test',
    contactInfo: 'test@example.invalid',
    name: 'Sanket Test',
    location: 'Local test',
    appName: 'Sanket PDF Studio',
    widgetRect: [0, 0, 0, 0]
  })
  const prepared = await pdf.save({ useObjectStreams: false })
  const signer = new P12Signer(readFileSync(join(temp, 'test.p12')), { passphrase: 'testpass' })
  const signed = await new SignPdf().sign(prepared, signer)
  writeFileSync(join(temp, 'signed.pdf'), signed)
  if (!signed.toString('latin1').includes('/Type /Sig'))
    throw new Error('Signed PDF did not contain a signature dictionary')

  execFileSync('qpdf', [
    '--encrypt',
    'userpass',
    'ownerpass',
    '256',
    '--print=none',
    '--modify=none',
    '--annotate=n',
    '--form=n',
    '--extract=n',
    '--',
    join(temp, 'sample.pdf'),
    join(temp, 'encrypted.pdf')
  ])
  const encrypted = readFileSync(join(temp, 'encrypted.pdf'))
  if (!encrypted.toString('latin1').includes('/Encrypt'))
    throw new Error('Encrypted PDF did not contain an encryption dictionary')
  console.log('security smoke test passed')
}

await main()
rmSync(temp, { recursive: true, force: true })
