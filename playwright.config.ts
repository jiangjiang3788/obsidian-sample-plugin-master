// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // ✅ 将总超时时间减少到 30 秒
  timeout: 5 * 1000,
  use: {
    // ✅ 保持开启，方便我们调试
    trace: 'on', 
  },
});