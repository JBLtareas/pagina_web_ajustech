import { useEffect, useRef, useState } from 'react';
import Gallery from './components/Gallery';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [pendingDarkMode, setPendingDarkMode] = useState(true);
  const [themeTransition, setThemeTransition] = useState({ active: false, x: 0, y: 0, direction: 'to-light' });
  const toggleRef = useRef(null);

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

        <section id="home" className="hero-content">
          <p className="eyebrow">Soluciones creativas para tu negocio</p>
          <h1>Impulsamos tu presencia digital con tecnología y diseño.</h1>
          <p>Desarrollamos sitios web modernos, funcionales y pensados para convertir visitantes en clientes.</p>
          <a href="#contact" className="btn">Habla con nosotros</a>
        </section>
      </header>

      <main>
        <section id="about" className="section glass-section">
          <div className="section-header">
            <h2>Acerca de nosotros</h2>
            <p className="section-lead">Somos un equipo enfocado en crear experiencias digitales claras, rápidas y profesionales para marcas que quieren crecer.</p>
          </div>

          <div className="tech-section">
            <h3>Tecnologías con las que trabajamos</h3>
            <div className="tech-list">
              <article className="glass-card">
                <h4>Django</h4>
                <p>Usamos Django para ofrecer soluciones rápidas, seguras y robustas en cada proyecto que desarrollamos.</p>
              </article>
              <article className="glass-card">
                <h4>Blender</h4>
                <p>Utilizamos Blender para crear animaciones y visuales de calidad que aportan valor a la identidad de cada marca.</p>
              </article>
              <article className="glass-card">
                <h4>HTML, CSS y JavaScript</h4>
                <p>Combinamos estas tecnologías para construir interfaces modernas, funcionales y con una excelente experiencia de usuario.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="works" className="section glass-section alt">
          <div className="section-header">
            <h2>Trabajos</h2>
            <p className="section-lead">Proyectos y soluciones que hemos desarrollado para distintos sectores.</p>
          </div>
          <div className="cards">
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
        </section>

        <Gallery />

        <section id="contact" className="section glass-section">
          <div className="section-header">
            <h2>Contacto</h2>
            <p className="section-lead">Escríbenos para hablar de tu próximo proyecto.</p>
          </div>
          <a href="mailto:contacto@ajustech.com" className="btn">contacto@ajustech.com</a>
        </section>
      </main>

      <footer>
        © 2026 Ajustech. Todos los derechos reservados.
      </footer>
    </div>
  );
}

export default App;
