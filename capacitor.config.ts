import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.office.todo',
  appName: '待办清单',
  webDir: 'dist',
  // App 直接加载线上地址，与网页版完全同步，更新无需重新发版
  server: {
    androidScheme: 'https',
    url: 'https://office-todo.pages.dev',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#fcfcfe',
  },
  ios: {
    backgroundColor: '#fcfcfe',
    contentInset: 'always',
    // iOS 16.4+ PWA 推送需要
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#fcfcfe',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSpinnerStyle: 'small',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#fcfcfe',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'LIGHT',
      resizeOnFullScreen: true,
    },
    Haptics: {},
  },
};

export default config;
