import { defineConfig } from '@playwright/test';

const baseURL = process.env.SWEETY_E2E_URL ?? 'http://127.0.0.1:5173';
const host = new URL(baseURL).hostname;
if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
  throw new Error('Browser tests must run against a local Sweety development instance.');
}

export default defineConfig({
  testDir: './e2e',
  use: { baseURL, browserName: 'chromium', viewport: { width: 1440, height: 950 } },
});
