import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/viewer',

  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report-viewer' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:4175/COGnito/',

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
  },

  projects: [
    {
      name: 'viewer-controls',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    }
  ],

  timeout: 60 * 1000,
  expect: {
    timeout: 15000
  },

  webServer: {
    command: 'npm run preview -- --port 4175',
    port: 4175,
    reuseExistingServer: !process.env.CI,
  },
});
