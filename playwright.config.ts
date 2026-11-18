import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'tests/e2e',
  fullyParallel:true,
  workers:2,
  use:{baseURL:'http://127.0.0.1:4173/map/',trace:'retain-on-failure',channel:process.env.PLAYWRIGHT_CHANNEL||undefined},
  projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
  webServer:{command:'python3 scripts/serve-test.py',url:'http://127.0.0.1:4173/map/',reuseExistingServer:!process.env.CI},
});
