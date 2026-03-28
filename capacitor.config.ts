import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lunarfile.quietcareer',
  appName: 'QuietCareer',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0F0F12',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0F0F12',
  },
};

export default config;
