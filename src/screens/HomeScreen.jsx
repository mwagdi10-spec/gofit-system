import { useMemo, useState, useEffect } from 'react';
import { addDoc, collection, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import BottomNav from '../components/BottomNav';
import { buildReadinessScore } from '../utils/analyticsTransformers';

const CHECKIN_FIELDS = [
  { key: 'sleep', label: 'Sleep', min: 1, max: 10 },
  { key: 'energy', label: 'Energy', min: 1, max: 10 },
  { key: 'soreness', label: 'Soreness', min: 1, max: 10 },
  { key: 'stress', label: 'Stress', min: 1, max: 10 },
];

export default function HomeScreen({
  navigate,
  current,
  user = {},
  activeDay = null,
  identifier = '',
  db,
  appId,
  checkIns = [],
  streak = { current: 0, longest: 0 },
  level = { xp: 0, levelName: 'Rookie', levelNumber: 1, nextName: null, xpToNext: 0, progressPct: 0 },
  logs = [],
}) {
  const [form, setForm] = useState({ sleep: 7, energy: 7, soreness: 3, stress: 3 });
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (!identifier) return;
    const u = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'goals'), where('clientName', '==', identifier)),
      snap => setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => u();
  }, [identifier]);

  // أقرب هدفين للاكتمال (مش المكتملين) لعرضهم في مختصر الهوم
  const topGoals = useMemo(() => {
    return goals
      .map(g => {
        const current = g.type === 'exercise_weight'
          ? Math.max(0, ...logs.filter(l => l.exerciseName === g.exerciseName).map(l => l.maxWeight || 0))
          : (g.currentValue || 0);
        const pct = g.targetValue ? Math.min(100, Math.round((current / g.targetValue) * 100)) : 0;
        return { ...g, current, pct };
      })
      .filter(g => g.pct < 100)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 2);
  }, [goals, logs]);

  const pct = user.weeklyGoal ? (user.weeklyProgress / user.weeklyGoal) * 100 : 0;
  const todayCheckIn = checkIns[0] || null;
  const readiness = useMemo(() => buildReadinessScore({
    checkIn: todayCheckIn || form,
    lastWorkoutDate: null,
    recentLogs: [],
  }), [checkIns, form]);
  const readinessHint = readiness >= 70
    ? 'Good to push today.'
    : readiness >= 45
      ? 'Keep the session controlled.'
      : 'Lower intensity and focus on quality reps.';

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function submitCheckIn() {
    if (!identifier || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'check_ins'), {
        clientName: identifier,
        sleep: Number(form.sleep) || 0,
        energy: Number(form.energy) || 0,
        soreness: Number(form.soreness) || 0,
        stress: Number(form.stress) || 0,
        readiness: buildReadinessScore({ checkIn: form, recentLogs: [] }),
        createdAt: serverTimestamp(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#121a2a] max-w-sm mx-auto px-5 pb-24">
      <div className="pt-14 mb-7 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white leading-tight">
            Welcome,<br />{user.name || 'Client'} 👋
          </h1>
          <p className="text-[#00D4AA] text-lg font-medium mt-3">{user.currentPhase || '—'}</p>
        </div>
        {streak.current > 0 && (
          <div className="shrink-0 flex items-center gap-1 bg-orange-500/15 border border-orange-500/30 rounded-full px-2 py-1 mt-2">
            <span className="text-sm leading-none">🔥</span>
            <span className="text-orange-400 text-xs font-black leading-none">{streak.current}</span>
          </div>
        )}
      </div>

      {/* Goals - أقرب هدفين للاكتمال */}
      {topGoals.length > 0 && (
        <div className="bg-[#1C1C38] rounded-2xl p-5 mb-5 border border-[#2A2A50]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold text-sm">Goals</span>
            <button onClick={() => navigate('Progress')} className="text-blue-400 text-xs font-bold">View all →</button>
          </div>
          <div className="space-y-2.5">
            {topGoals.map(g => (
              <div key={g.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-300 text-xs font-semibold">{g.label}</span>
                  <span className="text-slate-400 text-[10px]">{g.current}/{g.targetValue} {g.unit}</span>
                </div>
                <div className="h-1.5 bg-[#2A2A50] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('Progress')}
        className="w-full text-left bg-[#1C1C38] rounded-2xl p-3 mb-5 border border-[#2A2A50] active:scale-[0.98] transition-all"
      >
        <div className="flex justify-between mb-2">
          <span className="text-white font-semibold text-sm">Weekly Progress</span>
          <span className="text-slate-400 text-sm">{user.weeklyProgress || 0}/{user.weeklyGoal || 4} days</span>
        </div>
        <div className="h-2 bg-[#2A2A90] rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </button>

      <div className="bg-[#1C1C38] rounded-2xl p-3 mb-5 border border-[#2A2A50]">
        <div className="flex justify-between mb-2">
          <span className="text-white font-semibold text-sm">Lvl {level.levelNumber} · {level.levelName}</span>
          <span className="text-slate-400 text-sm">{level.xp} XP</span>
        </div>
        <div className="h-2 bg-[#2A2A90] rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${level.progressPct}%` }} />
        </div>
        {level.nextName && (
          <p className="text-slate-400 text-[10px] mt-1.5">{level.xpToNext} XP to {level.nextName}</p>
        )}
      </div>

      {/* CTA + Calendar link */}
      <div className="flex flex-col gap-2 mb-5">
        <button
          onClick={() => navigate('ActiveWorkout', activeDay || {})}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-2xl py-5 flex items-center justify-center gap-3 text-white font-bold text-lg transition-all"
        >
          Go Ahead! 🏋️‍♂️
        </button>
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-xs">
            {activeDay ? `${activeDay.day} — ${activeDay.type}` : (user.nextWorkout || '—')}
          </p>
          <button onClick={() => navigate('Progress', { tab: 'calendar' })} className="text-blue-400 text-xs font-bold shrink-0">
            View Calendar →
          </button>
        </div>
      </div>

      <div className="bg-[#1C1C38] rounded-2xl p-5 mb-5 border border-[#2A2A50]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-slate-400 text-xs uppercase font-semibold">Readiness</p>
            <p className="text-white text-3xl font-black">{readiness}/100</p>
          </div>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${readiness >= 70 ? 'bg-emerald-500/15 text-emerald-400' : readiness >= 45 ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'}`}>
            {readiness >= 70 ? 'GO' : readiness >= 45 ? 'OK' : 'LOW'}
          </div>
        </div>
        <div className={`mt-3 rounded-2xl p-3 text-xs font-black ${readiness >= 70 ? 'bg-emerald-500/10 text-emerald-300' : readiness >= 45 ? 'bg-amber-500/10 text-amber-300' : 'bg-red-500/10 text-red-300'}`}>
          {readinessHint}
        </div>
      </div>

      {user.coachNotes && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-5">
          <p className="text-emerald-300 text-xs uppercase font-black mb-2">Coach Update</p>
          <p className="text-white text-sm font-semibold leading-relaxed whitespace-pre-line">{user.coachNotes}</p>
        </div>
      )}

      <div className="bg-[#1C1C38] rounded-2xl p-5 mb-5 border border-[#2A2A50] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold text-sm">Daily Check-in</span>
          <span className="text-slate-400 text-xs">1 minute</span>
        </div>
        <div className="bg-[#14142B] border border-[#2A2A50] rounded-2xl p-4 space-y-2.5">
          {CHECKIN_FIELDS.map(field => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-slate-400 text-[10px] uppercase">{field.label}</span>
                <span className="text-blue-400 text-sm font-black">{form[field.key]}/10</span>
              </div>
              <input
                type="range"
                min={field.min}
                max={field.max}
                value={form[field.key]}
                onChange={e => set(field.key, e.target.value)}
                className="w-full"
              />
            </div>
          ))}
        </div>
        <button
          onClick={submitCheckIn}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-2xl py-4 text-white font-bold transition-all"
        >
          {saving ? 'Saving...' : 'Send Check-in'}
        </button>
      </div>

      {checkIns.length > 0 && (
        <div className="mb-5 bg-[#1C1C38] rounded-2xl p-5 border border-[#2A2A50]">
          <p className="text-white font-semibold text-sm mb-3">Latest Check-in</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Sleep {checkIns[0].sleep}/10, Energy {checkIns[0].energy}/10, Soreness {checkIns[0].soreness}/10, Stress {checkIns[0].stress}/10
          </p>
        </div>
      )}

      <BottomNav navigate={navigate} current={current} />
    </div>
  );
}
