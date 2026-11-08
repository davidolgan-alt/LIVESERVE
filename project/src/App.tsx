import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameState } from './game/useGameState';
import { GameScene } from './game/GameScene';
import { HUD } from './game/HUD';
import { MainMenu } from './game/MainMenu';
import { PauseMenu } from './game/PauseMenu';
import { generateCity } from './game/city';

function hasSave(): boolean {
  try {
    return localStorage.getItem('lifeverse_save') !== null;
  } catch {
    return false;
  }
}

export default function App() {
  const game = useGameState();
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 8]);
  const [playerYaw, setPlayerYaw] = useState(0);
  const [saveExists, setSaveExists] = useState(false);
  const timeAccumulator = useRef(0);

  // Building data for minimap (static, generated once)
  const buildings = useRef(
    generateCity(1337).buildings.map((b) => ({
      x: b.position[0],
      z: b.position[2],
      w: b.size[0],
      d: b.size[2],
    })),
  );

  // NPC positions for minimap — derived from player position area
  // Since NPCs move, we'll generate approximate scattered positions for the minimap
  const npcMinimapPositions = useRef<{ x: number; z: number }[]>([]);
  if (npcMinimapPositions.current.length === 0) {
    const rand = mulberry32(77);
    const arr: { x: number; z: number }[] = [];
    for (let i = 0; i < 50; i++) {
      arr.push({ x: (rand() - 0.5) * 260, z: (rand() - 0.5) * 260 });
    }
    npcMinimapPositions.current = arr;
  }

  useEffect(() => {
    setSaveExists(hasSave());
  }, [game.phase]);

  // Esc to pause/resume
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (game.phase === 'playing') game.pauseGame();
        else if (game.phase === 'paused') game.resumeGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game]);

  // Exit pointer lock when pausing
  useEffect(() => {
    if (game.phase !== 'playing') {
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }, [game.phase]);

  const handlePositionChange = useCallback((pos: [number, number, number]) => {
    setPlayerPos(pos);
  }, []);

  const handleYawChange = useCallback((yaw: number) => {
    setPlayerYaw(yaw);
  }, []);

  // Advance world time while playing
  useEffect(() => {
    if (game.phase !== 'playing') return;
    let raf: number;
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      timeAccumulator.current += dt;
      if (timeAccumulator.current > 0.5) {
        game.advanceTime(timeAccumulator.current);
        timeAccumulator.current = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game.phase, game]);

  // Save when position changes while playing
  const saveTimer = useRef(0);
  useEffect(() => {
    if (game.phase !== 'playing') return;
    saveTimer.current += 1;
    if (saveTimer.current % 5 === 0) {
      game.save(playerPos);
    }
  }, [playerPos, game]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 3D scene — always mounted while in game or paused to avoid reload */}
      {(game.phase === 'playing' || game.phase === 'paused') && (
        <>
          <GameScene
            paused={game.phase === 'paused'}
            dayProgress={game.worldTime.dayProgress}
            savedPosition={game.savedPosition}
            onPositionChange={handlePositionChange}
            onYawChange={handleYawChange}
          />
          <HUD
            stats={game.stats}
            worldTime={game.worldTime}
            playerX={playerPos[0]}
            playerZ={playerPos[2]}
            playerYaw={playerYaw}
            buildings={buildings.current}
            npcPositions={npcMinimapPositions.current}
          />
        </>
      )}

      {game.phase === 'menu' && (
        <MainMenu onStart={game.startGame} hasSave={saveExists} />
      )}

      {game.phase === 'paused' && (
        <PauseMenu
          onResume={game.resumeGame}
          onQuit={game.quitToMenu}
          stats={game.stats}
          worldTime={game.worldTime}
        />
      )}
    </div>
  );
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
