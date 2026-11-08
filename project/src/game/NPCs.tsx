import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isBlocked, buildingsToColliders, generateCity } from './city';

interface NPCData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  pantsColor: THREE.Color;
  changeDirIn: number;
  speed: number;
  walkPhase: number;
}

const NPC_COUNT = 35;
const CITY_LIMIT = 130;

const shirtColors = ['#c4541a', '#4a8a3a', '#8a3a6a', '#3a5a8a', '#8a6a3a', '#5a3a8a', '#3a8a7a', '#7a7a3a', '#2a6a9a', '#9a4a2a'];
const pantsColors = ['#1f2937', '#2a3340', '#3a3025', '#252530', '#2a2520'];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function NPCs() {
  const group = useRef<THREE.Group>(null);
  const colliders = useRef(buildingsToColliders(generateCity(1337).buildings));

  const npcs = useMemo<NPCData[]>(() => {
    const rand = mulberry32(99);
    const list: NPCData[] = [];
    for (let i = 0; i < NPC_COUNT; i++) {
      const angle = rand() * Math.PI * 2;
      const speed = 1.2 + rand() * 1.8;
      list.push({
        position: new THREE.Vector3(
          (rand() - 0.5) * CITY_LIMIT,
          0,
          (rand() - 0.5) * CITY_LIMIT,
        ),
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed),
        color: new THREE.Color(shirtColors[Math.floor(rand() * shirtColors.length)]),
        pantsColor: new THREE.Color(pantsColors[Math.floor(rand() * pantsColors.length)]),
        changeDirIn: 2 + rand() * 6,
        speed,
        walkPhase: rand() * Math.PI * 2,
      });
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    const grp = group.current;
    if (!grp) return;
    const dt = Math.min(delta, 0.05);

    npcs.forEach((npc, i) => {
      npc.changeDirIn -= dt;
      if (npc.changeDirIn <= 0) {
        const angle = Math.random() * Math.PI * 2;
        npc.velocity.set(Math.cos(angle) * npc.speed, 0, Math.sin(angle) * npc.speed);
        npc.changeDirIn = 3 + Math.random() * 7;
      }

      const nextX = npc.position.x + npc.velocity.x * dt;
      const nextZ = npc.position.z + npc.velocity.z * dt;

      // Try X
      if (!isBlocked(colliders.current, nextX, npc.position.z, 0.5)) {
        npc.position.x = nextX;
      } else {
        npc.velocity.x *= -1;
        npc.changeDirIn = 0.5;
      }
      // Try Z
      if (!isBlocked(colliders.current, npc.position.x, nextZ, 0.5)) {
        npc.position.z = nextZ;
      } else {
        npc.velocity.z *= -1;
        npc.changeDirIn = 0.5;
      }

      // Keep in bounds
      const limit = CITY_LIMIT;
      if (Math.abs(npc.position.x) > limit || Math.abs(npc.position.z) > limit) {
        const angle = Math.atan2(-npc.position.z, -npc.position.x);
        npc.velocity.set(Math.cos(angle) * npc.speed, 0, Math.sin(angle) * npc.speed);
        npc.position.x = THREE.MathUtils.clamp(npc.position.x, -limit, limit);
        npc.position.z = THREE.MathUtils.clamp(npc.position.z, -limit, limit);
      }

      const child = grp.children[i] as THREE.Group | undefined;
      if (child) {
        child.position.copy(npc.position);
        if (npc.velocity.lengthSq() > 0.01) {
          child.rotation.y = Math.atan2(npc.velocity.x, npc.velocity.z);
        }

        // Walking animation — swing legs
        const speed = npc.velocity.length();
        if (speed > 0.1) {
          npc.walkPhase += dt * speed * 3.5;
          const swing = Math.sin(npc.walkPhase) * 0.35;
          const leftLeg = child.children[2] as THREE.Mesh | undefined;
          const rightLeg = child.children[3] as THREE.Mesh | undefined;
          if (leftLeg) leftLeg.rotation.x = swing;
          if (rightLeg) rightLeg.rotation.x = -swing;
        }
      }
    });
  });

  return (
    <group ref={group}>
      {npcs.map((npc, i) => (
        <group key={i}>
          {/* Torso */}
          <mesh position={[0, 1.05, 0]} castShadow>
            <boxGeometry args={[0.42, 0.55, 0.25]} />
            <meshStandardMaterial color={npc.color} roughness={0.7} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshStandardMaterial color="#d4a070" roughness={0.7} />
          </mesh>
          {/* Left leg (index 2) */}
          <mesh position={[0.1, 0.5, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.4, 3, 6]} />
            <meshStandardMaterial color={npc.pantsColor} roughness={0.8} />
          </mesh>
          {/* Right leg (index 3) */}
          <mesh position={[-0.1, 0.5, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.4, 3, 6]} />
            <meshStandardMaterial color={npc.pantsColor} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
