import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import ScrollCursor from './components/ScrollCursor';
import GalleryErrorBoundary from './components/GalleryErrorBoundary';
import ContactSection from './components/ContactSection';
import CookieBanner, { openCookieSettings } from './components/CookieBanner';
import HalloweenSkeleton, { SeasonalEffects, useSeasonTheme } from './season';
import aviaMintLogo from './assets/aviamint-logo.png';
import autoStockLogo from './assets/autostock-pro-logo.png';
import './App.css';
import './styles/halloweenmode.scss';
import './styles/_winter.scss';

const Gallery = lazy(() => import('./components/Gallery'));

const BACKGROUND_VIDEO = '/videodefondo.webm';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDarkMode, setPendingDarkMode] = useState(true);
  const [themeTransition, setThemeTransition] = useState({ active: false, x: 0, y: 0, direction: 'to-light' });
  const toggleRef = useRef(null);
  const handleLoadingComplete = useCallback(() => setIsLoading(false), []);

  useSeasonTheme();

  useEffect(() => {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  }, []);

  useEffect(() => {
    document.body.classList.toggle('light-theme', !darkMode);
    document.body.classList.toggle('dark-theme', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!themeTransition.active) {
      return undefined;
    }

    const applyThemeTimer = window.setTimeout(() => {
      setDarkMode(pendingDarkMode);
    }, 120);

    const resetTimer = window.setTimeout(() => {
      setThemeTransition((value) => ({ ...value, active: false }));
    }, 800);

    return () => {
      window.clearTimeout(applyThemeTimer);
      window.clearTimeout(resetTimer);
    };
  }, [pendingDarkMode, themeTransition.active]);

  const handleThemeToggle = () => {
    const toggleButton = toggleRef.current;
    const nextDarkMode = !darkMode;

    if (toggleButton) {
      const rect = toggleButton.getBoundingClientRect();
      setThemeTransition({
        active: true,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        direction: nextDarkMode ? 'to-dark' : 'to-light',
      });
    }

    setPendingDarkMode(nextDarkMode);
  };

  return (
    <div className={`App ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <SeasonalEffects />
      <ScrollCursor />
      <div className={`loading-screen ${isLoading ? 'is-visible' : ''}`} aria-hidden={!isLoading}>
        <div className="loading-shell">
          <HalloweenSkeleton onComplete={handleLoadingComplete} />
          <div className="skeleton skeleton-brand" />
          <div className="skeleton skeleton-eyebrow" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-title skeleton-title-short" />
          <div className="skeleton skeleton-copy" />
          <div className="skeleton skeleton-copy skeleton-copy-short" />
          <div className="skeleton-grid">
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        </div>
      </div>
      {darkMode && (
        <video
          className="background-video"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source src={BACKGROUND_VIDEO} type="video/webm" />
        </video>
      )}
      <div
        className={`theme-transition-layer ${themeTransition.active ? 'active' : ''} ${themeTransition.direction === 'to-dark' ? 'sunset' : 'sunrise'}`}
        aria-hidden="true"
        style={{ '--origin-x': `${themeTransition.x}px`, '--origin-y': `${themeTransition.y}px` }}
      />
      <header className="hero">
        <nav className="navbar">
          <a className="brand" href="#home">Ajustech</a>
          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#about">Acerca de Nosotros</a>
            <a href="#works">Trabajos</a>
            <a href="#gallery">Galería</a>
            <a href="#contact">Contacto</a>
          </div>
          <div className="nav-actions">
            <label className="theme-switch" ref={toggleRef}>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={handleThemeToggle}
                aria-label="Alternar modo oscuro"
              />
              <span className="switch-track">
                <span className="switch-thumb" />
              </span>
              <span className="switch-label">
                {darkMode ? '🌙' : '☀️'}
              </span>
            </label>
          </div>
        </nav>

        <section id="home" className="hero-content" data-cursor-section="home">
          <p className="eyebrow">Soluciones creativas para tu negocio</p>
          <h1 className="ice-text">Impulsamos tu presencia digital con tecnología y diseño.</h1>
          <p>
            Desarrollamos sitios web, servicios SaaS y modelos de producto modernos,
            funcionales y pensados para convertir visitantes en clientes.
          </p>
          <a href="#contact" className="btn">Habla con nosotros</a>
        </section>
      </header>

      <main>
        <section id="about" className="section glass-section stack-section" data-cursor-section="about">
          <div className="section-header">
            <h2>Acerca de nosotros</h2>
            <p className="section-lead">
              Somos un equipo enfocado en crear experiencias digitales claras, rápidas y profesionales
              para marcas que quieren crecer.
            </p>
          </div>

          <div className="stack-block tech-section">
            <h3>Tecnologías con las que trabajamos</h3>
            <div className="card-grid">
              <article className="glass-card">
                <h4>React + Node</h4>
                <p>Construimos sitios y APIs modernas, rápidas y fáciles de mantener para cada proyecto.</p>
              </article>
              <article className="glass-card">
                <h4>Blender</h4>
                <p>
                  Utilizamos Blender para crear animaciones y visuales de calidad que aportan valor a la
                  identidad de cada marca.
                </p>
              </article>
              <article className="glass-card">
                <h4>HTML, CSS y JavaScript</h4>
                <p>
                  Combinamos estas tecnologías para construir interfaces modernas, funcionales y con una
                  excelente experiencia de usuario.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="works" className="section glass-section alt stack-section" data-cursor-section="works">
          <div className="section-header">
            <h2>Trabajos</h2>
            <p className="section-lead">Proyectos y soluciones que hemos desarrollado para distintos sectores.</p>
          </div>

          <div className="stack-block">
            <div className="card-grid">
              <article className="glass-card">
                <h3>Landing Page</h3>
                <p>Diseño atractivo y optimizado para captar clientes potenciales.</p>
              </article>
              <article className="glass-card">
                <h3>Tiendas Online</h3>
                <p>Plataformas fáciles de usar con experiencia de compra fluida.</p>
              </article>
              <article className="glass-card">
                <h3>Portales Corporativos</h3>
                <p>Soluciones profesionales para mostrar servicios y productos.</p>
              </article>
            </div>
          </div>

          <div className="stack-block softwares-section">
            <h3>Nuestros softwares</h3>
            <p className="section-lead softwares-lead">
              Herramientas propias para agilizar operaciones. Para costos y cotización, escríbenos.
            </p>
            <div className="card-grid">
              <article className="glass-card">
                <img
                  className="software-logo"
                  src={aviaMintLogo}
                  alt="Logo AviaMint"
                  width={72}
                  height={72}
                  loading="lazy"
                  decoding="async"
                />
                <h4>AviaMint</h4>
                <p>
                  Software de gestión aeronáutica para inventario, mantenimiento y operaciones.
                  Centraliza piezas, repuestos y documentación técnica, con alertas de servicio y
                  trazabilidad para mantener cada aeronave lista y en cumplimiento.
                </p>
                <a className="card-cta" href="#contact">
                  Cotizar / costos → Contacto
                </a>
              </article>
              <article className="glass-card">
                <img
                  className="software-logo"
                  src={autoStockLogo}
                  alt="Logo AutoStock Pro"
                  width={72}
                  height={72}
                  loading="lazy"
                  decoding="async"
                />
                <h4>AutoStock Pro</h4>
                <p>
                  Optimiza tu taller automotriz con un sistema que controla inventario, registra ventas
                  en tiempo real y mantiene tu stock siempre actualizado. Administra insumos, repuestos
                  y servicios desde un solo panel, con reportes claros de lo más vendido y alertas de
                  disponibilidad.
                </p>
                <a className="card-cta" href="#contact">
                  Cotizar / costos → Contacto
                </a>
              </article>
              <article className="glass-card">
                <h4>Ajustech Studio 3D</h4>
                <p>Pipeline interno para preparar modelos, animaciones y previews listos para web.</p>
              </article>
            </div>
          </div>
        </section>

        <div className="gallery-section-shell" data-cursor-section="gallery">
          <GalleryErrorBoundary>
            <Suspense
              fallback={
                <section className="section glass-section">
                  <p>Cargando galería…</p>
                </section>
              }
            >
              <Gallery />
            </Suspense>
          </GalleryErrorBoundary>
        </div>

        <ContactSection />

        <section id="privacidad" className="section glass-section" data-cursor-section="contact">
          <div className="section-header">
            <h2>Privacidad y cookies</h2>
            <p className="section-lead">
              En Ajustech usamos cookies necesarias para el funcionamiento del sitio. Las cookies
              opcionales de analítica solo se activan si las aceptas. Puedes cambiar tu elección en
              cualquier momento.
            </p>
          </div>
          <div className="privacy-actions">
            <button type="button" className="btn" onClick={openCookieSettings}>
              Gestionar cookies
            </button>
          </div>
        </section>
      </main>

      <footer>
        <p>© 2026 Ajustech. Todos los derechos reservados.</p>
        <p className="footer-links">
          <a href="#privacidad">Privacidad</a>
          <button type="button" className="footer-link-btn" onClick={openCookieSettings}>
            Cookies
          </button>
        </p>
      </footer>

      <CookieBanner />
    </div>
  );
}

export default App;
