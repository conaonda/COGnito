import { defineConfig, devices } from '@playwright/test';

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
  },
  
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    }
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
