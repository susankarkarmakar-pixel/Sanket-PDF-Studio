# Sanket PDF Studio 1.2.1 — Windows Packaging Fix

Version 1.2.1 is a corrective testing release for the Windows startup error reported in version 1.2.0.

## Fixed issue

The Windows packaged application could fail at startup with:

```text
A JavaScript error occurred in the main process
Error: Cannot find module 'node-forge'
Require stack:
.../P12Signer.js
```

`@signpdf/signer-p12` declares `node-forge` as a peer dependency. The application used the signer but did not declare `node-forge` directly, so electron-builder could omit it from the packaged application. Version 1.2.1 declares `node-forge` as a production dependency and includes a packaged-dependency smoke test that verifies the signer, node-forge, and signpdf utility files are present in `app.asar`.

## Windows artifact

| Platform | File | Notes |
|---|---|---|
| Windows x64 | `Sanket PDF Studio 1.2.1.exe` | Portable executable. Copy it to a writable folder and launch directly. |
| Verification | `SHA256SUMS.txt` | SHA-256 checksum for the Windows artifact. |

The Windows portable package includes the qpdf runtime, offline OCR worker/core resources, all eight OCR language packs, and the corrected signing dependency chain.

## Verification checklist

1. Download the version 1.2.1 Windows portable executable.
2. Verify the SHA-256 checksum using PowerShell:

   ```powershell
   Get-FileHash '.\\Sanket PDF Studio 1.2.1.exe' -Algorithm SHA256
   ```

3. Launch the application from a writable folder.
4. Open Settings and confirm Runtime capabilities are visible.
5. Open the Security dialog and confirm it loads without a main-process error.
6. Open a PDF and test encryption.
7. If a PKCS#12 certificate is available, test signing and signature verification.
8. Test OCR with network access disabled.
9. Test batch optimization and target-size compression.

If Windows SmartScreen displays a warning, use the release checksum and confirm that the executable was downloaded from the official GitHub release. The portable artifact is intended for testing and is not code-signed with a production certificate.

## Validation performed

The source passed TypeScript validation, the full 33-test regression suite, the cryptographic security smoke test with CMS verification, the production build, and the packaged-dependency smoke test against the Windows `app.asar`. The Windows portable artifact was built with the sandbox's low-memory archive setting.
