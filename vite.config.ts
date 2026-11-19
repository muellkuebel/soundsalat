import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/soundsalat/',
  plugins: [react(), ...(process.env.HTTPS === '1' ? [basicSsl()] : [])],
  server: {
    host: true,
    port: 43123,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 43123,
    strictPort: true,
  },
})
