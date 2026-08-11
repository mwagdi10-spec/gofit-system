import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';
import BottomNav from '../components/BottomNav';
import MuscleBodyMap from '../components/shared/MuscleBodyMap';
import WorkoutCalendar from '../components/shared/WorkoutCalendar';
import GoalsCard from '../components/shared/GoalsCard';

const LIST_PAGE_SIZE = 6;

function fmtDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function ProgressScreen({ navigate, current, user = {}, muscleProgress = [], weeklyLoad = [], identifier = '', recoveryMap = [], initialTab = '' }) {
  const [expandedMuscle, setExpandedMuscle] = useState(null);
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [tab, setTab] = useState(initialTab || 'progress'); // 'progress' | 'calendar' | 'history' | 'records'
  const [historyLogs, setHistoryLogs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recordSearch, setRecordSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [recordsExpanded, setRecordsExpanded] = useState(false);

  // سجل كامل بدون حد 30 يوم (منفصل عن logs المستخدمة في باقي الشاشات)
  useEffect(() => {
    if (!identifier) return;
    const u = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'),
        where('clientName', '==', identifier),
        orderBy('completedAt', 'desc')
      ),
      snap => { setHistoryLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setHistoryLoading(false); }
    );
    return () => u();
  }, [identifier]);

  useEffect(() => {
    if (!identifier) return;
    const u = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'goals'),
        where('clientName', '==', identifier)
      ),
      snap => setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => u();
  }, [identifier]);

  const maxByExercise = useMemo(() => {
    const map = {};
    historyLogs.forEach(l => {
      const m = Math.max(map[l.exerciseName] || 0, l.maxWeight || 0);
      map[l.exerciseName] = m;
    });
    return map;
  }, [historyLogs]);

  // آخر تسجيل فقط لكل تمرين (historyLogs مرتبة desc أصلاً)
  const latestByExercise = useMemo(() => {
    const seen = new Set();
    return historyLogs.filter(l => {
      if (seen.has(l.exerciseName)) return false;
      seen.add(l.exerciseName);
      return true;
    });
  }, [historyLogs]);

  // أعلى وزن تاريخي لكل تمرين + تاريخ تحقيقه (بدون Firestore إضافي)
  const personalRecords = useMemo(() => {
    const map = {};
    historyLogs.forEach(l => {
      const w = l.maxWeight || 0;
      if (w <= 0) return;
      const cur = map[l.exerciseName] || { name: l.exerciseName, weight: 0, date: l.completedAt, est1RM: 0 };
      // Epley 1RM = weight × (1 + reps/30) - أعلى تقدير عبر كل الـ sets المسجلة للتمرين
      const bestEst = (l.setsData || []).reduce(
        (max, s) => Math.max(max, Math.round((s.weight || 0) * (1 + (s.reps || 0) / 30))), 0
      );
      map[l.exerciseName] = {
        name: l.exerciseName,
        weight: w > cur.weight ? w : cur.weight,
        date:   w > cur.weight ? l.completedAt : cur.date,
        est1RM: Math.max(cur.est1RM, bestEst),
      };
    });
    // rank حسب الوزن (للميدالية 🥇🥈🥉) قبل ما نرتب العرض أبجدي
    const byWeight = Object.values(map).sort((a, b) => b.weight - a.weight);
    byWeight.forEach((r, i) => { r.rank = i; });
    return byWeight.sort((a, b) => a.name.localeCompare(b.name));
  }, [historyLogs]);

  const filteredRecords = useMemo(() => {
    const q = recordSearch.trim().toLowerCase();
    if (!q) return personalRecords;
    return personalRecords.filter(r => r.name.toLowerCase().includes(q));
  }, [personalRecords, recordSearch]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return latestByExercise;
    return latestByExercise.filter(l => l.exerciseName.toLowerCase().includes(q));
  }, [latestByExercise, historySearch]);

  // بحث نشط = يعرض كل النتائج المطابقة بدون تقليم؛ غير كده يعرض 6 بس مع زرار More
  const visibleHistory = (historySearch.trim() || historyExpanded)
    ? filteredHistory
    : filteredHistory.slice(0, LIST_PAGE_SIZE);
  const visibleRecords = (recordSearch.trim() || recordsExpanded)
    ? filteredRecords
    : filteredRecords.slice(0, LIST_PAGE_SIZE);

  const commitPct = user.weeklyGoal
    ? Math.round((user.weeklyProgress / user.weeklyGoal) * 100)
    : 0;
  const volGrowth = weeklyLoad.length >= 2
    ? Math.round(((weeklyLoad.at(-1).load - weeklyLoad[0].load) / (weeklyLoad[0].load || 1)) * 100)
    : 0;
  const totalVolume     = useMemo(() => historyLogs.reduce((sum, l) => sum + (Number(l.volume) || 0), 0), [historyLogs]);
  const thisWeekVolume  = weeklyLoad.at(-1)?.load || 0;

  // أقوى/أضعف عضلة حسب % النمو في muscleProgress
  const muscleRanked = useMemo(() => {
    return muscleProgress
      .map(m => ({
        name: m.name,
        pct: m.start_weight ? Math.round(((m.current_weight - m.start_weight) / m.start_weight) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [muscleProgress]);
  const strongestMuscle = muscleRanked[0] || null;
  const weakestMuscle   = muscleRanked.length > 1 ? muscleRanked.at(-1) : null;

  return (
    <div className="min-h-screen bg-[#0D0D1A] max-w-sm mx-auto pb-24">

      <div className="px-5 py-5 border-b border-[#2A2A50]">
        <h1 className="text-white text-2xl font-black">Progress</h1>
      </div>

      {/* Segmented control */}
      <div className="px-4 pt-4">
        <div className="flex bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-1">
          <button
            onClick={() => setTab('progress')}
            className={`flex-1 text-[11px] font-black py-2.5 rounded-xl transition-colors
              ${tab === 'progress' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
          >
            My Progress
          </button>
          <button
            onClick={() => setTab('calendar')}
            className={`flex-1 text-[11px] font-black py-2.5 rounded-xl transition-colors
              ${tab === 'calendar' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
          >
            Calendar
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 text-[11px] font-black py-2.5 rounded-xl transition-colors
              ${tab === 'history' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
          >
            History
          </button>
          <button
            onClick={() => setTab('records')}
            className={`flex-1 text-[11px] font-black py-2.5 rounded-xl transition-colors
              ${tab === 'records' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
          >
            Records
          </button>
        </div>
      </div>

      {tab === 'progress' && (
        <div className="px-4 pt-4 space-y-4">

          {/* Muscle Balance Body Map */}
          {recoveryMap.length > 0 && <MuscleBodyMap recoveryMap={recoveryMap} />}

          {/* Goals */}
          <GoalsCard goals={goals} historyLogs={historyLogs} />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: `${commitPct}%`,             lbl: 'Commitment'   },
              { val: volGrowth >= 0 ? `+${volGrowth}%` : `${volGrowth}%`, lbl: 'Volume Growth' },
              { val: totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume, lbl: 'Total Volume (kg)' },
              { val: thisWeekVolume >= 1000 ? `${(thisWeekVolume / 1000).toFixed(1)}k` : thisWeekVolume, lbl: 'This Week (kg)' },
            ].map(s => (
              <div key={s.lbl} className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-4 text-center">
                <p className="text-blue-400 text-3xl font-black">{s.val}</p>
                <p className="text-slate-400 text-xs mt-1">{s.lbl}</p>
              </div>
            ))}
          </div>

          {/* Strongest / Weakest Muscle */}
          {(strongestMuscle || weakestMuscle) && (
            <div className="grid grid-cols-2 gap-3">
              {strongestMuscle && (
                <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-4">
                  <p className="text-slate-400 text-[10px] mb-1">💪 Strongest</p>
                  <p className="text-white text-sm font-black">{strongestMuscle.name}</p>
                  <p className="text-green-400 text-xs font-bold mt-0.5">{strongestMuscle.pct >= 0 ? '+' : ''}{strongestMuscle.pct}%</p>
                </div>
              )}
              {weakestMuscle && (
                <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-4">
                  <p className="text-slate-400 text-[10px] mb-1">🎯 Needs Focus</p>
                  <p className="text-white text-sm font-black">{weakestMuscle.name}</p>
                  <p className="text-red-400 text-xs font-bold mt-0.5">{weakestMuscle.pct >= 0 ? '+' : ''}{weakestMuscle.pct}%</p>
                </div>
              )}
            </div>
          )}

          {/* Muscle Strength Progression */}
          {muscleProgress.length > 0 ? (
            <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl overflow-hidden">
              <button
                onClick={() => setProgressionOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 pt-5 pb-3 text-left"
              >
                <span className="text-white font-bold">Strength Progression</span>
                <span className="text-slate-400 text-xs">{progressionOpen ? '▲' : '▾'}</span>
              </button>
              {progressionOpen && muscleProgress.map((m, i) => {
                const ceil    = (m.current_weight || 1) * 1.25;
                const startW  = `${((m.start_weight   || 0) / ceil) * 100}%`;
                const curW    = `${((m.current_weight || 0) / ceil) * 100}%`;
                const pct     = m.start_weight
                  ? Math.round(((m.current_weight - m.start_weight) / m.start_weight) * 100)
                  : 0;
                const isOpen  = expandedMuscle === m.name;
                return (
                  <div key={m.name} className="border-t border-[#2A2A50]">
                    <button
                      onClick={() => setExpandedMuscle(isOpen ? null : m.name)}
                      className="w-full px-5 py-3 text-left"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white text-sm font-semibold">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pct >= 0 ? '+' : ''}{pct}%
                          </span>
                          <span className="text-slate-400 text-xs">{isOpen ? '▲' : '▾'}</span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-[#2A2A50] rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"     style={{ width: curW   }} />
                        <div className="absolute inset-y-0 left-0 bg-slate-400/50 rounded-full" style={{ width: startW }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-400 text-[10px]">{m.start_weight}kg start</span>
                        <span className="text-blue-400 text-[10px] font-semibold">{m.current_weight}kg now</span>
                      </div>
                    </button>

                    {isOpen && m.monthlyData?.some(d => d.load > 0) && (
                      <div className="px-3 pb-4 bg-[#14142B]">
                        <ResponsiveContainer width="100%" height={130}>
                          <LineChart data={m.monthlyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                            <XAxis dataKey="week" tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor:'#1C1C38', border:'1px solid #2A2A50', borderRadius:8, fontSize:11 }}
                              labelStyle={{ color:'#94A3B8' }}
                              itemStyle={{ color:'#4F8EF7' }}
                              formatter={v => [`${v} kg`, m.name]}
                            />
                            <Line type="monotone" dataKey="load" stroke="#4F8EF7" strokeWidth={2} dot={{ fill:'#4F8EF7', r:3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm font-semibold">Log workouts to track progress</p>
            </div>
          )}

        </div>
      )}

      {tab === 'calendar' && (
        <div className="px-4 pt-4">
          <WorkoutCalendar logs={historyLogs} />
        </div>
      )}

      {tab === 'history' && (
        <div className="px-3 pt-4 space-y-2">
          <input
            type="text"
            placeholder="Search exercise..."
            value={historySearch}
            onChange={e => setHistorySearch(e.target.value)}
            className="w-full bg-[#1C1C38] border border-[#2A2A50] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 mb-1"
          />

          {historyLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-semibold">Loading...</div>
          )}

          {!historyLoading && !filteredHistory.length && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-semibold">
              {historySearch ? 'No matching exercises' : 'No logged workouts yet'}
            </div>
          )}

          {visibleHistory.map(entry => {
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

          {!historySearch.trim() && !historyExpanded && filteredHistory.length > LIST_PAGE_SIZE && (
            <button
              onClick={() => setHistoryExpanded(true)}
              className="w-full text-center py-3 text-blue-400 text-sm font-black"
            >
              More ({filteredHistory.length - LIST_PAGE_SIZE})
            </button>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div className="px-4 pt-4 space-y-2">
          <input
            type="text"
            placeholder="Search exercise..."
            value={recordSearch}
            onChange={e => setRecordSearch(e.target.value)}
            className="w-full bg-[#1C1C38] border border-[#2A2A50] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 mb-1"
          />

          {historyLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm font-semibold">Loading...</div>
          )}

          {!historyLoading && !filteredRecords.length && (
            <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm font-semibold">{recordSearch ? 'No matching exercises' : 'No personal records yet'}</p>
            </div>
          )}

          {visibleRecords.map(r => (
            <div key={r.name} className="flex items-center justify-between bg-[#1C1C38] border border-[#2A2A50] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{r.rank === 0 ? '🥇' : r.rank === 1 ? '🥈' : r.rank === 2 ? '🥉' : '🏆'}</span>
                <div>
                  <p className="text-white text-sm font-bold">{r.name}</p>
                  <p className="text-slate-400 text-[10px]">{fmtDate(r.date)}{r.est1RM > 0 ? ` · Est. 1RM ${r.est1RM}kg` : ''}</p>
                </div>
              </div>
              <p className="text-blue-400 text-lg font-black">{r.weight}kg</p>
            </div>
          ))}

          {!recordSearch.trim() && !recordsExpanded && filteredRecords.length > LIST_PAGE_SIZE && (
            <button
              onClick={() => setRecordsExpanded(true)}
              className="w-full text-center py-3 text-blue-400 text-sm font-black"
            >
              More ({filteredRecords.length - LIST_PAGE_SIZE})
            </button>
          )}
        </div>
      )}

      <BottomNav navigate={navigate} current={current} />
    </div>
  );
}
