import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk: React and core dependencies
          vendor: ['react', 'react-dom'],

          // Event content chunks (large static data)
          'events-story': [
            './src/content/events/story/story-week1-2',
            './src/content/events/story/story-week3-5',
            './src/content/events/story/story-week5-8',
            './src/content/events/story/story-week7-10',
            './src/content/events/story/story-week9-12',
            './src/content/events/story/conditional-events',
            './src/content/events/story/random-events',
          ],
          'events-chains': [
            './src/content/events/chains/patch-chain',
            './src/content/events/chains/documentation-chain',
            './src/content/events/chains/trust-chain',
            './src/content/events/chains/colleague-chain',
            './src/content/events/chains/security-chain',
          ],
          'events-week': [
            './src/content/events/week1',
            './src/content/events/week2-4',
            './src/content/events/week5-8',
            './src/content/events/week9-12',
          ],
          'events-special': [
            './src/content/events/kritis-special',
            './src/content/events/tutorials',
          ],

          // Adventure mode content
          adventure: ['./src/content/adventure/story-events'],

          // Scenario packs
          scenarios: ['./src/content/packs'],
        },
      },
    },
  },
});
