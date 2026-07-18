import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';
import BottomNav from '../components/BottomNav';

function fmtDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function WorkoutHistoryScreen({ navigate, goBack, current, identifier = '' }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // سجل كامل، مرتب زمنياً من Firestore
  useEffect(() => {
    if (!identifier) return;
    const u = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'),
        where('clientName', '==', identifier),
        orderBy('completedAt', 'desc')
      ),
      snap => { setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    return () => u();
  }, [identifier]);

  // أقصى وزن historically لكل تمرين → لتحديد PR
  const maxByExercise = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const m = Math.max(map[l.exerciseName] || 0, l.maxWeight || 0);
      map[l.exerciseName] = m;
    });
    return map;
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#121a2a] max-w-sm mx-auto pb-24">

      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#2A2A50]">
        <button onClick={goBack} className="text-white text-2xl leading-none">‹</button>
        <h1 className="text-white text-2xl font-black">Workout History</h1>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-semibold">Loading...</div>
      )}

      {!loading && !logs.length && (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-semibold">No logged workouts yet</div>
      )}

      <div className="px-3 pt-4 space-y-2">
        {logs.map(entry => {
          const exMax = maxByExercise[entry.exerciseName] || 0;
          const isPR  = exMax > 0 && (entry.maxWeight || 0) === exMax;
          return (
            <div key={entry.id} className="rounded-xl bg-white border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-slate-900 text-sm font-black">{entry.exerciseName}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-slate-400 text-[10px] font-bold">{fmtDate(entry.completedAt)}</span>
                  {isPR && (
                    <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-md">🏆 PR</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(entry.setsData || []).map((s, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    {s.weight}kg×{s.reps}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav navigate={navigate} current={current} />
    </div>
  );
}
