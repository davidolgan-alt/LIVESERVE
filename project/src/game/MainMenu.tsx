import { Play, Settings, Info } from 'lucide-react';
import { useState } from 'react';

interface MainMenuProps {
  onStart: () => void;
  hasSave: boolean;
}

export function MainMenu({ onStart, hasSave }: MainMenuProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(30,50,90,0.4), rgba(5,8,14,0.92) 70%)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Animated city silhouette backdrop */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),
            linear-gradient(180deg, transparent 60%, #05080e 100%)
          `,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Title */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-1 h-16 rounded-full"
              style={{ background: 'linear-gradient(180deg, #3ddc84, #1a6fc4)' }}
            />
            <h1
              className="text-7xl font-black tracking-tight text-white"
              style={{
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '-0.03em',
                textShadow: '0 4px 30px rgba(61,220,132,0.3)',
              }}
            >
              LIFE<span className="text-green-400">VERSE</span>
            </h1>
            <div
              className="w-1 h-16 rounded-full"
              style={{ background: 'linear-gradient(180deg, #3ddc84, #1a6fc4)' }}
            />
          </div>
          <p className="text-sm tracking-[0.4em] text-white/40 font-medium uppercase">
            Open World Life Simulator
          </p>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col gap-3 w-64 mt-4">
          <MenuButton onClick={onStart} primary>
            <Play size={20} />
            <span>{hasSave ? 'Continue' : 'New Game'}</span>
          </MenuButton>
          <MenuButton onClick={() => setShowInfo(true)}>
            <Info size={20} />
            <span>How to Play</span>
          </MenuButton>
        </div>

        {/* Version + footer */}
        <div className="absolute bottom-6 flex flex-col items-center gap-1">
          <p className="text-xs text-white/30">v1.0 — Browser Prototype</p>
          <p className="text-[10px] text-white/20">Built with React, Three.js & React Three Fiber</p>
        </div>
      </div>

      {showInfo && (
        <InfoModal onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-[1.03] active:scale-95"
      style={
        primary
          ? {
              background: 'linear-gradient(135deg, #3ddc84, #2aa86a)',
              color: '#051a0d',
              boxShadow: '0 8px 30px rgba(61,220,132,0.35)',
            }
          : {
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
            }
      }
    >
      {children}
    </button>
  );
}

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-20"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="max-w-md p-8 rounded-2xl"
        style={{
          background: 'rgba(15,20,28,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">How to Play</h2>
        <div className="space-y-3 text-sm text-white/70">
          <Control keys="W A S D" desc="Move your character around the city" />
          <Control keys="Mouse" desc="Drag/look to orbit the camera" />
          <Control keys="Shift" desc="Hold to sprint" />
          <Control keys="Space" desc="Press to jump" />
          <Control keys="Esc" desc="Pause the game" />
        </div>
        <p className="mt-4 text-xs text-white/40 leading-relaxed">
          You start with $500. Explore the city, walk among pedestrians, and watch the world transition from day to night. Your progress saves automatically.
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-lg font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'rgba(61,220,132,0.2)', border: '1px solid rgba(61,220,132,0.3)' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function Control({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <kbd
        className="px-3 py-1 rounded-md text-xs font-mono font-bold text-white shrink-0"
        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
      >
        {keys}
      </kbd>
      <span className="text-right">{desc}</span>
    </div>
  );
}
