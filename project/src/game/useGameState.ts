import { useCallback, useEffect, useRef, useState } from 'react';
import { GamePhase, INITIAL_STATS, PlayerStats, WorldTime } from './types';

const STORAGE_KEY = 'lifeverse_save';

interface SaveData {
  stats: PlayerStats;
  position: [number, number, number];
  worldTime: WorldTime;
}

function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

function persistSave(data: SaveData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function useGameState() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [worldTime, setWorldTime] = useState<WorldTime>({ hour: 9, minute: 0, dayProgress: 0.375 });
  const savedPosition = useRef<[number, number, number]>([0, 0, 8]);
  const lastSave = useRef<number>(0);

  const startGame = useCallback(() => {
    const save = loadSave();
    if (save) {
      setStats(save.stats);
      setWorldTime(save.worldTime);
      savedPosition.current = save.position;
    } else {
      setStats(INITIAL_STATS);
      setWorldTime({ hour: 9, minute: 0, dayProgress: 0.375 });
      savedPosition.current = [0, 0, 8];
    }
    setPhase('playing');
  }, []);

  const pauseGame = useCallback(() => setPhase('paused'), []);
  const resumeGame = useCallback(() => setPhase('playing'), []);
  const quitToMenu = useCallback(() => setPhase('menu'), []);

  const addMoney = useCallback((amount: number) => {
    setStats((s) => ({ ...s, money: Math.max(0, s.money + amount) }));
  }, []);

  const setHunger = useCallback((h: number) => {
    setStats((s) => ({ ...s, hunger: Math.max(0, Math.min(100, h)) }));
  }, []);

  const setHealth = useCallback((h: number) => {
    setStats((s) => ({ ...s, health: Math.max(0, Math.min(100, h)) }));
  }, []);

  const advanceTime = useCallback((deltaSeconds: number) => {
    // A full day passes in 10 minutes of real time
    const dayLength = 600;
    setWorldTime((t) => {
      const newProgress = (t.dayProgress + deltaSeconds / dayLength) % 1;
      const totalMinutes = newProgress * 24 * 60;
      const hour = Math.floor(totalMinutes / 60) % 24;
      const minute = Math.floor(totalMinutes % 60);
      return { hour, minute, dayProgress: newProgress };
    });
  }, []);

  const save = useCallback(
    (position: [number, number, number]) => {
      const now = performance.now();
      if (now - lastSave.current < 3000) return;
      lastSave.current = now;
      persistSave({ stats, position, worldTime });
    },
    [stats, worldTime],
  );

  // Auto-save on pause
  useEffect(() => {
    if (phase === 'paused') {
      persistSave({ stats, position: savedPosition.current, worldTime });
    }
  }, [phase, stats, worldTime]);

  return {
    phase,
    stats,
    worldTime,
    savedPosition,
    startGame,
    pauseGame,
    resumeGame,
    quitToMenu,
    addMoney,
    setHunger,
    setHealth,
    advanceTime,
    save,
  };
}
