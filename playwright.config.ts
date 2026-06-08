import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'e2e-full-test.spec.ts',
  timeout: 90000,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5174 --host 127.0.0.1',
    port: 5174,
    reuseExistingServer: true,
    timeout: 30000,
  },
  reporter: 'list',
})
