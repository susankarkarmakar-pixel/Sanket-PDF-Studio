import './index.css'

// Polyfill for Map.prototype.getOrInsertComputed (required by pdfjs-dist 4.0+)
if (!(Map.prototype as any).getOrInsertComputed) {
  (Map.prototype as any).getOrInsertComputed = function (key: any, fallback: () => any) {
    if (this.has(key)) return this.get(key);
    const value = fallback();
    this.set(key, value);
    return value;
  };
}


import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
