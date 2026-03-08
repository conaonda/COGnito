import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@conaonda/ol-cog-layers': path.resolve(__dirname, 'node_modules/@conaonda/ol-cog-layers/src/index.js')
    }
  },
  test: {
    include: ['tests/unit/**/*.test.js'],
    server: {
      deps: {
        inline: ['@conaonda/ol-cog-layers']
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/catalog.js', 'src/catalogUI.js', 'src/stac.js', 'src/auth.js', 'src/proxy.js', 'src/tags.js', 'src/viewerControls.js', 'src/likes.js', 'src/watchlist.js'],
    }
  }
})
