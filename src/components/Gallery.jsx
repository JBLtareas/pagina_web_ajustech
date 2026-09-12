import pochaccoRender from '../assets/poccahco completo render.png';

/** Video en public/ para no trabar el watcher de Vite en Windows */
const FLOWERS_VIDEO = '/videos/flowers.mp4';

/**
 * Bandas diagonales simétricas.
 * Para añadir contenido: empuja otro objeto a `panels` (image | video).
 */
const SHOWCASE_PANELS = [
  {
    type: 'image',
    src: pochaccoRender,
    position: '58% 52%',
    alt: 'Pochacco render',
  },
  {
    type: 'video',
    src: FLOWERS_VIDEO,
    position: '50% 50%',
    alt: 'Video Flowers',
  },
];

/** Inclinación compartida (mismo ángulo en todas las uniones). */
const BAND_SLANT = 7;

/**
 * Clip simétrico por índice: cada panel ocupa 1/n con el mismo bisel.
 * Funciona con 2, 3, 4… paneles.
 */
function bandClipPath(index, total, slant = BAND_SLANT) {
  const n = Math.max(total, 1);
  const y0 = (index / n) * 100;
  const y1 = ((index + 1) / n) * 100;

  const topLeft = index === 0 ? 0 : Math.min(100, y0 + slant);
  const topRight = index === 0 ? 0 : Math.max(0, y0 - slant);
  const bottomRight = index === n - 1 ? 100 : Math.min(100, y1 - slant);
  const bottomLeft = index === n - 1 ? 100 : Math.min(100, y1 + slant);

  return `polygon(0% ${topLeft}%, 100% ${topRight}%, 100% ${bottomRight}%, 0% ${bottomLeft}%)`;
}

const GALLERY_ITEMS = [
  {
    id: 'showcase',
    type: 'clip-bands',
    featured: true,
    panels: SHOWCASE_PANELS,
  },
  {
    id: 'pochacco',
    type: 'image',
    title: 'Pochacco',
    description: 'Render completo modelado en Blender.',
    src: pochaccoRender,
    badge: 'Render',
  },
  {
    id: 'flowers',
    type: 'video',
    title: 'Flowers',
    description: 'Clip de motion propio para campañas y demos.',
    src: FLOWERS_VIDEO,
    badge: 'Video',
  },
];

function ClipBands({ panels }) {
  const total = panels.length;

  return (
    <div className="clip-bands-stage">
      <ul
        className="clip-bands"
        aria-label="Showcase"
        style={{ '--clip-count': total }}
      >
        {panels.map((panel, i) => (
          <li
            key={`${panel.type}-${panel.alt || i}`}
            style={{
              '--band-clip': bandClipPath(i, total),
              zIndex: i + 1,
            }}
          >
            {panel.type === 'video' ? (
              <video
                className="clip-bands-media"
                src={panel.src}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={panel.alt}
                style={{ objectPosition: panel.position || '50% 50%' }}
              />
            ) : (
              <img
                className="clip-bands-media"
                src={panel.src}
                alt={panel.alt || ''}
                style={{ objectPosition: panel.position || '50% 50%' }}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GalleryItem({ item }) {
  const isFeatured = Boolean(item.featured);

  return (
    <article className={`glass-card gallery-item${isFeatured ? ' gallery-item--featured' : ''}`}>
      <div
        className={`gallery-media${
          isFeatured ? ' gallery-media--stage gallery-media--clip' : ''
        }`}
      >
        {item.type === 'clip-bands' ? (
          <ClipBands panels={item.panels} />
        ) : item.type === 'video' ? (
          <video
            className="gallery-video"
            controls
            playsInline
            preload="metadata"
            poster={item.poster || undefined}
          >
            <source src={item.src} type="video/mp4" />
            Tu navegador no soporta la reproducción de video.
          </video>
        ) : (
          <figure className="gallery-render">
            <img
              className="gallery-render-img"
              src={item.src}
              alt={item.title}
              loading="lazy"
              decoding="async"
            />
          </figure>
        )}
      </div>
      {!isFeatured && (
        <div className="gallery-info">
          <span className="gallery-badge">
            {item.badge || (item.type === 'video' ? 'Video' : 'Render')}
          </span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      )}
    </article>
  );
}

function Gallery() {
  return (
    <section id="gallery" className="section glass-section" data-cursor-section="gallery">
      <div className="section-header">
        <h2>Galería</h2>
      </div>

      <div className="gallery-grid gallery-grid--showcase">
        {GALLERY_ITEMS.map((item) => (
          <GalleryItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default Gallery;
