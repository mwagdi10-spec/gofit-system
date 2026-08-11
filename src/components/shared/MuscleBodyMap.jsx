import { useState } from 'react';

const STATUS_COLOR = { green: '#34D399', yellow: '#FBBF24', red: '#F87171' };
const STATUS_LABEL = { green: 'Ready to train', yellow: 'Recovering', red: 'Recently trained' };

// إحداثيات المناطق فوق سلويت الجسم الجديد (viewBox 0 0 200 420)
const ZONES = {
  'Chest':      { cx: 100, cy: 112, rx: 26, ry: 15 },
  'Back':       { cx: 100, cy: 85,  rx: 30, ry: 9  },
  'Biceps':     { cx: 58,  cy: 110, rx: 11, ry: 28 },
  'Triceps':    { cx: 142, cy: 110, rx: 11, ry: 28 },
  'Upper Legs': { cx: 100, cy: 250, rx: 36, ry: 50 },
  'Lower Legs': { cx: 100, cy: 340, rx: 30, ry: 42 },
};

export default function MuscleBodyMap({ recoveryMap = [] }) {
  const [selected, setSelected] = useState(null);
  const active = recoveryMap.find(m => m.name === selected) || null;

  function fmtLast(d) {
    if (!d) return 'Never trained';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  return (
    <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-3">
      <p className="text-white font-bold mb-2">Muscle Balance</p>

      <div className="flex items-center justify-center">
        <svg viewBox="0 0 200 420" className="w-44 h-[21rem]">
          <defs>
            <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#282856" />
              <stop offset="100%" stopColor="#1E1E42" />
            </linearGradient>
            <filter id="zoneGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* سلويت الجسم - كبسولات ناعمة ومتصلة */}
          <g fill="url(#bodyFill)" stroke="#3A3A66" strokeWidth="1.5" strokeLinejoin="round">
            <circle cx="100" cy="34" r="19" />
            <path d="M90 50 L90 63 Q100 69 110 63 L110 50 Z" />
            <path d="M68 66 Q100 57 132 66 L138 120 Q136 166 122 197 L78 197 Q64 166 62 120 Z" />
            <rect x="44" y="70"  width="28" height="92" rx="14" transform="rotate(5 58 116)" />
            <rect x="128" y="70" width="28" height="92" rx="14" transform="rotate(-5 142 116)" />
            <rect x="64"  y="196" width="32" height="112" rx="16" />
            <rect x="104" y="196" width="32" height="112" rx="16" />
            <rect x="68"  y="298" width="24" height="90" rx="12" />
            <rect x="108" y="298" width="24" height="90" rx="12" />
          </g>

          {/* مناطق العضلات القابلة للضغط */}
          {recoveryMap.map(m => {
            const z = ZONES[m.name];
            if (!z) return null;
            const isSelected = selected === m.name;
            return (
              <ellipse
                key={m.name}
                cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                fill={STATUS_COLOR[m.status] || '#64748B'}
                fillOpacity={isSelected ? 0.95 : 0.75}
                stroke={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.15)'}
                strokeWidth={isSelected ? 2 : 1}
                filter={isSelected ? 'url(#zoneGlow)' : undefined}
                className="cursor-pointer transition-all duration-150"
                onClick={() => setSelected(isSelected ? null : m.name)}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-[#2A2A50]">
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 bg-[#14142B] rounded-full px-2.5 py-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[key] }} />
            <span className="text-slate-400 text-[9px] font-semibold">{label}</span>
          </div>
        ))}
      </div>

      {/* Detail card عند الضغط */}
      {active && (
        <div className="mt-2 bg-[#14142B] border border-[#2A2A50] rounded-xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[active.status] }} />
            <div>
              <p className="text-white text-sm font-bold">{active.name}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">{STATUS_LABEL[active.status]} · {fmtLast(active.lastTrainedAt)}</p>
            </div>
          </div>
          <p className="text-blue-400 text-lg font-black shrink-0">{active.recoveryPct}%</p>
        </div>
      )}
    </div>
  );
}
