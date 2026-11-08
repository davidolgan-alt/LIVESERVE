export type GamePhase = 'menu' | 'playing' | 'paused';

export interface PlayerStats {
  money: number;
  health: number;
  armor: number;
  hunger: number;
}

export interface WorldTime {
  hour: number;
  minute: number;
  dayProgress: number; // 0-1 over a full day cycle
}

export const INITIAL_STATS: PlayerStats = {
  money: 500,
  health: 100,
  armor: 0,
  hunger: 100,
};
