import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/catalog.js', 'src/stac.js', 'src/auth.js', 'src/proxy.js'],
    }
  }
})
