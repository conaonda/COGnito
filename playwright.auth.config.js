import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/auth',

  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report-auth' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:4174/COGnito/',

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
      name: 'auth',
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
    command: 'VITE_SUPABASE_URL=https://test-project.supabase.co VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test npm run build && npm run preview -- --port 4174',
    port: 4174,
    reuseExistingServer: !process.env.CI,
  },
});
