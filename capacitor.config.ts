import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.office.todo',
  appName: '待办清单',
  webDir: 'dist',
  // 已部署的线上地址，构建后从线上拉取可保持三端同步
  server: {
    androidScheme: 'https',
    // 注释掉 url 则使用打包进 App 的 dist 静态资源
    // 若需 App 与网页完全同步（无需重新发版即可更新 UI），
    // 取消下行注释指向线上地址：
    // url: 'https://office-todo.pages.dev',
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
