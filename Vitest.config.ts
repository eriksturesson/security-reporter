import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only run tests in test/ directory, not dist/
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/interfaces/**',
      ],
    },
    
    // Globals for easier test writing
    globals: true,
    
    // Environment
    environment: 'node',
  },
});