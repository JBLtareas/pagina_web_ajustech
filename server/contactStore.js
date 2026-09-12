import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decryptText } from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'contacts.json');

const MAX_STORE = Number(process.env.CONTACT_MAX_STORE) || 500;
const TTL_MS = Number(process.env.CONTACT_TTL_DAYS || 90) * 24 * 60 * 60 * 1000;

function ensureStore() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, '[]\n', 'utf8');
  }
}

export function loadContacts() {
  ensureStore();
  try {
    const raw = readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveContacts(list) {
  ensureStore();
  writeFileSync(STORE_PATH, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
}

export function pruneContacts(list, now = Date.now()) {
  const kept = list.filter((item) => {
    const created = Date.parse(item?.createdAt || 0);
    return Number.isFinite(created) && now - created <= TTL_MS;
  });
  if (kept.length > MAX_STORE) {
    return kept.slice(kept.length - MAX_STORE);
  }
  return kept;
}

/** Drop expired rows and rewrite the JSON file. */
export function pruneContactStore() {
  const next = pruneContacts(loadContacts());
  saveContacts(next);
  return next.length;
}

/** Append one sealed (already encrypted) contact row. */
export function appendContact(sealed) {
  const list = pruneContacts(loadContacts());
  list.push(sealed);
  const next = pruneContacts(list);
  saveContacts(next);
  return next.length;
}

/** Decrypt sealed rows for CLI only — never expose via public API. */
export function listContactsDecrypted() {
  return pruneContacts(loadContacts()).map((row) => {
    try {
      return {
        id: row.id,
        name: decryptText(row.name),
        email: decryptText(row.email),
        message: decryptText(row.message),
        createdAt: row.createdAt,
        ipHash: row.ipHash,
      };
    } catch {
      return {
        id: row.id,
        name: '[no legible]',
        email: '[no legible]',
        message: '[cifrado con otra clave o corrupto]',
        createdAt: row.createdAt,
        ipHash: row.ipHash,
      };
    }
  });
}

export const contactStorePath = STORE_PATH;
