import { useMemo } from 'react';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  buildings: { x: number; z: number; w: number; d: number }[];
  npcPositions: { x: number; z: number }[];
}

const VIEW_RANGE = 70;
const SIZE = 170;

export function Minimap({ playerX, playerZ, playerYaw, buildings, npcPositions }: MinimapProps) {
  const scale = SIZE / (VIEW_RANGE * 2);
  const center = SIZE / 2;

  const visibleBuildings = useMemo(
    () =>
      buildings.filter(
        (b) =>
          Math.abs(b.x - playerX) < VIEW_RANGE + b.w / 2 &&
          Math.abs(b.z - playerZ) < VIEW_RANGE + b.d / 2,
      ),
    [buildings, playerX, playerZ],
  );

  const visibleNPCs = useMemo(
    () =>
      npcPositions.filter(
        (n) => Math.abs(n.x - playerX) < VIEW_RANGE && Math.abs(n.z - playerZ) < VIEW_RANGE,
      ),
    [npcPositions, playerX, playerZ],
  );

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          border: '2px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)',
        }}
      />
      {/* Map area */}
      <div
        className="absolute rounded-2xl overflow-hidden"
        style={{
          inset: 2,
          background: '#0a0e14',
        }}
      >
        {/* Road grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(70,75,85,0.35) 2px, transparent 2px), linear-gradient(90deg, rgba(70,75,85,0.35) 2px, transparent 2px)',
            backgroundSize: '27px 27px',
          }}
        />

        {/* Buildings */}
        {visibleBuildings.map((b, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: center + (b.x - playerX) * scale - (b.w * scale) / 2,
              top: center + (b.z - playerZ) * scale - (b.d * scale) / 2,
              width: Math.max(3, b.w * scale),
              height: Math.max(3, b.d * scale),
              background: 'rgba(120,130,150,0.75)',
              borderRadius: 2,
              boxShadow: '0 0 2px rgba(0,0,0,0.5)',
            }}
          />
        ))}

        {/* NPCs */}
        {visibleNPCs.map((n, i) => (
          <div
            key={`npc-${i}`}
            className="absolute rounded-full"
            style={{
              left: center + (n.x - playerX) * scale - 2.5,
              top: center + (n.z - playerZ) * scale - 2.5,
              width: 5,
              height: 5,
              background: '#f0c850',
              boxShadow: '0 0 4px rgba(240,200,80,0.6)',
            }}
          />
        ))}

        {/* Player arrow with glow ring */}
        <div
          className="absolute"
          style={{
            left: center,
            top: center,
            transform: `translate(-50%, -50%) rotate(${playerYaw}rad)`,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '12px solid #3ddc84',
              filter: 'drop-shadow(0 0 4px rgba(61,220,132,0.9))',
            }}
          />
        </div>

        {/* Player position ring */}
        <div
          className="absolute rounded-full"
          style={{
            left: center - 10,
            top: center - 10,
            width: 20,
            height: 20,
            border: '1px solid rgba(61,220,132,0.25)',
          }}
        />

        {/* North indicator */}
        <div
          className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          N
        </div>

        {/* Corner accents */}
        <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 rounded-tl" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 rounded-tr" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 rounded-bl" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 rounded-br" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
      </div>
    </div>
  );
}
