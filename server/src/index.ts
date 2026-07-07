import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Health check (used by the Docker HEALTHCHECK and the Playwright webServer probe)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the built SPA
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../../client/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Static server running on http://localhost:${PORT}`);
});
