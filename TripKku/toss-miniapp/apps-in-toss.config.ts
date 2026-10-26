import { defineConfig } from '@apps-in-toss/web-framework/config';

// IMPORTANT: appName must be identical to the identifier in Apps in Toss Console.
export default defineConfig({
  appName: 'tripkku',
  brand: { primaryColor: '#365A54' },
  webView: {},
  permissions: [],
  webBundleDir: 'dist',
});
