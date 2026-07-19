# 📄 Sanket PDF Studio

Sanket PDF Studio is a modern, offline-first, cross-platform PDF Viewer & Editor built with Electron, React, TypeScript, and PDF.js.

Designed for professionals, students, and government offices, it provides a fast, secure, and privacy-focused PDF experience without requiring an internet connection.

## ✨ Features

- 📖 Fast PDF Viewer
- ✏️ PDF Annotation
- 📝 Text Editing
- 🔍 Full Text Search
- 📑 Thumbnail Navigation
- 🔄 Merge & Split PDFs
- 📄 Rearrange Pages
- ✂️ Extract Pages
- ✒️ Digital Signature
- 🖨️ Print Support
- 🌙 Dark Mode
- ⚡ Offline First
- 🔒 Privacy Focused
- 💻 Windows & Linux Support

## 🚀 Tech Stack

- Electron
- React
- TypeScript
- Vite
- PDF.js
- pdf-lib
- Tailwind CSS

## 🎯 Vision

To build a lightweight, modern, and completely offline alternative to traditional PDF editors, delivering speed, privacy, and productivity in one application.

### Phase 1: Core Viewer (Complete)
- Implemented file loading (dialog and drag-and-drop).
- Virtualized Thumbnail viewer for fast performance on large PDFs.
- Integrated PDF.js for rendering and full-text search.
- Added Toolbar with zoom, navigation, search, print, and dark mode toggles.

### Phase 2: Page Operations (Skipped for Phase 3)
- Goal: Implement Merge, Split, Rearrange, Extract.
- Note: Skipped due to explicit prompt constraint to implement Phase 3 on the existing scaffold.

### Phase 3: Annotation Layer (Complete)
- Overlay rendering using React Portals to map onto PDF.js canvas elements.
- Supported annotations: Highlight, Underline, Freehand Draw, Text Box, Sticky Note.
- Save logic uses `pdf-lib` to flatten annotations into a new PDF (Save As) without mutating original files.

## 🛠️ Testing Manual (Phase 3)
1. **Open File**: Drag and drop a PDF or click the Folder icon.
2. **Tools**: Click on Highlight, Underline, Draw, Text, or Sticky Note in the top toolbar.
3. **Annotate**: Click/drag on the PDF pages to draw or add text.
4. **Edit**: Use the Pointer tool to click on an existing Text box or Sticky note to edit content. Select annotations and use the red trash icon to delete them.
5. **Save**: Click the Save icon. Choose a path. Confirm if you want to open the newly annotated file.
