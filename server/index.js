import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyServerHardening, ddosFilter } from './ddosGuard.js';
import { appendContact, contactStorePath, pruneContactStore } from './contactStore.js';
import {
  encryptText,
  encryptionConfigured,
  hashIp,
  sanitizeText,
} from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 8799;
const HOST = process.env.HOST || '127.0.0.1';
const WEB_URL = process.env.WEB_URL || 'http://127.0.0.1:5199/';
const distPath = path.join(__dirname, '..', 'dist');
const serveStatic = isProd && existsSync(distPath);

if (isProd && !encryptionConfigured) {
  console.error(
    '[seguridad] CONTACT_ENCRYPTION_KEY es obligatorio en producción. Define la clave en .env (nunca en el repo).',
  );
  process.exit(1);
}

const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGINS || 'http://127.0.0.1:5199,http://localhost:5199')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
);

if (isProd && ALLOWED_ORIGINS.size === 0) {
  console.error('[seguridad] CORS_ORIGINS vacío en producción.');
  process.exit(1);
}

const CONTACT_WINDOW_MS = Number(process.env.CONTACT_WINDOW_MS) || 15 * 60 * 1000;
const CONTACT_MAX_PER_WINDOW = Number(process.env.CONTACT_MAX_PER_WINDOW) || 10;
const CONTACT_COOLDOWN_MS = Number(process.env.CONTACT_COOLDOWN_MS) || 20 * 1000;
const IP_MAX_REQUESTS = Number(process.env.IP_MAX_REQUESTS) || 10;
const IP_WINDOW_MS = Number(process.env.IP_WINDOW_MS) || 15 * 60 * 1000;
const IP_BLOCK_MS = Number(process.env.IP_BLOCK_MS) || 60 * 60 * 1000;
const CONTACT_MAX_NAME = 120;
const CONTACT_MAX_EMAIL = 180;
const CONTACT_MAX_MESSAGE = 2000;

/** @type {Map<string, { hits: number[], lastAt: number, blockedUntil: number, apiHits: number[] }>} */
const contactLimits = new Map();

app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);

/** Filtrado anti-abuso antes de parsear body / CORS. */
app.use(ddosFilter);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.replace(/\/$/, '');
      if (ALLOWED_ORIGINS.has(normalized)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
  }),
);

app.use(express.json({ limit: '16kb', type: 'application/json' }));

/** Nada de /api se cachea (navegador, CDN, proxy). */
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getIpEntry(ipHash) {
  let entry = contactLimits.get(ipHash);
  if (!entry) {
    entry = { hits: [], apiHits: [], lastAt: 0, blockedUntil: 0 };
    contactLimits.set(ipHash, entry);
  }
  return entry;
}

function pruneContactLimits(now) {
  for (const [ipHash, entry] of contactLimits) {
    entry.hits = entry.hits.filter((t) => now - t < CONTACT_WINDOW_MS);
    entry.apiHits = (entry.apiHits || []).filter((t) => now - t < IP_WINDOW_MS);
    if (entry.blockedUntil && now >= entry.blockedUntil) {
      entry.blockedUntil = 0;
    }
    const idle =
      entry.hits.length === 0 &&
      entry.apiHits.length === 0 &&
      !entry.blockedUntil &&
      now - entry.lastAt > Math.max(CONTACT_WINDOW_MS, IP_WINDOW_MS, IP_BLOCK_MS);
    if (idle) {
      contactLimits.delete(ipHash);
    }
  }
}

/** >10 solicitudes /api por IP en la ventana → bloqueo 1h. */
function checkIpApiGuard(ipHash) {
  const now = Date.now();
  if (contactLimits.size > 5000) {
    pruneContactLimits(now);
  }

  const entry = getIpEntry(ipHash);
  entry.apiHits = (entry.apiHits || []).filter((t) => now - t < IP_WINDOW_MS);

  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      ok: false,
      status: 403,
      retryAfter,
      error: 'Acceso bloqueado por exceso de solicitudes. Intenta más tarde.',
    };
  }

  if (entry.apiHits.length >= IP_MAX_REQUESTS) {
    entry.blockedUntil = now + IP_BLOCK_MS;
    const retryAfter = Math.ceil(IP_BLOCK_MS / 1000);
    return {
      ok: false,
      status: 403,
      retryAfter,
      error: 'Demasiadas solicitudes desde esta red. Acceso bloqueado temporalmente.',
    };
  }

  entry.apiHits.push(now);
  entry.lastAt = now;
  return { ok: true, entry, now };
}

