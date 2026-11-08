import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { City } from './City';
import { Player } from './Player';
import { NPCs } from './NPCs';
import { DayNight, getSkyColor, getFogColor } from './DayNight';
import { generateCity } from './city';

interface GameSceneProps {
  paused: boolean;
  dayProgress: number;
  savedPosition: React.MutableRefObject<[number, number, number]>;
  onPositionChange: (pos: [number, number, number]) => void;
  onYawChange: (yaw: number) => void;
}

export function GameScene({ paused, dayProgress, savedPosition, onPositionChange, onYawChange }: GameSceneProps) {
  const skyColor = useMemo(() => getSkyColor(dayProgress), [dayProgress]);
  const fogColor = useMemo(() => getFogColor(dayProgress), [dayProgress]);
  const cityData = useMemo(() => generateCity(1337), []);

  const buildings = useMemo(
    () =>
      cityData.buildings.map((b) => ({
        x: b.position[0],
        z: b.position[2],
        w: b.size[0],
        d: b.size[2],
      })),
    [cityData],
  );

  // Expose buildings for minimap via ref-passing (App already has this)
  void buildings;

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 55, near: 0.1, far: 600, position: [0, 8, 16] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ scene, gl }) => {
        scene.fog = new THREE.Fog(fogColor, 60, 320);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[fogColor, 60, 320]} />

      <DayNight dayProgress={dayProgress} />

        <Suspense fallback={null}>
          <City />
          <NPCs />
          <Player
            paused={paused}
            savedPosition={savedPosition}
            onPositionChange={onPositionChange}
            onYawChange={onYawChange}
          />
        </Suspense>
      </Canvas>
  );
}
