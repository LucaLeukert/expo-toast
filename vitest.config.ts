import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      expo: path.resolve(__dirname, 'tests/expo-stub.ts'),
      'react-native': path.resolve(__dirname, 'tests/react-native-stub.ts'),
    },
  },
  define: {
    __DEV__: false,
  },
  test: {
    environment: 'node',
  },
});
