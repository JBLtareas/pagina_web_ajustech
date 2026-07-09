import GltfViewer from './GltfViewer';

const GALLERY_ITEMS = [
  {
    id: 'video-1',
    type: 'video',
    title: 'Animación de producto',
    description: 'Reemplaza la URL con tu video en public/assets o un enlace externo.',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    poster: '',
  },
  {
    id: 'video-2',
    type: 'video',
    title: 'Demo de proyecto',
    description: 'Ideal para mostrar recorridos, prototipos o presentaciones en movimiento.',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
    poster: '',
  },
  {
    id: 'gltf-1',
    type: 'gltf',
    title: 'Modelo 3D interactivo',
    description: 'Arrastra para rotar. Coloca tus archivos .gltf o .glb en public/models/.',
    src: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF/DamagedHelmet.gltf',
  },
  {
    id: 'gltf-2',
    type: 'gltf',
    title: 'Visualización Blender',
    description: 'Exporta desde Blender en formato GLB y actualiza la ruta del modelo.',
    src: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf',
  },
];

function GalleryItem({ item }) {
  return (
    <article className="glass-card gallery-item">
      <div className="gallery-media">
        {item.type === 'video' ? (
          <video
            className="gallery-video"
            controls
            playsInline
            preload="metadata"
            poster={item.poster || undefined}
          >
            <source src={item.src} />
            Tu navegador no soporta la reproducción de video.
          </video>
        ) : (
          <GltfViewer url={item.src} />
        )}
      </div>
      <div className="gallery-info">
        <span className="gallery-badge">{item.type === 'video' ? 'Video' : 'GLTF / GLB'}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </article>
  );
}

function Gallery() {
  return (
    <section id="gallery" className="section glass-section">
      <div className="section-header">
        <p className="eyebrow">Portafolio visual</p>
        <h2>Galería</h2>
        <p className="section-lead">
          Espacio para mostrar videos y modelos 3D. Edita el arreglo en
          {' '}
          <code>src/components/Gallery.jsx</code>
          {' '}
          para agregar tus propios archivos.
        </p>
      </div>

      <div className="gallery-grid">
        {GALLERY_ITEMS.map((item) => (
          <GalleryItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default Gallery;
