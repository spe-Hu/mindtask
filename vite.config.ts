import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  // 使用相对路径，让 WKWebView file:// 协议能正确加载资源
  base: './',
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
