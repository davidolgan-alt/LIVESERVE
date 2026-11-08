import { useMemo } from 'react';
import * as THREE from 'three';
import { generateCity, BuildingInstance, BuildingStyle } from './city';

// ---- Shared materials (cached for performance) ----
const buildingMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getBuildingMaterial(color: THREE.Color, style: BuildingStyle): THREE.MeshStandardMaterial {
  const key = color.getHexString() + style;
  let m = buildingMaterialCache.get(key);
  if (!m) {
    const metalness = style === 'glass' ? 0.45 : 0.08;
    const roughness = style === 'glass' ? 0.15 : style === 'brick' ? 0.95 : 0.82;
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    buildingMaterialCache.set(key, m);
  }
  return m;
}

// Window materials by type
const windowDayMat = new THREE.MeshStandardMaterial({
  color: '#1a2535',
  emissive: '#0a1020',
  emissiveIntensity: 0.2,
  roughness: 0.3,
  metalness: 0.4,
});
const glassWindowMat = new THREE.MeshStandardMaterial({
  color: '#2a3848',
  emissive: '#101822',
  emissiveIntensity: 0.15,
  roughness: 0.1,
  metalness: 0.6,
});
const warmWindowMat = new THREE.MeshStandardMaterial({
  color: '#2a2018',
  emissive: '#ffcc66',
  emissiveIntensity: 0.0, // set dynamically
  roughness: 0.35,
  metalness: 0.2,
});
const brickWindowMat = new THREE.MeshStandardMaterial({
  color: '#15120e',
  roughness: 0.8,
  metalness: 0.05,
});
const residentialWindowMat = new THREE.MeshStandardMaterial({
  color: '#1e2a38',
  emissive: '#0a1218',
  emissiveIntensity: 0.1,
  roughness: 0.4,
  metalness: 0.15,
});

const roofMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
function getRoofMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  const key = color.getHexString();
  let m = roofMaterialCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    roofMaterialCache.set(key, m);
  }
  return m;
}

const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#3d2817', roughness: 0.95 });
const leavesMaterialA = new THREE.MeshStandardMaterial({ color: '#2d4a22', roughness: 0.85 });
const leavesMaterialB = new THREE.MeshStandardMaterial({ color: '#356028', roughness: 0.85 });
const leavesMaterialC = new THREE.MeshStandardMaterial({ color: '#446b2e', roughness: 0.85 });

const sidewalkMaterial = new THREE.MeshStandardMaterial({
  color: '#5a5a62',
  roughness: 0.92,
});
const curbMaterial = new THREE.MeshStandardMaterial({
  color: '#6a6a72',
  roughness: 0.9,
});

const roadMaterial = new THREE.MeshStandardMaterial({
  color: '#1a1a1e',
  roughness: 0.95,
});

const laneMarkingMaterial = new THREE.MeshStandardMaterial({
  color: '#d4b440',
  roughness: 0.6,
  emissive: '#6a5820',
  emissiveIntensity: 0.1,
});

const crosswalkMaterial = new THREE.MeshStandardMaterial({
  color: '#d0d0d4',
  roughness: 0.7,
});

const lampPoleMaterial = new THREE.MeshStandardMaterial({
  color: '#1a1a1e',
  roughness: 0.5,
  metalness: 0.5,
});

const groundMaterial = new THREE.MeshStandardMaterial({
  color: '#2a2a30',
  roughness: 1,
});

const benchMaterial = new THREE.MeshStandardMaterial({
  color: '#4a3520',
  roughness: 0.8,
});
const benchLegMaterial = new THREE.MeshStandardMaterial({
  color: '#1a1a1e',
  roughness: 0.6,
  metalness: 0.3,
});

// ---- Building component with style-based facades ----

interface WindowDef {
  pos: [number, number, number];
  size: [number, number, number];
  mat: THREE.Material;
}

