import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/OrderFresh/',
  server: {
    proxy: {
      '/knuspr-mcp': {
        target: 'https://mcp.knuspr.de',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/knuspr-mcp/, '/mcp'),
      },
      '/rk-api': {
        target: 'https://recipekeeper.azurewebsites.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rk-api/, ''),
      },
    },
  },
})
