import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    server: {
      deps: {
        external: ['argon2', 'ioredis'],
      },
    },
  },
});
