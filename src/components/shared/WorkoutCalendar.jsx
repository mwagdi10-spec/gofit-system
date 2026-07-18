import { useState, useMemo, useRef } from 'react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const LONG_PRESS_MS = 450;

export default function WorkoutCalendar({ logs = [] }) {
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState(null);
  const pressTimer = useRef(null);

  // تجميع الـ logs حسب اليوم
  const dayMap = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const d = l.completedAt?.toDate?.();
      if (!d) return;
      const key = d.toDateString();
      if (!map[key]) map[key] = { date: d, logs: [], totalVolume: 0 };
      map[key].logs.push(l);
      map[key].totalVolume += Number(l.volume) || 0;
    });
    return map;
  }, [logs]);

  // شبكة أيام الشهر المعروض (خلايا فاضية لأول أوفست)
  const monthGrid = useMemo(() => {
    const year = viewDate.getFullYear(), month = viewDate.getMonth();
    const startOffset  = new Date(year, month, 1).getDay();
    const daysInMonth  = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [viewDate]);

  const today = new Date();
  const isToday = d => d && d.toDateString() === today.toDateString();
  const isCurrentMonth = viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();

  function changeMonth(delta) {
    setSelectedDay(null);
    setViewDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return next;
    });
  }

  function startPress(entry) {
    if (!entry) return;
    pressTimer.current = setTimeout(() => setSelectedDay(entry), LONG_PRESS_MS);
  }
  function cancelPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }

  return (
    <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => changeMonth(-1)} className="text-slate-400 text-lg px-3 py-1">‹</button>
        <p className="text-white font-bold text-sm">
          {viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={() => changeMonth(1)}
          disabled={isCurrentMonth}
          className={`text-lg px-3 py-1 ${isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-slate-500 font-bold mb-1">
        {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthGrid.map((d, i) => {
          if (!d) return <div key={i} />;
          const entry = dayMap[d.toDateString()];

          return (
            <button
              key={i}
              onPointerDown={() => startPress(entry)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              className="aspect-square flex items-center justify-center relative select-none"
            >
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold
                  ${entry ? 'bg-emerald-400 text-[#0D0D1A]' : 'text-slate-400'}`}
              >
                {d.getDate()}
              </span>
              {isToday(d) && <span className="absolute inset-0.5 rounded-lg ring-1 ring-blue-500 pointer-events-none" />}
            </button>
          );
        })}
      </div>

      {/* Day summary (ضغط مطول) */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setSelectedDay(null)}>
          <div className="bg-[#1C1C38] border-t border-[#2A2A50] rounded-t-3xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
            <p className="text-white font-black text-base mb-3">
              {selectedDay.date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' })}
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedDay.logs.map((l, i) => (
                <div key={i} className="flex items-center justify-between bg-[#14142B] border border-[#2A2A50] rounded-xl px-3 py-2">
                  <span className="text-white text-xs font-bold truncate">{l.exerciseName}</span>
                  <span className="text-slate-400 text-[10px] font-bold shrink-0 ml-2">
                    {l.category === 'HIIT' ? `${l.roundsCompleted || 0} rounds` : `${l.maxWeight || 0}kg`}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-blue-400 text-xs font-black text-center mt-3">
              Total Volume: {Math.round(selectedDay.totalVolume)}kg
            </p>
            <button
              onClick={() => setSelectedDay(null)}
              className="w-full mt-4 py-3 rounded-xl bg-[#2A2A50] text-white text-xs font-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
