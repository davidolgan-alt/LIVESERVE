import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DayNightProps {
  dayProgress: number; // 0-1
}

// Pre-generate star field
function generateStars(): Float32Array {
  const count = 600;
  const arr = new Float32Array(count * 3);
  const rand = mulberry32(42);
  for (let i = 0; i < count; i++) {
    // Distribute on upper hemisphere dome
    const theta = rand() * Math.PI * 2;
    const phi = rand() * Math.PI * 0.5;
    const r = 400;
    arr[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
    arr[i * 3 + 1] = Math.cos(phi) * r + 50;
    arr[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
  }
  return arr;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function DayNight({ dayProgress }: DayNightProps) {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const starGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(generateStars(), 3));
    return geo;
  }, []);

  useFrame(() => {
    // 0.25 = sunrise (6am), 0.5 = noon, 0.75 = sunset (6pm), 0 = midnight
    const angle = (dayProgress - 0.25) * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunX = Math.cos(angle);

    const isDay = sunY > -0.08;
    const dayFactor = Math.max(0, Math.min(1, (sunY + 0.08) / 0.35));

    if (sunRef.current) {
      sunRef.current.position.set(sunX * 100, sunY * 100, 40);
      sunRef.current.intensity = isDay ? 0.4 + dayFactor * 2.5 : 0.03;
      // Warm at sunrise/sunset, white at noon
      const warmness = 1 - dayFactor;
      const r = 0.6 + warmness * 0.35;
      const g = 0.6 + dayFactor * 0.3;
      const b = 0.7 + dayFactor * 0.25;
      sunRef.current.color.setRGB(r, g, b);
    }

    if (ambientRef.current) {
      ambientRef.current.intensity = isDay ? 0.3 + dayFactor * 0.5 : 0.1;
      if (isDay) {
        ambientRef.current.color.setRGB(0.6 + dayFactor * 0.3, 0.7 + dayFactor * 0.2, 0.85);
      } else {
        ambientRef.current.color.setRGB(0.22, 0.26, 0.42);
      }
    }

    if (hemiRef.current) {
      hemiRef.current.intensity = isDay ? 0.35 + dayFactor * 0.55 : 0.18;
      if (isDay) {
        hemiRef.current.color.setRGB(0.6, 0.75, 0.95);
        hemiRef.current.groundColor.setRGB(0.3, 0.3, 0.25);
      } else {
        hemiRef.current.color.setRGB(0.16, 0.2, 0.33);
        hemiRef.current.groundColor.setRGB(0.1, 0.1, 0.12);
      }
    }

    if (sunMeshRef.current) {
      sunMeshRef.current.position.set(sunX * 200, sunY * 200, 40);
      const mat = sunMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isDay ? 0.9 : 0;
    }
    if (moonMeshRef.current) {
      moonMeshRef.current.position.set(-sunX * 200, -sunY * 200, 40);
      const mat = moonMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isDay ? 0 : 0.8;
    }
    if (starsRef.current) {
      const mat = starsRef.current.material as THREE.PointsMaterial;
      mat.opacity = isDay ? 0 : Math.max(0, 1 - dayFactor * 2);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.5} />
      <hemisphereLight ref={hemiRef} intensity={0.4} color="#bcd4ff" groundColor="#4a4030" />
      <directionalLight
        ref={sunRef}
        castShadow
        position={[50, 80, 40]}
        intensity={2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={300}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-bias={-0.0005}
      />
      {/* Sun glow */}
      <mesh ref={sunMeshRef}>
        <sphereGeometry args={[14, 16, 16]} />
        <meshBasicMaterial color="#fff5d0" transparent opacity={0.9} fog={false} />
      </mesh>
      {/* Sun halo */}
      <mesh>
        <sphereGeometry args={[22, 16, 16]} />
        <meshBasicMaterial color="#ffcc66" transparent opacity={0.12} fog={false} />
      </mesh>
      {/* Moon */}
      <mesh ref={moonMeshRef}>
        <sphereGeometry args={[9, 16, 16]} />
        <meshBasicMaterial color="#d8e0f0" transparent opacity={0} fog={false} />
      </mesh>
      {/* Stars */}
      <points ref={starsRef} geometry={starGeo}>
        <pointsMaterial color="#ffffff" size={1.2} sizeAttenuation transparent opacity={0} fog={false} />
      </points>
    </>
  );
}

// Dynamic sky color based on time — richer gradient transitions
export function getSkyColor(dayProgress: number): string {
  if (dayProgress < 0.2 || dayProgress > 0.82) {
    return '#070b18';
  } else if (dayProgress < 0.28) {
    const t = (dayProgress - 0.2) / 0.08;
    return lerpColor('#070b18', '#d4583a', t);
  } else if (dayProgress < 0.38) {
    const t = (dayProgress - 0.28) / 0.1;
    return lerpColor('#d4583a', '#6ba0d8', t);
  } else if (dayProgress < 0.68) {
    return '#5294d0';
  } else if (dayProgress < 0.78) {
    const t = (dayProgress - 0.68) / 0.1;
    return lerpColor('#5294d0', '#d04030', t);
  } else {
    const t = (dayProgress - 0.78) / 0.04;
    return lerpColor('#d04030', '#070b18', t);
  }
}

// Fog color — slightly different from sky for atmospheric depth
export function getFogColor(dayProgress: number): string {
  if (dayProgress < 0.2 || dayProgress > 0.82) {
    return '#0a0e1c';
  } else if (dayProgress < 0.4) {
    const t = Math.max(0, (dayProgress - 0.2) / 0.2);
    return lerpColor('#1a1424', '#7088a0', t);
  } else if (dayProgress < 0.7) {
    return '#8094ac';
  } else {
    const t = Math.min(1, (dayProgress - 0.7) / 0.12);
    return lerpColor('#8094ac', '#1a1424', t);
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  const c = ca.lerp(cb, Math.max(0, Math.min(1, t)));
  return `#${c.getHexString()}`;
}
