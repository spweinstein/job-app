import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    plugins: [react()],
    resolve: {
      alias: { '@': resolve(__dirname, './src') },
    },
    test: {
      name: 'unit',
      include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
      environment: 'node',
    },
  },
  {
    resolve: {
      alias: { '@': resolve(__dirname, './src') },
    },
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.ts'],
      environment: 'node',
      testTimeout: 30000,
    },
  },
]);
