import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';

function Model({ url, autoRotate = true }) {
  const groupRef = useRef();
  const { scene } = useGLTF(url);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial color="#94a3b8" wireframe />
    </mesh>
  );
}

function GltfViewer({ url, autoRotate = true, className = '' }) {
  return (
    <div className={`gltf-viewer ${className}`.trim()}>
      <Canvas
        camera={{ position: [0, 0.5, 2.8], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 4]} intensity={1.2} />
        <Suspense fallback={<LoadingFallback />}>
          <Model url={url} autoRotate={autoRotate} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={1.5}
          maxDistance={6}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

export default GltfViewer;
