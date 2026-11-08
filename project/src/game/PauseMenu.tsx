import { Resume, Home, DollarSign, Heart, Shield, Utensils } from './PauseIcons';
import { PlayerStats, WorldTime } from './types';

interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
  stats: PlayerStats;
  worldTime: WorldTime;
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}

export function PauseMenu({ onResume, onQuit, stats, worldTime }: PauseMenuProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background: 'rgba(5,8,14,0.85)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex flex-col items-center gap-6 w-80">
        <h2 className="text-5xl font-black text-white tracking-tight">Paused</h2>

        {/* Stats summary */}
        <div
          className="w-full p-5 rounded-xl space-y-3"
          style={{
            background: 'rgba(15,20,28,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400">
              <DollarSign size={18} />
              <span className="font-semibold text-white">Cash</span>
            </div>
            <span className="text-xl font-bold text-green-400 tabular-nums">
              ${stats.money.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <Heart size={18} />
              <span className="font-semibold text-white">Health</span>
            </div>
            <span className="font-bold text-white tabular-nums">{stats.health}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400">
              <Shield size={18} />
              <span className="font-semibold text-white">Armor</span>
            </div>
            <span className="font-bold text-white tabular-nums">{stats.armor}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-400">
              <Utensils size={18} />
              <span className="font-semibold text-white">Hunger</span>
            </div>
            <span className="font-bold text-white tabular-nums">{stats.hunger}%</span>
          </div>
          <div className="h-px bg-white/10 my-1" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Time</span>
            <span className="font-semibold text-white tabular-nums">
              {formatTime(worldTime.hour, worldTime.minute)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-bold text-lg transition-all hover:scale-[1.03] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #3ddc84, #2aa86a)',
              color: '#051a0d',
              boxShadow: '0 8px 30px rgba(61,220,132,0.35)',
            }}
          >
            <Resume size={20} />
            Resume
          </button>
          <button
            onClick={onQuit}
            className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-bold text-lg transition-all hover:scale-[1.03] active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <Home size={20} />
            Quit to Menu
          </button>
        </div>

        <p className="text-xs text-white/30">Progress saved automatically</p>
      </div>
    </div>
  );
}
