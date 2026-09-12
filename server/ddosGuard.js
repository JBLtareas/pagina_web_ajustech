/**
 * Filtro defensivo anti-abuso / DDoS ligero (capa app).
 * Cloudflare + Nginx deben hacer el filtrado pesado; esto evita saturar Node.
 */

import { hashIp } from './security.js';

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'OPTIONS']);

const GLOBAL_MAX_PER_WINDOW = Number(process.env.DDOS_MAX_PER_IP) || 120;
const GLOBAL_WINDOW_MS = Number(process.env.DDOS_WINDOW_MS) || 60 * 1000;
const GLOBAL_BLOCK_MS = Number(process.env.DDOS_BLOCK_MS) || 15 * 60 * 1000;
const MAX_INFLIGHT_PER_IP = Number(process.env.DDOS_MAX_INFLIGHT_IP) || 20;
const MAX_INFLIGHT_TOTAL = Number(process.env.DDOS_MAX_INFLIGHT) || 200;
const MAX_URL_LEN = Number(process.env.DDOS_MAX_URL_LEN) || 2048;
const MAX_HEADER_BYTES = Number(process.env.DDOS_MAX_HEADER_BYTES) || 8192;

/** @type {Map<string, { hits: number[], blockedUntil: number, inflight: number }>} */
const ipState = new Map();
let totalInflight = 0;

const SUSPICIOUS_PATH =
  /(\.\.|%2e%2e|%00|\0|\/\/\/|<(script|iframe)|javascript:|union\s+select|\/etc\/passwd|wp-admin|phpmyadmin|\.env|\/\.git)/i;

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function estimateHeaderBytes(req) {
  let n = 0;
  for (const [key, value] of Object.entries(req.headers)) {
    n += key.length + 2;
    if (Array.isArray(value)) {
      for (const part of value) n += String(part).length + 2;
    } else if (value != null) {
      n += String(value).length;
    }
  }
  return n;
}

function getEntry(ipHash) {
  let entry = ipState.get(ipHash);
  if (!entry) {
    entry = { hits: [], blockedUntil: 0, inflight: 0 };
    ipState.set(ipHash, entry);
  }
  return entry;
}

export function pruneDdosState(now = Date.now()) {
  for (const [ipHash, entry] of ipState) {
    entry.hits = entry.hits.filter((t) => now - t < GLOBAL_WINDOW_MS);
    if (entry.blockedUntil && now >= entry.blockedUntil) {
      entry.blockedUntil = 0;
    }
    if (
      entry.hits.length === 0 &&
      entry.inflight === 0 &&
      !entry.blockedUntil
    ) {
      ipState.delete(ipHash);
    }
  }
  if (ipState.size > 20000) {
    // Evitar crecimiento infinito bajo flood: dropear entradas idle.
    for (const [ipHash, entry] of ipState) {
      if (entry.inflight === 0 && !entry.blockedUntil) {
        ipState.delete(ipHash);
      }
      if (ipState.size <= 10000) break;
    }
  }
}

function reject(res, status, retryAfter, error) {
  if (retryAfter) {
    res.set('Retry-After', String(retryAfter));
  }
  res.set('Cache-Control', 'no-store');
  if (!res.headersSent) {
    res.status(status).json({ error, retryAfter: retryAfter || undefined });
  }
}

/**
 * Middleware temprano: métodos, URL, headers, rate global y concurrencia.
 */
export function ddosFilter(req, res, next) {
  const now = Date.now();

  if (ipState.size > 8000) {
    pruneDdosState(now);
  }

  if (!ALLOWED_METHODS.has(req.method)) {
    reject(res, 405, 60, 'Método no permitido.');
    return;
  }

  const rawUrl = req.originalUrl || req.url || '';
  if (rawUrl.length > MAX_URL_LEN || SUSPICIOUS_PATH.test(rawUrl)) {
    reject(res, 400, 60, 'Solicitud rechazada.');
    return;
  }

  if (estimateHeaderBytes(req) > MAX_HEADER_BYTES) {
    reject(res, 431, 60, 'Cabeceras demasiado grandes.');
    return;
  }

  if (totalInflight >= MAX_INFLIGHT_TOTAL) {
    reject(res, 503, 30, 'Servicio saturado. Intenta de nuevo.');
    return;
  }

  const ipHash = hashIp(clientIp(req));
  const entry = getEntry(ipHash);
  entry.hits = entry.hits.filter((t) => now - t < GLOBAL_WINDOW_MS);

  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    reject(res, 403, retryAfter, 'Acceso bloqueado por exceso de tráfico.');
    return;
  }

  if (entry.hits.length >= GLOBAL_MAX_PER_WINDOW) {
    entry.blockedUntil = now + GLOBAL_BLOCK_MS;
    reject(
      res,
      429,
      Math.ceil(GLOBAL_BLOCK_MS / 1000),
      'Demasiadas solicitudes. Acceso limitado temporalmente.',
    );
    return;
  }

  if (entry.inflight >= MAX_INFLIGHT_PER_IP) {
    reject(res, 429, 15, 'Demasiadas conexiones simultáneas.');
    return;
  }

  entry.hits.push(now);
  entry.inflight += 1;
  totalInflight += 1;

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    entry.inflight = Math.max(0, entry.inflight - 1);
    totalInflight = Math.max(0, totalInflight - 1);
  };

  res.on('finish', release);
  res.on('close', release);

  next();
}

export function applyServerHardening(server) {
  const headersTimeout = Number(process.env.DDOS_HEADERS_TIMEOUT_MS) || 10_000;
  const requestTimeout = Number(process.env.DDOS_REQUEST_TIMEOUT_MS) || 20_000;
  const keepAliveTimeout = Number(process.env.DDOS_KEEPALIVE_MS) || 5_000;
  const maxHeadersCount = Number(process.env.DDOS_MAX_HEADERS_COUNT) || 50;

  server.headersTimeout = headersTimeout;
  server.requestTimeout = requestTimeout;
  server.keepAliveTimeout = keepAliveTimeout;
  server.maxHeadersCount = maxHeadersCount;
  server.timeout = requestTimeout;
}

setInterval(() => pruneDdosState(), 60_000).unref?.();
