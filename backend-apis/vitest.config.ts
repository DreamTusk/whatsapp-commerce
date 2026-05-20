import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres123@localhost:5432/whatsapp_commerce_test',
      JWT_SECRET: 'test_jwt_secret_key_for_testing_only',
      GMAIL_USER: 'test@test.com',
      GMAIL_APP_PASSWORD: 'testpassword',
      ADMIN_APP_URL: 'http://localhost:3001',
    },
  },
});
