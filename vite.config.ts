import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // simple-mind-map 依赖 Node 内置模块，需要排除
  optimizeDeps: {
    include: ['simple-mind-map'],
  },
})
