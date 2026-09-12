import { Component, useState } from 'react';

const CONTACT_EMAIL = 'contacto@ajustech.com';

class ContactErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('[contacto] UI falló; la página sigue activa.', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section id="contact" className="section glass-section" data-cursor-section="contact">
          <div className="section-header">
            <h2>Contacto</h2>
            <p className="section-lead">
              El formulario no está disponible ahora. Escríbenos directo y el resto del sitio
              sigue funcionando.
            </p>
          </div>
          <div className="privacy-actions">
            <a className="btn" href={`mailto:${CONTACT_EMAIL}?subject=Consulta%20Ajustech`}>
              Abrir correo
            </a>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

function ContactForm() {
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [contactStatus, setContactStatus] = useState({ type: '', text: '' });
  const [sending, setSending] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setContact((current) => ({ ...current, [name]: value }));
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setContactStatus({ type: '', text: '' });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Sin conexión. Revisa tu red o usa el correo directo.');
      }

      let response;
      try {
        response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact),
          signal: controller.signal,
          cache: 'no-store',
        });
      } catch (networkError) {
        if (networkError?.name === 'AbortError') throw networkError;
        setOfflineMode(true);
        throw new Error('No pudimos llegar al servidor. Usa el correo o intenta más tarde.');
      }

      const data = await response.json().catch(() => ({}));

      if (response.status === 429) {
        const wait = data.retryAfter ? ` (${data.retryAfter}s)` : '';
        throw new Error((data.error || 'Demasiados envíos.') + wait);
      }

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo enviar el mensaje.');
      }

      setContact({ name: '', email: '', message: '' });
      setOfflineMode(false);
      setContactStatus({ type: 'ok', text: 'Mensaje enviado. Te contactaremos pronto.' });
    } catch (error) {
      const aborted = error?.name === 'AbortError';
      setContactStatus({
        type: 'error',
        text: aborted
          ? 'El servidor tardó demasiado. Intenta de nuevo o usa el correo.'
          : error?.message || 'No se pudo enviar. Intenta de nuevo.',
      });
    } finally {
      window.clearTimeout(timeoutId);
      setSending(false);
    }
  };

  return (
    <section id="contact" className="section glass-section" data-cursor-section="contact">
      <div className="section-header">
        <h2>Contacto</h2>
        <p className="section-lead">Escríbenos para hablar de tu próximo proyecto.</p>
      </div>
      <form className="contact-form" onSubmit={handleContactSubmit} noValidate={false}>
        <label>
          Nombre
          <input
            name="name"
            type="text"
            value={contact.name}
            onChange={handleContactChange}
            autoComplete="name"
            required
            maxLength={120}
          />
        </label>
        <label>
          Correo
          <input
            name="email"
            type="email"
            value={contact.email}
            onChange={handleContactChange}
            autoComplete="email"
            required
            maxLength={180}
          />
        </label>
        <label>
          Mensaje
          <textarea
            name="message"
            rows="4"
            value={contact.message}
            onChange={handleContactChange}
            required
            maxLength={2000}
          />
        </label>
        <button className="btn" type="submit" disabled={sending}>
          {sending ? 'Enviando…' : 'Enviar mensaje'}
        </button>
        {contactStatus.text ? (
          <p className={`contact-status contact-status--${contactStatus.type}`} role="status">
            {contactStatus.text}
          </p>
        ) : null}
        {offlineMode || contactStatus.type === 'error' ? (
          <p className="contact-status contact-status--error" role="status">
            Alternativa:{' '}
            <a href={`mailto:${CONTACT_EMAIL}?subject=Consulta%20Ajustech`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        ) : null}
      </form>
    </section>
  );
}

export function ContactSection() {
  return (
    <ContactErrorBoundary>
      <ContactForm />
    </ContactErrorBoundary>
  );
}

export default ContactSection;
