import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easyshift.app',
  appName: 'EasyShift',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
