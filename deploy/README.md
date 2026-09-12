# Deploy HTTPS — Ajustech + Cloudflare + Certbot

## Qué ve DevTools (seguro)

El front **solo** llama:

| Método | Ruta | Respuesta |
|--------|------|-----------|
| `POST` | `/api/contact` | `{ ok: true }` — sin PII |
| (opcional) | `/api/health` | `{ ok: true }` — sin puertos ni secretos |

**No existen** endpoints de listar mensajes, admin, dump de `.env` ni lectura de claves.

Los mensajes se guardan cifrados en `server/data/contacts.json` (gitignored).
Para leerlos **solo en el VPS**:

```bash
npm run contacts
```

## .env (cuidado)

- Está en `.gitignore` (`.env`, `.env.*`, `*.pem`, `certs/`).
- Copia `.env.example` → `.env` **solo en el servidor**.
- Genera clave: `openssl rand -hex 32`
- Nunca pegues `.env` en el chat, Git ni Cloudflare Pages env vars públicas.

En producción el server **sale** si falta `CONTACT_ENCRYPTION_KEY`.

## Cloudflare

1. DNS A/AAAA → IP del VPS (nube naranja).
2. SSL/TLS → **Full (strict)** cuando Nginx ya tenga certificado.
3. Always Use HTTPS + Automatic HTTPS Rewrites.

Hasta tener cert en origen, puedes usar **Full** (no Flexible: Flexible manda HTTP al VPS).

## VPS (Ubuntu)

```bash
sudo apt update
sudo apt install -y python3-pip nginx certbot python3-certbot-nginx

# App
cd /var/www/ajustech   # o tu ruta
cp .env.example .env
nano .env              # dominio + CONTACT_ENCRYPTION_KEY + CORS_ORIGINS
npm ci
npm run build

# HTTPS
chmod +x deploy/setup-https.sh
sudo ./deploy/setup-https.sh tu-dominio.com

# Proceso (ejemplo)
NODE_ENV=production node --env-file=.env server/index.js
# o systemd con EnvironmentFile=/var/www/ajustech/.env
```

Nginx escucha 443 y hace proxy a `127.0.0.1:8799` (Node no se publica a internet).

### Anti-DDoS (capas)

1. **Cloudflare** (borde): proxy naranja + Under Attack / WAF si hay flood.
2. **Nginx**: `limit_req` / `limit_conn`, timeouts y `client_max_body_size 32k`.
3. **Node** (`server/ddosGuard.js`): métodos permitidos, URLs sospechosas, rate global por IP, tope de requests en vuelo y timeouts HTTP.

## Tras el dominio

1. Sustituye `tu-dominio.com` en `.env` (`WEB_URL`, `CORS_ORIGINS`).
2. Corre `setup-https.sh`.
3. En Cloudflare: Full (strict).
4. Verifica en DevTools → Network que no salga nada raro; en Application no hay secrets.
