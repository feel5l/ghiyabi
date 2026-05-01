import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/no-config',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5174',
    actionTimeout: 7_000,
    navigationTimeout: 15_000,
  },
});
