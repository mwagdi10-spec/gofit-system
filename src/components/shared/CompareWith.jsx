import { useState, useMemo } from 'react';

// Volume/sessions لفترتين - نفس منطق buildPeriodComparison عند التريـنر
function buildComparison(periodLogs, prevPeriodLogs) {
  const vol = l => Number(l.volume) || (l.setsData || []).reduce((s, set) => s + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0);
  const dayKey = l => l.completedAt?.toDate?.()?.toISOString().slice(0, 10) || null;
  const currentVolume  = periodLogs.reduce((s, l) => s + vol(l), 0);
  const previousVolume = prevPeriodLogs.reduce((s, l) => s + vol(l), 0);
  const currentDays  = new Set(periodLogs.map(dayKey).filter(Boolean)).size;
  const previousDays = new Set(prevPeriodLogs.map(dayKey).filter(Boolean)).size;
  return {
    volumeDeltaPct: previousVolume ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100) : (currentVolume > 0 ? 100 : 0),
    sessionDelta: currentDays - previousDays,
    currentVolume, previousVolume, currentDays, previousDays,
  };
}

const MODES = [
  { id: 'week',  label: 'This vs Last Week' },
  { id: 'month', label: 'This vs Last Month' },
  { id: 'split', label: 'Before / After' },
];

export default function CompareWith({ logs = [] }) {
  const [mode, setMode] = useState('week');
  const [splitDate, setSplitDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });

  const dateOf = l => l.completedAt?.toDate?.() || null;

  const { current, previous, currentLabel, previousLabel } = useMemo(() => {
    const now = new Date();

    if (mode === 'week') {
      const cutA = new Date(now); cutA.setDate(now.getDate() - 7);
      const cutB = new Date(now); cutB.setDate(now.getDate() - 14);
      return {
        current:  logs.filter(l => { const d = dateOf(l); return d && d >= cutA; }),
        previous: logs.filter(l => { const d = dateOf(l); return d && d >= cutB && d < cutA; }),
        currentLabel: 'This Week', previousLabel: 'Last Week',
      };
    }

    if (mode === 'month') {
      const curM = now.getMonth(), curY = now.getFullYear();
      const prevM = curM === 0 ? 11 : curM - 1;
      const prevY = curM === 0 ? curY - 1 : curY;
      return {
        current:  logs.filter(l => { const d = dateOf(l); return d && d.getMonth() === curM && d.getFullYear() === curY; }),
        previous: logs.filter(l => { const d = dateOf(l); return d && d.getMonth() === prevM && d.getFullYear() === prevY; }),
        currentLabel: 'This Month', previousLabel: 'Last Month',
      };
    }

    // split: قبل/بعد تاريخ معين
    const cut = new Date(splitDate);
    return {
      current:  logs.filter(l => { const d = dateOf(l); return d && d >= cut; }),
      previous: logs.filter(l => { const d = dateOf(l); return d && d < cut; }),
      currentLabel: 'After', previousLabel: 'Before',
    };
  }, [logs, mode, splitDate]);

  const cmp = useMemo(() => buildComparison(current, previous), [current, previous]);

  return (
    <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-5">
      <p className="text-white font-bold mb-3">Compare With</p>

      <div className="flex bg-[#14142B] border border-[#2A2A50] rounded-xl p-1 mb-3">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 text-[10px] font-black py-2 rounded-lg transition-colors
              ${mode === m.id ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'split' && (
        <input
          type="date"
          value={splitDate}
          onChange={e => setSplitDate(e.target.value)}
          className="w-full bg-[#14142B] border border-[#2A2A50] rounded-xl px-3 py-2 text-sm text-white mb-3 outline-none focus:border-blue-500"
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#14142B] border border-[#2A2A50] rounded-xl p-3 text-center">
          <p className={`text-2xl font-black ${cmp.volumeDeltaPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {cmp.volumeDeltaPct >= 0 ? '+' : ''}{cmp.volumeDeltaPct}%
          </p>
          <p className="text-slate-400 text-[10px] mt-1">Volume change</p>
        </div>
        <div className="bg-[#14142B] border border-[#2A2A50] rounded-xl p-3 text-center">
          <p className={`text-2xl font-black ${cmp.sessionDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {cmp.sessionDelta >= 0 ? '+' : ''}{cmp.sessionDelta}
          </p>
          <p className="text-slate-400 text-[10px] mt-1">Sessions change</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400">
        <span>{previousLabel}: {Math.round(cmp.previousVolume)}kg · {cmp.previousDays}d</span>
        <span>{currentLabel}: {Math.round(cmp.currentVolume)}kg · {cmp.currentDays}d</span>
      </div>
    </div>
  );
}
