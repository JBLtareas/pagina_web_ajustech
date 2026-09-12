import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const distPath = path.join(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ajustech-api' });
});

app.get('/api/site', (_req, res) => {
  res.json({
    name: 'Ajustech',
    email: 'contacto@ajustech.com',
    tagline: 'Soluciones creativas para tu negocio',
  });
});

const messages = [];

app.post('/api/contact', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!name || !email || !message) {
    res.status(400).json({ error: 'Completa nombre, correo y mensaje.' });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'El correo no es válido.' });
    return;
  }

  messages.push({
    id: messages.length + 1,
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ ok: true, message: 'Mensaje recibido.' });
});

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API Ajustech en http://localhost:${PORT}`);
});
