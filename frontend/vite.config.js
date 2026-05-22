import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  envPrefix: ['VITE_', 'BACKEND_'],
  css: {
    // Explicitly clear PostCSS plugins to prevent Vite from
    // auto-detecting tailwindcss as a PostCSS plugin
    postcss: { plugins: [] },
  },
})
