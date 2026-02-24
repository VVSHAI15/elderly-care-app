import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.guardianai.app',
  appName: 'guardian.ai',
  webDir: 'out',
  server: {
    // For development: simulators can reach host at localhost
    // For physical devices: change to your machine's local IP (e.g. http://192.168.1.x:3000)
    // For production: set to your Vercel URL
    url: process.env.CAPACITOR_SERVER_URL ?? 'http://localhost:3000',
    cleartext: true, // allow HTTP in dev
  },
};

export default config;
