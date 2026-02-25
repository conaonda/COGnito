import { defineConfig, devices } from '@playwright/test';

const sharedUse = {
  baseURL: 'http://localhost:4173/COGnito/',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  launchOptions: {
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-zygote'
    ]
  }
}

export default defineConfig({
  testDir: './tests/performance',

  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/performance-results.json' }],
    ['list']
  ],

  use: {
    ...sharedUse,
  },

  projects: [
    {
      name: 'core',
      testMatch: /01-page-load/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'map-interaction',
      testMatch: /0[23]-map-(pan|zoom)/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'cog-rendering',
      testMatch: /0[5678]-/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'state',
      testMatch: /04-detailed-state/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],

  timeout: 120 * 1000,
  expect: {
    timeout: 30000
  },

  webServer: {
    command: 'npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
