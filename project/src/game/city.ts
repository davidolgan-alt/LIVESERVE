import { useMemo } from 'react';
import * as THREE from 'three';

// Deterministic pseudo-random for stable layout
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type BuildingStyle = 'modern' | 'glass' | 'brick' | 'residential';

export interface BuildingInstance {
  position: [number, number, number];
  size: [number, number, number];
  color: THREE.Color;
  hasRoof: boolean;
  style: BuildingStyle;
  roofColor: THREE.Color;
}

export interface BenchInstance {
  position: [number, number, number];
  rotation: number;
}

export interface CityLayout {
  buildings: BuildingInstance[];
  treePositions: [number, number, number][];
  roadSegments: { position: [number, y: number, z: number]; size: [number, number]; rotation: number }[];
  blocks: { minX: number; maxX: number; minZ: number; maxZ: number }[];
  streetlights: { position: [number, number, number]; rotation: number }[];
  benches: BenchInstance[];
  crosswalks: { position: [number, number, number]; size: [number, number]; rotation: number }[];
}

const GRID = 5; // 5x5 city blocks
const BLOCK_SIZE = 40;
const ROAD_WIDTH = 12;
const PITCH = BLOCK_SIZE + ROAD_WIDTH;

export function generateCity(seed = 1337): CityLayout {
  const rand = mulberry32(seed);
  const buildings: BuildingInstance[] = [];
  const treePositions: [number, number, number][] = [];
  const roadSegments: CityLayout['roadSegments'] = [];
  const blocks: CityLayout['blocks'] = [];
  const streetlights: CityLayout['streetlights'] = [];
  const benches: BenchInstance[] = [];
  const crosswalks: CityLayout['crosswalks'] = [];

  const half = Math.floor(GRID / 2);
  const totalSpan = GRID * PITCH;

  const styles: BuildingStyle[] = ['modern', 'glass', 'brick', 'residential'];

  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      const cx = (gx - half) * PITCH;
      const cz = (gz - half) * PITCH;
      const minX = cx - BLOCK_SIZE / 2;
      const maxX = cx + BLOCK_SIZE / 2;
      const minZ = cz - BLOCK_SIZE / 2;
      const maxZ = cz + BLOCK_SIZE / 2;
      blocks.push({ minX, maxX, minZ, maxZ });

      // Buildings inside block — subdivide into 2x2 lots
      for (let sx = 0; sx < 2; sx++) {
        for (let sz = 0; sz < 2; sz++) {
          if (rand() < 0.15) continue; // empty lot / park
          const lotW = BLOCK_SIZE / 2 - 2;
          const lotD = BLOCK_SIZE / 2 - 2;
          const lx = minX + sx * (BLOCK_SIZE / 2) + lotW / 2 + 1;
          const lz = minZ + sz * (BLOCK_SIZE / 2) + lotD / 2 + 1;
          const w = lotW * (0.55 + rand() * 0.38);
          const d = lotD * (0.55 + rand() * 0.38);
          const style = styles[Math.floor(rand() * styles.length)];

          let h: number;
          if (style === 'residential') h = 5 + rand() * 8;
          else if (style === 'brick') h = 8 + rand() * 14;
          else if (style === 'glass') h = 12 + rand() * rand() * 38;
          else h = 10 + rand() * rand() * 30;

          let hue: number, sat: number, light: number;
          if (style === 'glass') {
            hue = 0.55 + (rand() - 0.5) * 0.08;
            sat = 0.04 + rand() * 0.12;
            light = 0.4 + rand() * 0.25;
          } else if (style === 'brick') {
            hue = 0.02 + (rand() - 0.5) * 0.03;
            sat = 0.3 + rand() * 0.25;
            light = 0.3 + rand() * 0.2;
          } else if (style === 'residential') {
            hue = 0.08 + (rand() - 0.5) * 0.15;
            sat = 0.08 + rand() * 0.15;
            light = 0.45 + rand() * 0.25;
          } else {
            hue = 0.58 + (rand() - 0.5) * 0.1;
            sat = 0.06 + rand() * 0.12;
            light = 0.4 + rand() * 0.25;
          }
          const color = new THREE.Color().setHSL(hue, sat, light);
          const roofColor = new THREE.Color().setHSL(
            style === 'brick' ? 0.02 : 0.58,
            0.05 + rand() * 0.1,
            0.2 + rand() * 0.15,
          );

          buildings.push({
            position: [lx, h / 2, lz],
            size: [w, h, d],
            color,
            hasRoof: style === 'residential' || rand() < 0.5,
            style,
            roofColor,
          });
        }
      }

      // Trees in empty corners and along sidewalks
      if (rand() < 0.5) {
        treePositions.push([cx - BLOCK_SIZE / 3, 0, cz - BLOCK_SIZE / 3]);
      }
      if (rand() < 0.5) {
        treePositions.push([cx + BLOCK_SIZE / 3, 0, cz + BLOCK_SIZE / 3]);
      }
      if (rand() < 0.35) {
        treePositions.push([cx - BLOCK_SIZE / 3, 0, cz + BLOCK_SIZE / 3]);
      }

      // Benches near sidewalks
      if (rand() < 0.4) {
        benches.push({
          position: [cx - BLOCK_SIZE / 2 - 1.5, 0, cz + BLOCK_SIZE / 4],
          rotation: Math.PI / 2,
        });
      }
      if (rand() < 0.4) {
        benches.push({
          position: [cx + BLOCK_SIZE / 2 + 1.5, 0, cz - BLOCK_SIZE / 4],
          rotation: -Math.PI / 2,
        });
      }
    }
  }

  // Roads — horizontal and vertical strips
  for (let i = 0; i <= GRID; i++) {
    const offset = (i - half - 0.5) * PITCH + ROAD_WIDTH / 2;
    // Horizontal road (runs along X)
    roadSegments.push({
      position: [0, 0.01, offset],
      size: [totalSpan + ROAD_WIDTH, ROAD_WIDTH],
      rotation: 0,
    });
    // Vertical road (runs along Z)
    roadSegments.push({
      position: [offset, 0.01, 0],
      size: [ROAD_WIDTH, totalSpan + ROAD_WIDTH],
      rotation: 0,
    });
  }

  // Crosswalks at each intersection — stripes across roads
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = (i - half) * PITCH + PITCH / 2;
      const z = (j - half) * PITCH + PITCH / 2;
      // Crosswalk on north side (horizontal road)
      for (let s = 0; s < 4; s++) {
        crosswalks.push({
          position: [x - 4 + s * 2.5, 0.02, z + PITCH / 2 - ROAD_WIDTH / 2 - 1],
          size: [1.8, 0.3],
          rotation: 0,
        });
      }
      // Crosswalk on south side
      for (let s = 0; s < 4; s++) {
        crosswalks.push({
          position: [x - 4 + s * 2.5, 0.02, z - PITCH / 2 + ROAD_WIDTH / 2 + 1],
          size: [1.8, 0.3],
          rotation: 0,
        });
      }
      // Crosswalk on east side (vertical road)
      for (let s = 0; s < 4; s++) {
        crosswalks.push({
          position: [x + PITCH / 2 - ROAD_WIDTH / 2 - 1, 0.02, z - 4 + s * 2.5],
          size: [0.3, 1.8],
          rotation: 0,
        });
      }
      // Crosswalk on west side
      for (let s = 0; s < 4; s++) {
        crosswalks.push({
          position: [x - PITCH / 2 + ROAD_WIDTH / 2 + 1, 0.02, z - 4 + s * 2.5],
          size: [0.3, 1.8],
          rotation: 0,
        });
      }
    }
  }

  // Streetlights at road edges near intersections
  for (let i = 0; i <= GRID; i++) {
    for (let j = 0; j <= GRID; j++) {
      const x = (i - half - 0.5) * PITCH + ROAD_WIDTH / 2;
      const z = (j - half - 0.5) * PITCH + ROAD_WIDTH / 2;
      streetlights.push({ position: [x + ROAD_WIDTH / 2 + 0.5, 0, z], rotation: 0 });
    }
  }

  return { buildings, treePositions, roadSegments, blocks, streetlights, benches, crosswalks };
}

// Collision boxes for buildings (XZ bounds)
export function buildingsToColliders(buildings: BuildingInstance[]): THREE.Box3[] {
  return buildings.map((b) => {
    const [x, , z] = b.position;
    const [w, h, d] = b.size;
    return new THREE.Box3(
      new THREE.Vector3(x - w / 2, 0, z - d / 2),
      new THREE.Vector3(x + w / 2, h, z + d / 2),
    );
  });
}

export function isBlocked(
  colliders: THREE.Box3[],
  x: number,
  z: number,
  margin = 0.8,
): boolean {
  for (const box of colliders) {
    if (
      x > box.min.x - margin &&
      x < box.max.x + margin &&
      z > box.min.z - margin &&
      z < box.max.z + margin
    ) {
      return true;
    }
  }
  return false;
}

export const CITY_SPAN = GRID * PITCH;
export { PITCH, BLOCK_SIZE, ROAD_WIDTH };
