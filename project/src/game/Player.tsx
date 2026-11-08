import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildingsToColliders, generateCity, isBlocked } from './city';

interface PlayerProps {
  paused: boolean;
  savedPosition: React.MutableRefObject<[number, number, number]>;
  onPositionChange: (pos: [number, number, number]) => void;
  onYawChange: (yaw: number) => void;
}

const MOVE_SPEED = 5.5;
const RUN_SPEED = 12;
const JUMP_FORCE = 7.5;
const GRAVITY = 22;
const PLAYER_RADIUS = 0.55;

// Camera tuning
const CAM_MIN_DIST = 4.2;
const CAM_MAX_DIST = 15;
const CAM_DEFAULT_DIST = 9;
const CAM_HEIGHT_OFFSET = 2.6;
const CAM_LERP = 6;
const CAM_PITCH_MIN = -0.18;
const CAM_PITCH_MAX = 0.95;
const RAY_ORIGIN_HEIGHT = 1.6;

// Reusable temp objects to avoid GC pressure
const _camTarget = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();

export function Player({ paused, savedPosition, onPositionChange, onYawChange }: PlayerProps) {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const onGround = useRef(true);
  const yaw = useRef(0); // player facing
  const camYaw = useRef(0); // camera orbit angle
  const camPitch = useRef(0.32);
  const camDist = useRef(CAM_DEFAULT_DIST);
  const actualCamDist = useRef(CAM_DEFAULT_DIST);
  const keys = useRef<Record<string, boolean>>({});
  const pointerLocked = useRef(false);
  const [initialized, setInitialized] = useState(false);
  const reportTimer = useRef(0);

  const colliders = useRef(buildingsToColliders(generateCity(1337).buildings));

  // Animation refs
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const animPhase = useRef(0);
  const lastSpeed = useRef(0);

  // Input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (paused || !pointerLocked.current) return;
      camDist.current = THREE.MathUtils.clamp(
        camDist.current + e.deltaY * 0.01,
        CAM_MIN_DIST,
        CAM_MAX_DIST,
      );
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('wheel', onWheel);
    };
  }, [paused]);

  // Pointer lock for mouse camera
  useEffect(() => {
    const canvas = gl.domElement;

    const onClick = () => {
      if (!paused && !pointerLocked.current) {
        canvas.requestPointerLock?.();
      }
    };
    const onPointerLockChange = () => {
      pointerLocked.current = document.pointerLockElement === canvas;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!pointerLocked.current || paused) return;
      camYaw.current -= e.movementX * 0.0022;
      camPitch.current = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch.current + e.movementY * 0.0018));
    };

    canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);

    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [gl, paused]);

  // Initialize position
  useEffect(() => {
    if (group.current && !initialized) {
      const [x, y, z] = savedPosition.current;
      group.current.position.set(x, y, z);
      // Set initial camera position behind player
      const sx = Math.sin(camYaw.current) * Math.cos(camPitch.current);
      const sy = Math.sin(camPitch.current);
      const sz = Math.cos(camYaw.current) * Math.cos(camPitch.current);
      camera.position.set(
        x + sx * camDist.current,
        y + sy * camDist.current + CAM_HEIGHT_OFFSET,
        z + sz * camDist.current,
      );
      setInitialized(true);
    }
  }, [savedPosition, initialized, camera]);

  // Clear keys when paused
  useEffect(() => {
    if (paused) keys.current = {};
  }, [paused]);

  // Shared raycaster for camera collision
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useFrame((_, delta) => {
    if (!group.current || paused || !initialized) return;
    const dt = Math.min(delta, 0.05);

    const k = keys.current;
    const running = k['ShiftLeft'] || k['ShiftRight'];
    const speed = running ? RUN_SPEED : MOVE_SPEED;

    // Camera-relative direction
    const forward = new THREE.Vector3(Math.sin(camYaw.current), 0, Math.cos(camYaw.current)).multiplyScalar(-1);
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    let moveX = 0;
    let moveZ = 0;
    if (k['KeyW'] || k['ArrowUp']) moveZ += 1;
    if (k['KeyS'] || k['ArrowDown']) moveZ -= 1;
    if (k['KeyA'] || k['ArrowLeft']) moveX -= 1;
    if (k['KeyD'] || k['ArrowRight']) moveX += 1;

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, moveZ);
    moveDir.addScaledVector(right, moveX);
    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) {
      moveDir.normalize().multiplyScalar(speed);
      yaw.current = Math.atan2(moveDir.x, moveDir.z);
    }

    velocity.current.x = moveDir.x;
    velocity.current.z = moveDir.z;
    velocity.current.y -= GRAVITY * dt;

    // Jump
    if (k['Space'] && onGround.current) {
      velocity.current.y = JUMP_FORCE;
      onGround.current = false;
    }

    // Apply movement with collision
    const nextX = group.current.position.x + velocity.current.x * dt;
    const nextZ = group.current.position.z + velocity.current.z * dt;
    const nextY = group.current.position.y + velocity.current.y * dt;

    // X collision
    if (!isBlocked(colliders.current, nextX, group.current.position.z, PLAYER_RADIUS)) {
      group.current.position.x = nextX;
    } else {
      velocity.current.x = 0;
    }
    // Z collision
    if (!isBlocked(colliders.current, group.current.position.x, nextZ, PLAYER_RADIUS)) {
      group.current.position.z = nextZ;
    } else {
      velocity.current.z = 0;
    }
    // Y (ground)
    if (nextY <= 0) {
      group.current.position.y = 0;
      velocity.current.y = 0;
      onGround.current = true;
    } else {
      group.current.position.y = nextY;
    }

    // Rotate player model to face movement direction
    const targetYaw = yaw.current;
    const currentEuler = group.current.rotation;
    let diff = targetYaw - currentEuler.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentEuler.y += diff * Math.min(1, dt * 12);

    // ---- Camera with collision (raycast from player to desired position) ----
    const playerPos = group.current.position;

    // Camera target = player position + height offset (look at upper body/head)
    _camTarget.set(playerPos.x, playerPos.y + CAM_HEIGHT_OFFSET, playerPos.z);

    // Desired camera position behind & above based on orbit angles + zoom distance
    const cosP = Math.cos(camPitch.current);
    _desiredPos.set(
      playerPos.x + Math.sin(camYaw.current) * cosP * camDist.current,
      playerPos.y + RAY_ORIGIN_HEIGHT + Math.sin(camPitch.current) * camDist.current,
      playerPos.z + Math.cos(camYaw.current) * cosP * camDist.current,
    );

    // Raycast from player to desired camera pos to detect building obstruction
    _rayOrigin.set(playerPos.x, playerPos.y + RAY_ORIGIN_HEIGHT, playerPos.z);
    _rayDir.subVectors(_desiredPos, _rayOrigin);
    const fullDist = _rayDir.length();
    _rayDir.normalize();

    raycaster.set(_rayOrigin, _rayDir);
    raycaster.far = fullDist + 0.3;

    // Test against building meshes in scene — we use the collider boxes for speed
    // Convert colliders to a quick AABB intersection test along the ray
    let hitDist = fullDist;
    const tmpBox = new THREE.Box3();
    const tmpVec = new THREE.Vector3();
    for (const box of colliders.current) {
      // Expand box slightly to account for camera width
      tmpBox.min.set(box.min.x - 0.3, box.min.y, box.min.z - 0.3);
      tmpBox.max.set(box.max.x + 0.3, box.max.y, box.max.z + 0.3);
      const ray = raycaster.ray;
      const result = ray.intersectBox(tmpBox, tmpVec);
      if (result) {
        const d = _rayOrigin.distanceTo(tmpVec);
        if (d < hitDist) hitDist = d;
      }
    }

    // Pull camera in to just before the obstruction
    const targetActualDist = Math.max(CAM_MIN_DIST * 0.55, hitDist - 0.65);
    // Smooth actual distance
    actualCamDist.current += (targetActualDist - actualCamDist.current) * Math.min(1, dt * 10);

    // Final camera position using actual (collision-adjusted) distance
    const finalDist = actualCamDist.current;
    const fCosP = Math.cos(camPitch.current);
    camera.position.set(
      playerPos.x + Math.sin(camYaw.current) * fCosP * finalDist,
      playerPos.y + RAY_ORIGIN_HEIGHT + Math.sin(camPitch.current) * finalDist,
      playerPos.z + Math.cos(camYaw.current) * fCosP * finalDist,
    );

    camera.lookAt(_camTarget);

    // ---- Character animation ----
    const horizontalSpeed = Math.sqrt(velocity.current.x ** 2 + velocity.current.z ** 2);
    lastSpeed.current += (horizontalSpeed - lastSpeed.current) * Math.min(1, dt * 10);
    const animSpeed = lastSpeed.current;

    if (animSpeed > 0.5 && onGround.current) {
      const strideFreq = animSpeed > 8 ? 11 : 7;
      animPhase.current += dt * strideFreq;
      const swing = Math.sin(animPhase.current) * (animSpeed > 8 ? 0.7 : 0.45);
      if (leftLeg.current) leftLeg.current.rotation.x = swing;
      if (rightLeg.current) rightLeg.current.rotation.x = -swing;
      if (leftArm.current) leftArm.current.rotation.x = -swing * 0.8;
      if (rightArm.current) rightArm.current.rotation.x = swing * 0.8;
      // Subtle torso bob
      if (torso.current) torso.current.position.y = Math.abs(Math.sin(animPhase.current)) * 0.06;
    } else {
      // Ease back to rest
      const rest = Math.min(1, dt * 6);
      if (leftLeg.current) leftLeg.current.rotation.x *= 1 - rest;
      if (rightLeg.current) rightLeg.current.rotation.x *= 1 - rest;
      if (leftArm.current) leftArm.current.rotation.x *= 1 - rest;
      if (rightArm.current) rightArm.current.rotation.x *= 1 - rest;
      if (torso.current) torso.current.position.y *= 1 - rest;
    }

    // Report position + yaw for HUD/minimap
    reportTimer.current += dt;
    if (reportTimer.current > 0.15) {
      reportTimer.current = 0;
      onPositionChange([group.current.position.x, group.current.position.y, group.current.position.z]);
      onYawChange(currentEuler.y);
    }
  });

  return (
    <group ref={group}>
      {/* Character root — slightly raised so feet touch ground */}
      <group ref={torso} position={[0, 0, 0]}>
        {/* Torso */}
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.7, 0.32]} />
          <meshStandardMaterial color="#1a6fc4" roughness={0.55} metalness={0.05} />
        </mesh>
        {/* Premium jacket panels and zipper detail */}
        <mesh position={[0, 1.25, 0.17]} castShadow>
          <boxGeometry args={[0.4, 0.35, 0.03]} />
          <meshStandardMaterial color="#155a9c" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.12, 0.188]} castShadow>
          <boxGeometry args={[0.018, 0.48, 0.012]} />
          <meshStandardMaterial color="#b9c7d6" metalness={0.65} roughness={0.3} />
        </mesh>
        <mesh position={[0.19, 1.34, 0.19]} castShadow>
          <boxGeometry args={[0.06, 0.12, 0.025]} />
          <meshStandardMaterial color="#e4edf5" roughness={0.6} />
        </mesh>
        {/* Shirt collar */}
        <mesh position={[0, 1.46, 0.08]} castShadow>
          <boxGeometry args={[0.18, 0.08, 0.18]} />
          <meshStandardMaterial color="#e8edf2" roughness={0.75} />
        </mesh>
        {/* Hips */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <boxGeometry args={[0.5, 0.22, 0.3]} />
          <meshStandardMaterial color="#1f2937" roughness={0.7} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 1.51, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.095, 0.16, 12]} />
          <meshStandardMaterial color="#c9956d" roughness={0.68} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.68, 0]} castShadow>
          <sphereGeometry args={[0.22, 20, 20]} />
          <meshStandardMaterial color="#e0b48a" roughness={0.65} />
        </mesh>
        {/* Face details, oriented toward the character's forward (+Z) side */}
        <mesh position={[-0.075, 1.70, 0.196]} castShadow>
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshStandardMaterial color="#25252a" roughness={0.45} />
        </mesh>
        <mesh position={[0.075, 1.70, 0.196]} castShadow>
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshStandardMaterial color="#25252a" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.64, 0.215]} castShadow>
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshStandardMaterial color="#c9956d" roughness={0.65} />
        </mesh>
        <mesh position={[0, 1.615, 0.205]} castShadow>
          <boxGeometry args={[0.075, 0.012, 0.012]} />
          <meshStandardMaterial color="#704638" roughness={0.75} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 1.76, -0.02]} castShadow>
          <sphereGeometry args={[0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#2a1e14" roughness={0.9} />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArm} position={[0.34, 1.4, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
            <meshStandardMaterial color="#1a6fc4" roughness={0.55} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.62, 0]} castShadow>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#e0b48a" roughness={0.65} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArm} position={[-0.34, 1.4, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
            <meshStandardMaterial color="#1a6fc4" roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.62, 0]} castShadow>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#e0b48a" roughness={0.65} />
          </mesh>
        </group>

        {/* Left Leg */}
        <group ref={leftLeg} position={[0.15, 0.62, 0]}>
          <mesh position={[0, -0.31, 0]} castShadow>
            <capsuleGeometry args={[0.12, 0.5, 4, 8]} />
            <meshStandardMaterial color="#1f2937" roughness={0.7} />
          </mesh>
          {/* Modern sneaker with sole */}
          <mesh position={[0, -0.62, 0.05]} castShadow>
            <boxGeometry args={[0.18, 0.12, 0.32]} />
            <meshStandardMaterial color="#0f1219" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.68, 0.05]} castShadow>
            <boxGeometry args={[0.185, 0.025, 0.33]} />
            <meshStandardMaterial color="#d9e0e8" roughness={0.7} />
          </mesh>
        </group>

        {/* Right Leg */}
        <group ref={rightLeg} position={[-0.15, 0.62, 0]}>
          <mesh position={[0, -0.31, 0]} castShadow>
            <capsuleGeometry args={[0.12, 0.5, 4, 8]} />
            <meshStandardMaterial color="#1f2937" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.62, 0.05]} castShadow>
            <boxGeometry args={[0.16, 0.1, 0.3]} />
            <meshStandardMaterial color="#0f1219" roughness={0.8} />
          </mesh>
        </group>

        {/* Ground contact shadow blob — extra visibility guarantee */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <circleGeometry args={[0.45, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.25} />
        </mesh>
      </group>
    </group>
  );
}
