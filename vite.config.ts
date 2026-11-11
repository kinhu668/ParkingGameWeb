import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works from a subpath (GitHub Pages: /ParkingGameWeb/).
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
