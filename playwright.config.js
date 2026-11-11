import { defineConfig } from '@playwright/test';

const baseURL = process.env.SWEETY_E2E_URL ?? 'http://127.0.0.1:4173';
const { hostname: host, port } = new URL(baseURL);
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
        command: 'npm run build && npm start',
        url: `${baseURL}/api/config`,
        env: { APP_ORIGIN: baseURL, PORT: port, NODE_ENV: 'development' },
        stdout: 'pipe',
        timeout: 60_000,
      },
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1440, height: 950 },
  },
});
