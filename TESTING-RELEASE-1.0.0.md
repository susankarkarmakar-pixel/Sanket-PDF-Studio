# Sanket PDF Studio 1.0.0 — Testing Release

This package contains the current validated testing build of Sanket PDF Studio.

## Included artifacts

| Platform | File | Notes |
|---|---|---|
| Windows x64 | `Sanket PDF Studio 1.0.0.exe` | Portable executable. Run directly on Windows 10/11 x64. |
| Linux x64 | `Sanket PDF Studio-1.0.0.AppImage` | Make executable with `chmod +x` and launch directly. |
| Linux x64 | `sanket-pdf-studio_1.0.0_amd64.deb` | Debian/Ubuntu package. Install with `sudo apt install ./sanket-pdf-studio_1.0.0_amd64.deb`. |
| Verification | `SHA256SUMS.txt` | SHA-256 checksums for all three testing artifacts. |

## Main capabilities in this release

The release includes PDF viewing, thumbnails, search, bookmarks, keyboard navigation, recent files, drag-and-drop opening, annotation undo/redo, text formatting, shapes, signatures, redactions, multi-file merge, split, extraction, page deletion, rotation, duplication, PDF insertion, blank-page insertion, image-to-PDF conversion, watermarks, page numbering, cropping, page-size normalization, metadata editing, encrypted-PDF password prompts, in-app notifications and confirmations, autosave drafts, crash-recovery drafts, command palette, onboarding guidance, and PDF.js loading cleanup.

## Validation

The repository passed the TypeScript node and renderer checks, the regression suite with 15 tests, and the production Electron build. Linux AppImage and Debian packages were generated successfully. The Windows portable executable was generated successfully for x64 testing.

The Windows NSIS setup target could not be completed in the Linux build environment because the available Wine runtime could not launch the generated installer for verification. The portable Windows executable is provided as the Windows testing artifact and does not require installation.

## Basic test checklist

Open a PDF, navigate with the arrow/PageUp/PageDown/Home/End keys, open the bookmarks panel, add and edit an annotation, test undo and redo, select pages in the thumbnail panel, run page operations, open Document Tools, edit metadata, use the command palette with `Ctrl/Cmd+K`, save an output PDF, and reopen an encrypted PDF if one is available.

For Linux, test both the AppImage and Debian package. For Windows, copy the portable executable to a writable folder and run it directly. Please report the operating-system version, the artifact name, the reproduction steps, and any sample PDF that triggers a problem.
