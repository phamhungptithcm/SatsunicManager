import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: 'tests/e2e', workers: 1, timeout:60000, expect:{timeout:15000}, reporter: [['list'],['html',{open:'never'}]],
  use: { baseURL:'http://127.0.0.1:25173', headless:true, screenshot:'only-on-failure' },
  webServer: {command:'SM_EMULATOR=1 npm run dev',url:'http://127.0.0.1:25173',reuseExistingServer:false},
});