function checkContactRateLimit(ipHash) {
  const now = Date.now();
  if (contactLimits.size > 5000) {
    pruneContactLimits(now);
  }

  const entry = getIpEntry(ipHash);
  entry.hits = entry.hits.filter((t) => now - t < CONTACT_WINDOW_MS);

  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      ok: false,
      status: 403,
      retryAfter,
      error: 'Acceso bloqueado por exceso de solicitudes. Intenta más tarde.',
    };
  }

  if (entry.lastAt && now - entry.lastAt < CONTACT_COOLDOWN_MS) {
    const retryAfter = Math.ceil((CONTACT_COOLDOWN_MS - (now - entry.lastAt)) / 1000);
    return { ok: false, status: 429, retryAfter, error: 'Espera un momento antes de enviar otro mensaje.' };
  }

  if (entry.hits.length >= CONTACT_MAX_PER_WINDOW) {
    entry.blockedUntil = now + IP_BLOCK_MS;
    const retryAfter = Math.ceil(IP_BLOCK_MS / 1000);
    return {
      ok: false,
      status: 403,
      retryAfter,
      error: 'Demasiados mensajes desde esta red. Acceso bloqueado temporalmente.',
    };
  }

  return { ok: true, entry, now };
}

app.use('/api', (req, res, next) => {
  const ipHash = hashIp(clientIp(req));
  const guard = checkIpApiGuard(ipHash);
  if (!guard.ok) {
    res.set('Retry-After', String(guard.retryAfter));
    res.status(guard.status).json({ error: guard.error, retryAfter: guard.retryAfter });
    return;
  }
  next();
});

/** Health mínimo — sin puertos, rutas internas ni flags de cifrado. */
app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post('/api/contact', (req, res) => {
  try {
    const ipHash = hashIp(clientIp(req));
    const limit = checkContactRateLimit(ipHash);
    if (!limit.ok) {
      if (req.body && typeof req.body === 'object') {
        req.body = null;
      }
      res.set('Retry-After', String(limit.retryAfter));
      res.status(limit.status).json({ error: limit.error, retryAfter: limit.retryAfter });
      return;
    }

    let name = sanitizeText(req.body?.name, CONTACT_MAX_NAME);
    let email = sanitizeText(req.body?.email, CONTACT_MAX_EMAIL).toLowerCase();
    let message = sanitizeText(req.body?.message, CONTACT_MAX_MESSAGE);

    // No retener el body en claro en el request.
    if (req.body && typeof req.body === 'object') {
      req.body = null;
    }

    if (!name || !email || !message) {
      name = '';
      email = '';
      message = '';
      res.status(400).json({ error: 'Completa nombre, correo y mensaje.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      name = '';
      email = '';
      message = '';
      res.status(400).json({ error: 'El correo no es válido.' });
      return;
    }

    limit.entry.hits.push(limit.now);
    limit.entry.lastAt = limit.now;

    const sealed = {
      id: `${limit.now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: encryptText(name),
      email: encryptText(email),
      message: encryptText(message),
      ipHash,
      createdAt: new Date().toISOString(),
    };

    name = '';
    email = '';
    message = '';

    appendContact(sealed);

    // Never echo PII back to the client.
    res.status(201).json({ ok: true, message: 'Mensaje recibido.' });
  } catch {
    if (req.body && typeof req.body === 'object') {
      req.body = null;
    }
    res.status(500).json({ error: 'No se pudo procesar el mensaje. Intenta de nuevo.' });
  }
});

// No hay GET de mensajes, admin ni dump de .env — a propósito.

app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Solicitud demasiado grande.' });
    return;
  }
  res.status(500).json({ error: 'Error interno.' });
});

if (serveStatic) {
  app.use(
    express.static(distPath, {
      index: false,
      etag: true,
      maxAge: isProd ? '7d' : 0,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    }),
  );
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, WEB_URL);
  });
}

setInterval(() => pruneContactStore(), 15 * 60 * 1000).unref();

const server = app.listen(PORT, HOST, () => {
  console.log(`API Ajustech en http://${HOST}:${PORT}${serveStatic ? ' (static+api)' : ''}`);
  console.log(`[contactos] JSON cifrado → ${contactStorePath}`);
  if (!isProd && !encryptionConfigured) {
    console.warn(
      '[seguridad] CONTACT_ENCRYPTION_KEY no definido: clave efímera de proceso (solo dev).',
    );
  }
});

applyServerHardening(server);

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} ocupado. Mata el proceso o cambia PORT.`);
    process.exit(1);
  }
  throw error;
});
