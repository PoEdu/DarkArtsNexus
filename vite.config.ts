import { defineConfig } from 'vite'

export default defineConfig({
  root: 'docs',
  optimizeDeps: {
    include: ['vue'],
  },
  ssr: {
    noExternal: ['d3-drag', 'd3-force', 'd3-selection', 'd3-zoom'],
  },
})