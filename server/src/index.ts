import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = createApp();
const PORT = process.env.PORT || 3000;

// Serve the built SPA in production. Registered AFTER the API/stats routes in
// createApp, so the catch-all never shadows /api/* or /stats.
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../../client/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
