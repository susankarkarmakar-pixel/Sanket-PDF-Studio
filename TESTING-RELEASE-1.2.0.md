# Sanket PDF Studio 1.2.0 — Testing Release

This package contains the current validated testing build of Sanket PDF Studio.

## Included artifacts

| Platform     | File                                | Notes                                                                                       |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Windows x64  | `Sanket PDF Studio 1.2.0.exe`       | Portable executable for Windows 10/11 x64.                                                  |
| Linux x64    | `Sanket PDF Studio-1.2.0.AppImage`  | Make executable with `chmod +x` and launch directly.                                        |
| Linux x64    | `sanket-pdf-studio_1.2.0_amd64.deb` | Debian/Ubuntu package. Install with `sudo apt install ./sanket-pdf-studio_1.2.0_amd64.deb`. |
| Verification | `SHA256SUMS.txt`                    | SHA-256 checksums for the three testing artifacts.                                          |

## Main capabilities in this release

The release includes PDF viewing, thumbnails, keyboard navigation, page labels, search, bookmarks, drag-and-drop opening, recent files, annotations, annotation undo/redo, shapes, text formatting, true redaction, merge, split, extraction, page deletion, rotation, duplication, PDF insertion, blank-page insertion, image-to-PDF conversion, watermarks, page numbering, cropping, page-size normalization, metadata editing, encrypted-PDF opening, digital signing, PDF encryption, certificate metadata verification, platform-aware trust and revocation status, multilingual OCR layout preservation, page-level document comparison, batch image conversion, batch PDF optimization, target-size compression, autosave and recovery, command palette, onboarding, in-app feedback, runtime capability diagnostics, and pull-request CI checks.

## Offline OCR

All eight supported OCR language packs are bundled locally: English, Bengali, Hindi, Spanish, French, German, Japanese, and Simplified Chinese. The release also bundles the Tesseract.js worker and LSTM core/WASM resources. OCR uses a local Electron resource protocol and does not require first-use downloads from a CDN.

The supported language-data files are prepared from the official MIT-licensed `@tesseract.js-data` packages. The build verifies the presence and gzip headers of every traineddata file before packaging.

## Important runtime behavior

qpdf is bundled into the Windows and Linux testing packages for PDF encryption and optimization. The Settings dialog includes a Runtime capabilities section that reports whether qpdf and OpenSSL are available, whether qpdf was discovered from the bundled package or the system, and the detected versions.

Target-size compression is lossless and best-effort. If a PDF contains content that cannot be reduced without lossy image recompression or rasterization, the application reports that the requested maximum was not reached and saves the smallest valid output produced.

## Validation performed

The source repository passed TypeScript node and renderer checks, the regression suite, the offline OCR resource smoke test, the qpdf-backed compression benchmark, the cryptographic security smoke test including CMS verification, and the Electron production build. Linux AppImage and Debian packages were generated. The Windows portable executable was generated for x64 testing.

The Windows NSIS installer remains a separate packaging target and may require a Windows build runner or a verified Wine environment. The portable executable is supplied for testing and does not require installation.

## Basic test checklist

Open a PDF, navigate with keyboard controls, inspect bookmarks and thumbnails, add and edit annotations, test undo and redo, run page operations, edit metadata, open the Security dialog, verify a signed PDF if available, open an encrypted PDF, run OCR with English, Bengali, Hindi, Spanish, French, German, Japanese, and Simplified Chinese selections, disconnect network access and repeat OCR, compare two PDFs, run batch image conversion, run batch PDF optimization, enter a KB or MB target size, inspect Runtime capabilities in Settings, save an output PDF, close the application, and confirm autosave recovery behavior.

For Linux, test both the AppImage and Debian package. For Windows, copy the portable executable to a writable folder and run it directly. Please report the operating-system version, artifact name, reproduction steps, and any sample PDF that triggers a problem.