function Building({ b }: { b: BuildingInstance }) {
  const mat = useMemo(() => getBuildingMaterial(b.color, b.style), [b.color, b.style]);
  const roofMat = useMemo(() => getRoofMaterial(b.roofColor), [b.roofColor]);

  const windows = useMemo<WindowDef[]>(() => {
    const [w, h, d] = b.size;
    const items: WindowDef[] = [];
    const floorH = 3;

    if (b.style === 'glass') {
      // Glass tower — large continuous horizontal window strips
      const floors = Math.floor(h / floorH);
      for (let f = 1; f < floors; f++) {
        const y = f * floorH - h / 2;
        // Horizontal glass strips on all 4 sides
        items.push({ pos: [0, y, d / 2 + 0.03], size: [w * 0.88, 1.6, 0.04], mat: glassWindowMat });
        items.push({ pos: [0, y, -d / 2 - 0.03], size: [w * 0.88, 1.6, 0.04], mat: glassWindowMat });
        items.push({ pos: [w / 2 + 0.03, y, 0], size: [0.04, 1.6, d * 0.88], mat: glassWindowMat });
        items.push({ pos: [-w / 2 - 0.03, y, 0], size: [0.04, 1.6, d * 0.88], mat: glassWindowMat });
        // Vertical mullions
        const mullions = Math.floor(w / 3);
        for (let m = 0; m <= mullions; m++) {
          const mx = (m / mullions - 0.5) * w * 0.88;
          items.push({ pos: [mx, y, d / 2 + 0.05], size: [0.08, 1.6, 0.04], mat: mat });
        }
      }
    } else if (b.style === 'brick') {
      // Brick building — smaller windows with sills, varied sizes
      const floors = Math.floor(h / floorH);
      const wcols = Math.max(2, Math.floor(w / 3));
      const dcols = Math.max(2, Math.floor(d / 3));
      for (let f = 1; f < floors; f++) {
        const y = f * floorH - h / 2;
        for (let c = 0; c < wcols; c++) {
          const x = (c / (wcols - 1) - 0.5) * (w - 2);
          const ww = 1.2 + ((c * 7 + f * 3) % 3) * 0.3;
          items.push({ pos: [x, y, d / 2 + 0.03], size: [ww, 1.5, 0.06], mat: brickWindowMat });
          // Window sill
          items.push({ pos: [x, y - 0.85, d / 2 + 0.04], size: [ww + 0.2, 0.1, 0.08], mat: mat });
          // Back face
          items.push({ pos: [x, y, -d / 2 - 0.03], size: [ww, 1.5, 0.06], mat: brickWindowMat });
          items.push({ pos: [x, y - 0.85, -d / 2 - 0.04], size: [ww + 0.2, 0.1, 0.08], mat: mat });
        }
        for (let c = 0; c < dcols; c++) {
          const z = (c / (dcols - 1) - 0.5) * (d - 2);
          items.push({ pos: [w / 2 + 0.03, y, z], size: [0.06, 1.5, 1.2], mat: brickWindowMat });
          items.push({ pos: [-w / 2 - 0.03, y, z], size: [0.06, 1.5, 1.2], mat: brickWindowMat });
        }
      }
    } else if (b.style === 'residential') {
      // Residential — balconies and smaller windows
      const floors = Math.floor(h / floorH);
      const wcols = Math.max(1, Math.floor(w / 3.5));
      for (let f = 1; f <= floors; f++) {
        const y = f * floorH - h / 2 - floorH / 2;
        for (let c = 0; c < wcols; c++) {
          const x = (c / (wcols - 1 || 1) - 0.5) * (w - 3);
          items.push({ pos: [x, y, d / 2 + 0.03], size: [1.4, 1.2, 0.06], mat: residentialWindowMat });
          items.push({ pos: [x, y, -d / 2 - 0.03], size: [1.4, 1.2, 0.06], mat: residentialWindowMat });
          // Balcony rail
          items.push({ pos: [x, y - 0.4, d / 2 + 0.25], size: [1.6, 0.6, 0.05], mat: mat });
        }
      }
    } else {
      // Modern — grid of windows with frames
      const floors = Math.floor(h / floorH);
      const wcols = Math.max(2, Math.floor(w / 2.5));
      const dcols = Math.max(2, Math.floor(d / 2.5));
      for (let f = 1; f < floors; f++) {
        const y = f * floorH - h / 2;
        for (let c = 0; c < wcols; c++) {
          const x = (c / (wcols - 1 || 1) - 0.5) * (w - 1.5);
          const useWarm = (f + c) % 5 === 0;
          items.push({ pos: [x, y, d / 2 + 0.03], size: [1.1, 1.5, 0.05], mat: useWarm ? warmWindowMat : windowDayMat });
          items.push({ pos: [x, y, -d / 2 - 0.03], size: [1.1, 1.5, 0.05], mat: useWarm ? warmWindowMat : windowDayMat });
        }
        for (let c = 0; c < dcols; c++) {
          const z = (c / (dcols - 1 || 1) - 0.5) * (d - 1.5);
          items.push({ pos: [w / 2 + 0.03, y, z], size: [0.05, 1.5, 1.1], mat: windowDayMat });
          items.push({ pos: [-w / 2 - 0.03, y, z], size: [0.05, 1.5, 1.1], mat: windowDayMat });
        }
      }
      // Ground floor entrance
      items.push({ pos: [0, -h / 2 + 1.5, d / 2 + 0.05], size: [2, 3, 0.1], mat: glassWindowMat });
    }
    return items;
  }, [b.size, b.style, mat]);

  return (
    <group position={b.position}>
      {/* Main body */}
      <mesh material={mat} castShadow receiveShadow>
        <boxGeometry args={b.size} />
      </mesh>

      {/* Roof / rooftop detail */}
      {b.hasRoof && (
        <mesh position={[0, b.size[1] / 2 + 0.3, 0]} material={roofMat} castShadow>
          <boxGeometry args={[b.size[0] * 0.92, 0.6, b.size[2] * 0.92]} />
        </mesh>
      )}

      {/* Rooftop AC unit for modern/glass buildings */}
      {(b.style === 'modern' || b.style === 'glass') && (
        <mesh position={[b.size[0] * 0.2, b.size[1] / 2 + 0.8, -b.size[2] * 0.15]} castShadow material={roofMat}>
          <boxGeometry args={[1.5, 0.8, 1.2]} />
        </mesh>
      )}

      {/* Antenna for tall glass buildings */}
      {b.style === 'glass' && b.size[1] > 25 && (
        <mesh position={[0, b.size[1] / 2 + 2.5, 0]} material={lampPoleMaterial}>
          <cylinderGeometry args={[0.04, 0.06, 4, 4]} />
        </mesh>
      )}

      {/* Windows */}
      {windows.map((wd, i) => (
        <mesh key={i} position={wd.pos} material={wd.mat}>
          <boxGeometry args={wd.size} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position, variant }: { position: [number, number, number]; variant: number }) {
  const leavesMat = variant % 3 === 0 ? leavesMaterialA : variant % 3 === 1 ? leavesMaterialB : leavesMaterialC;
  const trunkH = 2 + (variant % 3) * 0.6;
  return (
    <group position={position}>
      <mesh position={[0, trunkH / 2, 0]} material={trunkMaterial} castShadow>
        <cylinderGeometry args={[0.25, 0.38, trunkH, 6]} />
      </mesh>
      {/* Layered canopy for depth */}
      <mesh position={[0, trunkH + 1.2, 0]} material={leavesMat} castShadow>
        <icosahedronGeometry args={[1.6, 1]} />
      </mesh>
      <mesh position={[0.6, trunkH + 0.8, 0.3]} material={leavesMat} castShadow>
        <icosahedronGeometry args={[1.0, 1]} />
      </mesh>
      <mesh position={[-0.5, trunkH + 1.0, -0.4]} material={leavesMat} castShadow>
        <icosahedronGeometry args={[0.9, 1]} />
      </mesh>
    </group>
  );
}

function Streetlight({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 3, 0]} material={lampPoleMaterial} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 6, 6]} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} material={lampPoleMaterial}>
        <cylinderGeometry args={[0.22, 0.25, 0.3, 6]} />
      </mesh>
      {/* Arm */}
      <mesh position={[0.8, 5.9, 0]} material={lampPoleMaterial}>
        <boxGeometry args={[1.6, 0.12, 0.18]} />
      </mesh>
      <pointLight
        position={[1.5, 5.8, 0]}
        intensity={5}
        distance={16}
        decay={2}
        color="#ffd28a"
      />
      <mesh position={[1.5, 5.75, 0]}>
        <boxGeometry args={[0.35, 0.1, 0.28]} />
        <meshStandardMaterial color="#ffe8b0" emissive="#ffd28a" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.5, 0]} material={benchMaterial} castShadow>
        <boxGeometry args={[1.8, 0.08, 0.5]} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.8, -0.2]} material={benchMaterial} castShadow>
        <boxGeometry args={[1.8, 0.5, 0.08]} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.7, 0.25, 0]} material={benchLegMaterial} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.45]} />
      </mesh>
      <mesh position={[0.7, 0.25, 0]} material={benchLegMaterial} castShadow>
        <boxGeometry args={[0.08, 0.5, 0.45]} />
      </mesh>
    </group>
  );
}

