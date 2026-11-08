import { DollarSign, Heart, Shield, Utensils, Clock, MousePointerClick, ZoomIn, ZoomOut, Footprints } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PlayerStats, WorldTime } from './types';
import { Minimap } from './Minimap';

interface HUDProps {
  stats: PlayerStats;
  worldTime: WorldTime;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  buildings: { x: number; z: number; w: number; d: number }[];
  npcPositions: { x: number; z: number }[];
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}

function getTimeIcon(hour: number): 'day' | 'night' {
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

function StatBar({ value, max, color, glow }: { value: number; max: number; color: string; glow: string }) {
  return (
    <div className="w-32 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${(value / max) * 100}%`,
          background: color,
          boxShadow: `0 0 8px ${glow}`,
        }}
      />
    </div>
  );
}

export function HUD({ stats, worldTime, playerX, playerZ, playerYaw, buildings, npcPositions }: HUDProps) {
  const isNight = getTimeIcon(worldTime.hour) === 'night';

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Top-right: money + clock panel */}
      <div className="absolute top-5 right-5 flex flex-col items-end gap-2.5">
        {/* Money */}
        <div
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(10,14,20,0.85), rgba(15,22,30,0.8))',
            border: '1px solid rgba(61,220,132,0.25)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: 'rgba(61,220,132,0.15)' }}
          >
            <DollarSign size={16} className="text-green-400" />
          </div>
          <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
            {stats.money.toLocaleString()}
          </span>
        </div>

        {/* Clock */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{
            background: 'rgba(10,14,20,0.75)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Clock size={15} className={isNight ? 'text-indigo-300' : 'text-amber-300'} />
          <span className="text-sm font-semibold text-white tabular-nums tracking-wide">
            {formatTime(worldTime.hour, worldTime.minute)}
          </span>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: isNight ? '#818cf8' : '#fcd34d' }} />
        </div>
      </div>

      {/* Bottom-left: stats panel */}
      <div
        className="absolute bottom-5 left-5 flex flex-col gap-2.5 px-5 py-4 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(10,14,20,0.85), rgba(15,22,30,0.8))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Heart size={15} className="text-red-400 shrink-0" fill="currentColor" />
          <StatBar value={stats.health} max={100} color="#ef4444" glow="rgba(239,68,68,0.5)" />
          <span className="text-xs font-bold text-white/80 tabular-nums w-7 text-right">{stats.health}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Shield size={15} className="text-blue-400 shrink-0" fill="currentColor" />
          <StatBar value={stats.armor} max={100} color="#3b82f6" glow="rgba(59,130,246,0.5)" />
          <span className="text-xs font-bold text-white/80 tabular-nums w-7 text-right">{stats.armor}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Utensils size={15} className="text-orange-400 shrink-0" />
          <StatBar value={stats.hunger} max={100} color="#f97316" glow="rgba(249,115,22,0.5)" />
          <span className="text-xs font-bold text-white/80 tabular-nums w-7 text-right">{stats.hunger}</span>
        </div>
      </div>

      {/* Bottom-right: minimap + zoom hint */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2">
        <Minimap
          playerX={playerX}
          playerZ={playerZ}
          playerYaw={playerYaw}
          buildings={buildings}
          npcPositions={npcPositions}
        />
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium text-white/50"
          style={{
            background: 'rgba(10,14,20,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ZoomIn size={11} />
          <span>Scroll to zoom</span>
          <ZoomOut size={11} />
        </div>
      </div>

      {/* Bottom-center: controls bar */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-2 rounded-2xl"
        style={{
          background: 'rgba(10,14,20,0.7)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <CtrlKey label="WASD" />
        <Divider />
        <CtrlKey label="Shift" icon={<Footprints size={12} />} />
        <Divider />
        <CtrlKey label="Space" />
        <Divider />
        <CtrlKey label="Mouse" />
        <Divider />
        <CtrlKey label="Esc" />
      </div>

      {/* Click-to-play hint */}
      <ClickToPlayHint />
    </div>
  );
}

function CtrlKey({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-1">
      {icon}
      <kbd className="text-[11px] font-bold text-white/80">{label}</kbd>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-white/10" />;
}

function ClickToPlayHint() {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  if (locked) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl animate-pulse"
        style={{
          background: 'rgba(10,14,20,0.8)',
          border: '1px solid rgba(61,220,132,0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <MousePointerClick size={22} className="text-green-400" />
        <span className="text-sm font-semibold text-white tracking-wide">Click to look around</span>
      </div>
    </div>
  );
}
