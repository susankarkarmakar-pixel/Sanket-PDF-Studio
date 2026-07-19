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

### Phase 4: Signature (Visual Stamp) (Complete)
- Create signatures via freehand drawing or transparent PNG upload.
- Signatures are stored locally and synced via IPC for reuse.
- Drag and drop signatures onto any page.
- Select, drag, reposition, and resize signatures on the document.
- Signatures are visually flattened into the PDF content upon Save (Save As), alongside other annotations.
- Note: This is explicitly a visual stamp, *not* an X.509 cryptographic digital signature.

## 🛠️ Testing Manual (Phase 4)
1. **Open File**: Open a PDF document.
2. **Add Signature**: Click the "Add Signature Image" button (pen/paper icon) in the toolbar. Click "Create New Signature".
3. **Draw/Upload**: Draw a signature or upload a transparent PNG. Save it.
4. **Place**: Open the "Add Signature Image" menu again, and drag your saved signature onto the PDF page.
5. **Adjust**: Make sure the pointer tool is selected. Click the signature to select it. Drag it around to move it, or drag the bottom-right handle to resize it.
6. **Save**: Click the "Save Annotations" button. Ensure the resulting PDF visually contains your signature as part of the page content.
