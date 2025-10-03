import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.easyshift.app',
  appName: 'EasyShift',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
      iosImagePicker: {
        allowsEditing: true
      },
      androidImagePicker: {
        allowsEditing: true
      }
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#1e293b'
    }
  }
};

export default config;
