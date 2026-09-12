#!/usr/bin/env bash
# Prep HTTPS en Ubuntu/Debian + Cloudflare DNS.
# Uso (en el VPS, como root):
#   chmod +x deploy/setup-https.sh
#   ./deploy/setup-https.sh tu-dominio.com
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Uso: $0 tu-dominio.com"
  exit 1
fi

echo "==> Paquetes base"
apt update
apt install -y python3-pip nginx certbot python3-certbot-nginx

echo "==> Carpetas ACME"
mkdir -p /var/www/certbot
chown www-data:www-data /var/www/certbot

CONF_SRC="$(cd "$(dirname "$0")" && pwd)/nginx-ajustech.conf"
LIMITS_SRC="$(cd "$(dirname "$0")" && pwd)/nginx-ajustech-limits.conf"
CONF_DST="/etc/nginx/sites-available/ajustech"
LIMITS_DST="/etc/nginx/conf.d/ajustech-limits.conf"

if [[ ! -f "$CONF_SRC" ]]; then
  echo "No encuentro $CONF_SRC"
  exit 1
fi

if [[ -f "$LIMITS_SRC" ]]; then
  cp "$LIMITS_SRC" "$LIMITS_DST"
fi

sed "s/TU_DOMINIO.com/${DOMAIN}/g" "$CONF_SRC" > "$CONF_DST"
ln -sfn "$CONF_DST" /etc/nginx/sites-enabled/ajustech
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo "==> Certbot (Let's Encrypt) — el dominio debe apuntar a esta IP (DNS Cloudflare)"
echo "    En Cloudflare: SSL/TLS = Full (strict) cuando el origen ya tenga cert."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect --non-interactive --agree-tos -m "admin@${DOMAIN}" || {
  echo "Certbot falló. Comprueba DNS A/AAAA y vuelve a ejecutar:"
  echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
  exit 1
}

nginx -t
systemctl reload nginx

echo ""
echo "Listo. Checklist Cloudflare:"
echo "  1) Registro A (proxied) → IP del VPS"
echo "  2) SSL/TLS → Full (strict)"
echo "  3) Always Use HTTPS ON"
echo "  4) En el VPS: cp .env.example .env && nano .env (CONTACT_ENCRYPTION_KEY, CORS_ORIGINS)"
echo "  5) npm ci && npm run build && NODE_ENV=production node --env-file=.env server/index.js"
echo "  6) DevTools → Network: solo /api/contact (POST) y estáticos; nada de .env"
