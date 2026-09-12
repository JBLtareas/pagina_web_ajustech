import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  ObjectLoader,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Archivos en public/models/ */
export const POCHACCO_URL = '/models/pochacco.json';
export const POCHACCO_GLB_URL = '/models/pochacco.glb';

/** Piezas del personaje; el resto son helpers de Blender (Plane, Sphere, Cylinder…). */
const CHARACTER_MESH =
  /^(Brazo|Cabez|camisa|Cube|cuerpo|Nariz|Ojos|Oreja|pelo|Pierna)/i;

/**
 * Oculta props/helpers del .glb y mide solo el personaje.
 * Sin esto el bbox ~600u deja a Pochacco invisible.
 */
function cleanAndMeasure(object) {
  const content = new Box3();
  let kept = 0;

  object.traverse((child) => {
    if (!child.isMesh) return;

    if (!CHARACTER_MESH.test(child.name)) {
      child.visible = false;
      return;
    }

    // Geometría local (precise) para no reintroducir meshes ocultos vecinos
    const box = new Box3().setFromObject(child, true);
    if (box.isEmpty()) {
      child.visible = false;
      return;
    }

    content.union(box);
    kept += 1;
  });

  if (!kept || content.isEmpty()) {
    object.traverse((child) => {
      if (child.isMesh) child.visible = true;
    });
    return new Box3().setFromObject(object);
  }

  return content;
}

/**
 * Escala y centra en un pivot en el origen.
 * Escala primero, luego centra (si no, modelos grandes salen de cámara).
 */
function fitObject(object, targetSize = 1.85) {
  const pivot = new Group();
  pivot.add(object);

  object.updateMatrixWorld(true);
  const contentBox = cleanAndMeasure(object);
  const size = contentBox.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  object.scale.multiplyScalar(targetSize / maxDim);
  object.updateMatrixWorld(true);

  const scaled = cleanAndMeasure(object);
  const center = scaled.getCenter(new Vector3());
  object.position.sub(center);
  object.updateMatrixWorld(true);

  return pivot;
}

function loadModel(url) {
  return new Promise((resolve, reject) => {
    if (url.endsWith('.json')) {
      const loader = new ObjectLoader();
      loader.load(url, resolve, undefined, reject);
      return;
    }

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      reject,
    );
  });
}

function GltfViewer({
  url = POCHACCO_URL,
  autoRotate = true,
  float = false,
  className = '',
}) {
  const mountRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let frameId = 0;
    /** @type {Group | null} */
    let root = null;
    const floatBase = new Vector3();

    const width = Math.max(mount.clientWidth, 1);
    const height = Math.max(mount.clientHeight, 1);

    const scene = new Scene();
    const camera = new PerspectiveCamera(40, width / height, 0.05, 200);
    camera.position.set(0, 0.2, 3.2);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    renderer.setClearColor(new Color(0x000000), 0);
    renderer.outputColorSpace = SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 9;
    controls.target.set(0, 0, 0);
    controls.update();

    scene.add(new AmbientLight(0xffffff, 0.9));
    scene.add(new HemisphereLight(0xffffff, 0x556677, 0.55));
    const key = new DirectionalLight(0xffffff, 1.7);
    key.position.set(4, 7, 3);
    scene.add(key);
    const fill = new DirectionalLight(0xffb070, 0.75);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    setLoading(true);
    setError('');

    // GLB primero (más liviano); JSON de Object3D como fallback
    const tryUrls =
      url === POCHACCO_URL || url === POCHACCO_GLB_URL
        ? [POCHACCO_GLB_URL, POCHACCO_URL]
        : [url];

    const loadFirst = async () => {
      let lastError;
      for (const candidate of tryUrls) {
        try {
          const object = await loadModel(candidate);
          if (disposed) return;
          root = fitObject(object, 2.05);
          floatBase.copy(root.position);
          scene.add(root);
          setLoading(false);
          return;
        } catch (err) {
          lastError = err;
          console.warn('[Three.js] falló', candidate, err);
        }
      }
      if (!disposed) {
        setError(lastError?.message || 'No se pudo cargar el modelo.');
        setLoading(false);
      }
    };

    loadFirst();

    let t = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      t += 0.016;
      if (root) {
        if (autoRotate) root.rotation.y += 0.008;
        if (float) {
          root.position.y = floatBase.y + Math.sin(t * 1.1) * 0.08;
          root.rotation.z = Math.sin(t * 0.7) * 0.03;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = Math.max(mount.clientWidth, 1);
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [url, autoRotate, float]);

  return (
    <div className={`gltf-viewer ${className}`.trim()} ref={mountRef}>
      {loading ? <div className="gltf-viewer-fallback">Cargando modelo…</div> : null}
      {error ? (
        <div className="gltf-viewer-fallback">
          <p>No se pudo cargar el modelo 3D.</p>
          <small>{error}</small>
        </div>
      ) : null}
    </div>
  );
}

export default GltfViewer;
