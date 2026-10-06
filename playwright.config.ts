import {defineConfig,devices} from '@playwright/test';
/** Browser tests run against the built static site (run `npm run build:static` first). */
export default defineConfig({
 testDir:'e2e',timeout:45_000,retries:process.env.CI?1:0,reporter:process.env.CI?'github':'list',
 use:{baseURL:'http://127.0.0.1:3300',trace:'retain-on-failure',timezoneId:'Asia/Kolkata',locale:'en-IN'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:950}}}],
 webServer:{command:'node --import tsx scripts/serve-static.ts',url:'http://127.0.0.1:3300/',reuseExistingServer:!process.env.CI},
});
