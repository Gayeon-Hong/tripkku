// Use `npx ait init` in your SDK/Vite project and then adjust the generated config.
// appName MUST match the actual console-registered identifier.
import {defineConfig} from '@apps-in-toss/web-framework/config';
export default defineConfig({
  appName: 'REPLACE_WITH_CONSOLE_APP_NAME',
  brand: {primaryColor:'#355c52'},
  webView: {},
  permissions: [],
  webBundleDir: 'dist',
});
