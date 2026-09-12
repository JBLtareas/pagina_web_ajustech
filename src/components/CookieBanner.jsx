import { useCallback, useEffect, useId, useState } from 'react';

const STORAGE_KEY = 'ajustech-cookie-consent';
const CONSENT_VERSION = 1;

const DEFAULT_PREFS = {
  necessary: true,
  analytics: false,
};

function readStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== CONSENT_VERSION || !parsed.prefs) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistConsent(prefs, choice) {
  const payload = {
    version: CONSENT_VERSION,
    choice,
    prefs: {
      necessary: true,
      analytics: Boolean(prefs.analytics),
    },
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('ajustech:cookie-consent', { detail: payload }));
  return payload;
}

/** @returns {{ prefs: { necessary: boolean, analytics: boolean }, choice: string } | null} */
export function getCookieConsent() {
  return readStoredConsent();
}

function CookieBanner() {
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored) {
      setPrefs({ ...DEFAULT_PREFS, ...stored.prefs, necessary: true });
      setVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const openSettings = () => {
      const stored = readStoredConsent();
      if (stored?.prefs) {
        setPrefs({ ...DEFAULT_PREFS, ...stored.prefs, necessary: true });
      }
      setShowPrefs(true);
      setVisible(true);
    };

    window.addEventListener('ajustech:open-cookie-settings', openSettings);
    return () => window.removeEventListener('ajustech:open-cookie-settings', openSettings);
  }, []);

  const closeWith = useCallback((nextPrefs, choice) => {
    persistConsent(nextPrefs, choice);
    setPrefs({ ...DEFAULT_PREFS, ...nextPrefs, necessary: true });
    setVisible(false);
    setShowPrefs(false);
  }, []);

  const acceptAll = () => closeWith({ necessary: true, analytics: true }, 'accept-all');
  const rejectOptional = () => closeWith({ necessary: true, analytics: false }, 'reject-optional');
  const savePrefs = () => closeWith(prefs, 'custom');

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <div className="cookie-banner__panel">
        <div className="cookie-banner__copy">
          <h2 id={titleId}>Cookies</h2>
          <p>
            Usamos cookies necesarias para el funcionamiento del sitio y, solo con tu permiso,
            cookies de medición para mejorar la experiencia. Puedes aceptar todas, rechazar las
            opcionales o configurar tu elección.
            {' '}
            <a href="#privacidad">Más información</a>
          </p>
        </div>

        {showPrefs ? (
          <div className="cookie-banner__prefs" role="group" aria-label="Preferencias de cookies">
            <label className="cookie-pref">
              <span>
                <strong>Necesarias</strong>
                <small>Sesión, seguridad y preferencias básicas. Siempre activas.</small>
              </span>
              <input type="checkbox" checked disabled readOnly />
            </label>
            <label className="cookie-pref">
              <span>
                <strong>Analítica</strong>
                <small>Ayudan a entender el uso del sitio de forma agregada.</small>
              </span>
              <input
                type="checkbox"
                checked={prefs.analytics}
                onChange={(event) => {
                  setPrefs((current) => ({ ...current, analytics: event.target.checked }));
                }}
              />
            </label>
          </div>
        ) : null}

        <div className="cookie-banner__actions">
          <button type="button" className="cookie-btn cookie-btn--ghost" onClick={rejectOptional}>
            Solo necesarias
          </button>
          <button
            type="button"
            className="cookie-btn cookie-btn--ghost"
            onClick={() => setShowPrefs((value) => !value)}
            aria-expanded={showPrefs}
          >
            {showPrefs ? 'Ocultar opciones' : 'Configurar'}
          </button>
          {showPrefs ? (
            <button type="button" className="cookie-btn cookie-btn--primary" onClick={savePrefs}>
              Guardar
            </button>
          ) : (
            <button type="button" className="cookie-btn cookie-btn--primary" onClick={acceptAll}>
              Aceptar todas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function openCookieSettings() {
  window.dispatchEvent(new Event('ajustech:open-cookie-settings'));
}

export default CookieBanner;
