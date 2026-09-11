import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.classtrack.attendance',
  appName: 'Class Trackerbonia',
  webDir: 'dist',
  ios: {
    // Matches the app's dark surface so launch does not flash white.
    backgroundColor: '#0b0f14',
    contentInset: 'always',
  },
  plugins: {
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