export function City() {
  const city = useMemo(() => generateCity(1337), []);
  const halfSpan = (CITY_SPAN_VAL + 12) / 2;

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={groundMaterial}>
        <planeGeometry args={[halfSpan * 2, halfSpan * 2]} />
      </mesh>

      {/* Roads */}
      {city.roadSegments.map((r, i) => (
        <mesh
          key={`road-${i}`}
          rotation={[-Math.PI / 2, 0, r.rotation]}
          position={r.position}
          receiveShadow
          material={roadMaterial}
        >
          <planeGeometry args={r.size} />
        </mesh>
      ))}

      {/* Lane markings — center dashed lines on roads */}
      {city.roadSegments.map((r, i) => {
        const [w, d] = r.size;
        const isHorizontal = w > d;
        const length = isHorizontal ? w : d;
        const dashCount = Math.floor(length / 6);
        const dashes: { pos: [number, number, number] }[] = [];
        for (let d2 = 0; d2 < dashCount; d2++) {
          const offset = (d2 / (dashCount - 1 || 1) - 0.5) * (length - 2);
          dashes.push({
            pos: isHorizontal ? [r.position[0] + offset, 0.02, r.position[2]] : [r.position[0], 0.02, r.position[2] + offset],
          });
        }
        return (
          <group key={`lanes-${i}`}>
            {dashes.map((d, j) => (
              <mesh
                key={j}
                rotation={[-Math.PI / 2, 0, isHorizontal ? 0 : Math.PI / 2]}
                position={d.pos}
                material={laneMarkingMaterial}
              >
                <planeGeometry args={[2.5, 0.2]} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Crosswalks */}
      {city.crosswalks.map((c, i) => (
        <mesh
          key={`crosswalk-${i}`}
          rotation={[-Math.PI / 2, 0, c.rotation]}
          position={c.position}
          material={crosswalkMaterial}
          receiveShadow
        >
          <planeGeometry args={c.size} />
        </mesh>
      ))}

      {/* Sidewalks with curbs around blocks */}
      {city.blocks.map((b, i) => {
        const cx = (b.minX + b.maxX) / 2;
        const cz = (b.minZ + b.maxZ) / 2;
        const bw = b.maxX - b.minX;
        const bd = b.maxZ - b.minZ;
        return (
          <group key={`sidewalk-${i}`}>
            {/* Sidewalk planes (raised) */}
            <mesh position={[cx, 0.08, b.minZ - 1.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={sidewalkMaterial}>
              <planeGeometry args={[bw + 3, 3]} />
            </mesh>
            <mesh position={[cx, 0.08, b.maxZ + 1.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={sidewalkMaterial}>
              <planeGeometry args={[bw + 3, 3]} />
            </mesh>
            <mesh position={[b.minX - 1.5, 0.08, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={sidewalkMaterial}>
              <planeGeometry args={[3, bd + 3]} />
            </mesh>
            <mesh position={[b.maxX + 1.5, 0.08, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={sidewalkMaterial}>
              <planeGeometry args={[3, bd + 3]} />
            </mesh>
            {/* Curbs — thin raised strips at sidewalk edge */}
            <mesh position={[cx, 0.06, b.minZ - 0.2]} material={curbMaterial} castShadow>
              <boxGeometry args={[bw + 3, 0.12, 0.3]} />
            </mesh>
            <mesh position={[cx, 0.06, b.maxZ + 0.2]} material={curbMaterial} castShadow>
              <boxGeometry args={[bw + 3, 0.12, 0.3]} />
            </mesh>
            <mesh position={[b.minX - 0.2, 0.06, cz]} material={curbMaterial} castShadow>
              <boxGeometry args={[0.3, 0.12, bd + 3]} />
            </mesh>
            <mesh position={[b.maxX + 0.2, 0.06, cz]} material={curbMaterial} castShadow>
              <boxGeometry args={[0.3, 0.12, bd + 3]} />
            </mesh>
          </group>
        );
      })}

      {/* Buildings */}
      {city.buildings.map((b, i) => (
        <Building key={`b-${i}`} b={b} />
      ))}

      {/* Trees */}
      {city.treePositions.map((p, i) => (
        <Tree key={`t-${i}`} position={p} variant={i} />
      ))}

      {/* Streetlights */}
      {city.streetlights.map((s, i) => (
        <Streetlight key={`sl-${i}`} position={s.position} rotation={s.rotation} />
      ))}

      {/* Benches */}
      {city.benches.map((b, i) => (
        <Bench key={`bench-${i}`} position={b.position} rotation={b.rotation} />
      ))}
    </group>
  );
}

const CITY_SPAN_VAL = 5 * (40 + 12);
