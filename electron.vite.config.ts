import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: 'src/renderer/index.html',
          settings: 'src/renderer/settings.html'
        }
      }
    }
  }
})
