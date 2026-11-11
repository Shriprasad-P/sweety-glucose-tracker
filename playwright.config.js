import { defineConfig } from '@playwright/test';

const baseURL = process.env.SWEETY_E2E_URL ?? 'http://127.0.0.1:5173';
const host = new URL(baseURL).hostname;
if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) {
  throw new Error(
    'Browser tests must run against a local Sweety development instance.',
  );
}

export default defineConfig({
  testDir: './e2e',
  webServer: process.env.SWEETY_E2E_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: `${baseURL}/api/config`,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        timeout: 30_000,
      },
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1440, height: 950 },
  },
});
