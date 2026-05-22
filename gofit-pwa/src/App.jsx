import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore, collection, onSnapshot, addDoc, serverTimestamp,
  doc, query, orderBy, deleteDoc, updateDoc, setDoc, getDoc, where
} from 'firebase/firestore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useOfflineSync } from './useOfflineSync';
import {
  cacheClientWorkouts,
  getCachedWorkouts,
  cacheLogs,
  getCachedLogs,
  savePendingLog,
} from './offlineDB';

// ─── NASM OPT Model (Correct) ──────────────────────────────────────────────────
const NASM_OPT_PHASES = {
  1: {
    phase: "Stabilization Endurance",
    level: "Phase 1",
    description: "Foundation & Stability",
    duration: "4 weeks",
    reps: "12-20",
    intensity: "50-70%",
    rest: "0-90 seconds",
    focus: "Core stability & control",
    order: 1
  },
  2: {
    phase: "Strength Endurance",
    level: "Phase 2",
    description: "Build Muscular Endurance",
    duration: "4-6 weeks",
    reps: "8-12",
    intensity: "70-80%",
    rest: "60-90 seconds",
    focus: "Building muscular endurance",
    order: 2
  },
  3: {
    phase: "Muscle Development",
    level: "Phase 3",
    description: "Muscle Growth & Hypertrophy",
    duration: "6 weeks",
    reps: "6-12",
    intensity: "75-85%",
    rest: "60-90 seconds",
    focus: "Muscle size development",
    order: 3
  },
  4: {
    phase: "Strength",
    level: "Phase 4",
    description: "Maximum Strength",
    duration: "4-6 weeks",
    reps: "1-6",
    intensity: "85-100%",
    rest: "2-3 minutes",
    focus: "Maximum strength",
    order: 4
  },
  5: {
    phase: "Power",
    level: "Phase 5",
    description: "Explosive Power",
    duration: "3-6 weeks",
    reps: "3-5",
    intensity: "75-90%",
    rest: "2-3 minutes",
    focus: "Explosive power & athletic performance",
    order: 5
  }
};

const PHASE_PROGRESSION = {
  Beginner: [1, 2, 3, 4, 5],
  Intermediate: [2, 3, 4, 5, 1],
  Advanced: [3, 4, 5, 1, 2]
};

const PHASE_COLORS = {
  1: '#10b981',
  2: '#3b82f6',
  3: '#f59e0b',
  4: '#ef4444',
  5: '#8b5cf6'
};

// ─── Firebase ────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCcjp3dDhgt15x7ttHD3UplfP20e57CpFU",
  authDomain: "gofit-9ed5f.firebaseapp.com",
  projectId: "gofit-9ed5f",
  storageBucket: "gofit-9ed5f.firebasestorage.app",
  messagingSenderId: "30376573246",
  appId: "1:30376573246:web:cda9649cae1e8d020d546f"
};
const app          = initializeApp(firebaseConfig);
const auth         = getAuth(app);
const db           = getFirestore(app);
const APP_ID       = import.meta.env.VITE_GOFIT_APP_ID || "gofit-production";
const CATEGORIES   = ['WARM-UP','ACTIVATION','SKILL','RESISTANCE','CARDIO','COOL-DOWN'];

const WORKOUT_TEMPLATES = {
  'Push/Pull/Legs': [
    { day:'Day 1 - Push', name:'Bench Press', category:'RESISTANCE', sets:'4', reps:'6-10', tempo:'2-0-2', coachNote:'Push strength focus' },
    { day:'Day 1 - Push', name:'Incline Dumbbell Press', category:'RESISTANCE', sets:'3', reps:'8-12', tempo:'2-0-2', coachNote:'' },
    { day:'Day 1 - Push', name:'Shoulder Press', category:'RESISTANCE', sets:'3', reps:'8-10', tempo:'2-0-2', coachNote:'' },
    { day:'Day 1 - Push', name:'Triceps Pushdown', category:'RESISTANCE', sets:'3', reps:'10-15', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Pull', name:'Lat Pulldown', category:'RESISTANCE', sets:'4', reps:'8-12', tempo:'2-1-2', coachNote:'Control the eccentric' },
    { day:'Day 2 - Pull', name:'Seated Cable Row', category:'RESISTANCE', sets:'3', reps:'8-12', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Pull', name:'Face Pull', category:'RESISTANCE', sets:'3', reps:'12-15', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Pull', name:'Dumbbell Curl', category:'RESISTANCE', sets:'3', reps:'10-12', tempo:'2-1-2', coachNote:'' },
    { day:'Day 3 - Legs', name:'Squat', category:'RESISTANCE', sets:'4', reps:'6-10', tempo:'3-1-1', coachNote:'Keep stable depth' },
    { day:'Day 3 - Legs', name:'Romanian Deadlift', category:'RESISTANCE', sets:'3', reps:'8-10', tempo:'3-1-1', coachNote:'' },
    { day:'Day 3 - Legs', name:'Leg Press', category:'RESISTANCE', sets:'3', reps:'10-12', tempo:'2-1-2', coachNote:'' },
    { day:'Day 3 - Legs', name:'Plank', category:'RESISTANCE', sets:'3', reps:'30-45s', tempo:'', coachNote:'' },
  ],
  'Fat Loss': [
    { day:'Day 1 - Full Body', name:'Goblet Squat', category:'RESISTANCE', sets:'3', reps:'12-15', tempo:'2-0-2', coachNote:'Short rests' },
    { day:'Day 1 - Full Body', name:'Push-up', category:'RESISTANCE', sets:'3', reps:'AMRAP', tempo:'2-0-2', coachNote:'' },
    { day:'Day 1 - Full Body', name:'Dumbbell Row', category:'RESISTANCE', sets:'3', reps:'12/side', tempo:'2-1-2', coachNote:'' },
    { day:'Day 1 - Full Body', name:'Bike Intervals', category:'CARDIO', sets:'8', reps:'30s hard / 60s easy', tempo:'', coachNote:'RPE 7-8' },
    { day:'Day 2 - Conditioning', name:'Walking Lunge', category:'RESISTANCE', sets:'3', reps:'12/side', tempo:'2-0-2', coachNote:'' },
    { day:'Day 2 - Conditioning', name:'Cable Row', category:'RESISTANCE', sets:'3', reps:'12-15', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Conditioning', name:'Mountain Climber', category:'CARDIO', sets:'4', reps:'30s', tempo:'', coachNote:'' },
  ],
  Strength: [
    { day:'Day 1 - Upper Strength', name:'Bench Press', category:'RESISTANCE', sets:'5', reps:'3-5', tempo:'2-0-1', coachNote:'Rest 2-3 min' },
    { day:'Day 1 - Upper Strength', name:'Barbell Row', category:'RESISTANCE', sets:'5', reps:'4-6', tempo:'2-1-1', coachNote:'' },
    { day:'Day 1 - Upper Strength', name:'Overhead Press', category:'RESISTANCE', sets:'4', reps:'4-6', tempo:'2-0-1', coachNote:'' },
    { day:'Day 2 - Lower Strength', name:'Squat', category:'RESISTANCE', sets:'5', reps:'3-5', tempo:'3-1-1', coachNote:'Stop before form breakdown' },
    { day:'Day 2 - Lower Strength', name:'Deadlift', category:'RESISTANCE', sets:'4', reps:'3-5', tempo:'2-0-1', coachNote:'' },
    { day:'Day 2 - Lower Strength', name:'Split Squat', category:'RESISTANCE', sets:'3', reps:'6-8/side', tempo:'2-1-1', coachNote:'' },
  ],
  Rehab: [
    { day:'Day 1 - Control', name:'Dead Bug', category:'ACTIVATION', sets:'3', reps:'8/side', tempo:'slow', coachNote:'Pain-free range' },
    { day:'Day 1 - Control', name:'Glute Bridge', category:'ACTIVATION', sets:'3', reps:'12', tempo:'2-2-2', coachNote:'' },
    { day:'Day 1 - Control', name:'Bodyweight Squat', category:'RESISTANCE', sets:'3', reps:'10-12', tempo:'3-1-2', coachNote:'Control before load' },
    { day:'Day 1 - Control', name:'Cable Row', category:'RESISTANCE', sets:'3', reps:'12', tempo:'2-1-2', coachNote:'' },
    { day:'Day 2 - Mobility', name:'Bird Dog', category:'ACTIVATION', sets:'3', reps:'8/side', tempo:'slow', coachNote:'' },
    { day:'Day 2 - Mobility', name:'Step Up', category:'RESISTANCE', sets:'3', reps:'8/side', tempo:'2-1-2', coachNote:'' },
  ],
};

const dateFromLog = log => log.completedAt?.toDate?.() || (log.completedAt ? new Date(log.completedAt) : null);
const formatDateShort = date => date ? date.toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—';
const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dayKey = date => startOfDay(date).toISOString().slice(0,10);

function getClientMetrics(phone, workouts, logs) {
  const clientWorkouts = workouts.filter(w => w.assignedTo === phone);
  const clientLogs = logs.filter(l => l.clientName === phone);
  const datedLogs = clientLogs.map(l => ({...l, _date: dateFromLog(l)})).filter(l => l._date);
  const lastLog = datedLogs.sort((a,b) => b._date - a._date)[0];
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(now.getDate() - 28);
  const recentLogs = datedLogs.filter(l => l._date >= fourWeeksAgo);
  const activeDays = new Set(recentLogs.map(l => startOfDay(l._date).toISOString().slice(0,10))).size;
  const expectedDays = Math.max(1, Math.min(28, Number(clientWorkouts.length ? 12 : 4)));
  const adherence = Math.min(100, Math.round((activeDays / expectedDays) * 100));
  const muscleCounts = {};
  clientLogs.forEach(l => {
    const muscle = getMuscleGroup(l.exerciseName);
    if (muscle) muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
  });
  const topMuscle = Object.entries(muscleCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
  const avgRpeLogs = clientLogs.filter(l => Number(l.rpe));
  const avgRpe = avgRpeLogs.length ? (avgRpeLogs.reduce((a,l)=>a+Number(l.rpe),0)/avgRpeLogs.length).toFixed(1) : '—';
  return {
    assigned: clientWorkouts.length,
    logs: clientLogs.length,
    completed: clientLogs.length,
    prs: clientLogs.filter(l => l.isPR).length,
    avgRpe,
    topMuscle,
    adherence,
    lastDate: lastLog?._date || null,
    daysSinceLast: lastLog?._date ? Math.floor((startOfDay(now)-startOfDay(lastLog._date))/(1000*60*60*24)) : 999,
    muscleCounts,
  };
}

function getCoachRecommendations(client, metrics) {
  const recs = [];
  if (metrics.daysSinceLast >= 7) recs.push('Follow up: no workout logged this week.');
  if (metrics.adherence < 50) recs.push('Reduce plan complexity or add a lighter check-in session.');
  if (Number(metrics.avgRpe) >= 8.5) recs.push('High average RPE: consider deload or lower volume.');
  if (metrics.assigned > 0 && metrics.completed / metrics.assigned < 0.35) recs.push('Client may need fewer exercises per day.');
  if (client.injuries) recs.push('Review exercise selection against injury notes before progressing load.');
  return recs.length ? recs : ['Plan looks stable. Progress load gradually where form is clean.'];
}

function getOverloadSuggestion(exercise, allLogs, identifier) {
  const history = allLogs
    .filter(l => l.exerciseId === exercise.id && l.clientName === identifier)
    .sort((a,b)=>(dateFromLog(a)||0)-(dateFromLog(b)||0))
    .slice(-3);
  if (history.length < 2) return 'Log 2 sessions to unlock overload guidance.';
  const last = history[history.length - 1];
  const lastMax = Number(last.maxWeight) || Math.max(...(last.setsData?.map(s=>parseFloat(s.weight)||0)||[0]));
  const avgRpe = history.reduce((a,l)=>a+(Number(l.rpe)||7),0)/history.length;
  if (avgRpe <= 7 && lastMax > 0) return `Next target: try ${Math.round((lastMax + 2.5) * 2) / 2}kg if form stays clean.`;
  if (avgRpe >= 9) return 'Hold load or reduce 5-10% next session.';
  return 'Repeat current load and aim for cleaner reps.';
}

// ─── Muscle Group Mapping ─────────────────────────────────────────────────────
const MUSCLE_COLORS = {
  'Chest':        '#ef4444',
  'Upper Back':   '#1d4ed8',
  'Middle Back':  '#3b82f6',
  'Lower Back':   '#93c5fd',
  'Quads':        '#f59e0b',
  'Hamstrings':   '#8b5cf6',
  'Core':         '#10b981',
  'Shoulders':    '#ec4899',
  'Arms':         '#06b6d4',
  'Glutes':       '#f97316',
};

function getMuscleGroup(exerciseName = '') {
  const n = exerciseName.toLowerCase();
  if (/bench|chest|fly|pec|push.?up|dip/i.test(n))                                          return 'Chest';
  // Back - مقسّم لـ 3 مناطق
  if (/upper back|trap|trapezius|face pull|rear delt|rhomboid|shrug/i.test(n))               return 'Upper Back';
  if (/lat|pulldown|pull.?up|chin.?up|seated row|cable row|t.?bar|chest.*supported/i.test(n))return 'Middle Back';
  if (/lower back|back extension|hyperextension|good morning|deadlift|rdl|romanian/i.test(n))return 'Lower Back';
  if (/row|back/i.test(n))                                                                    return 'Middle Back';
  // Lower Body
  if (/squat|leg press|lunge|quad|leg extension/i.test(n))                                   return 'Quads';
  if (/hamstring|leg curl|nordic/i.test(n))                                                   return 'Hamstrings';
  if (/glute|hip thrust|bridge|kickback/i.test(n))                                           return 'Glutes';
  // Core
  if (/plank|crunch|ab|core|sit.?up|cable crunch|wheel|pallof/i.test(n))                    return 'Core';
  // Upper Body
  if (/shoulder|overhead press|ohp|lateral raise|front raise/i.test(n))                     return 'Shoulders';
  if (/bicep|tricep|curl|pushdown|skullcrusher|hammer/i.test(n))                             return 'Arms';
  return null;
}

// ─── Capitalize ───────────────────────────────────────────────────────────────
function titleCase(str = '') {
  return str.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w/g, c => c.toLowerCase());
}

// ─── Format exercise name ─────────────────────────────────────────────────────
function formatName(raw = '') {
  if (!raw) return '';
  const hasDumbbell = /dumbbell/i.test(raw);
  const hasBarbell  = /barbell/i.test(raw);
  const hasCable    = /cable/i.test(raw);
  const isBW = /push.?up|pull.?up|\bdip\b|plank|crunch|sit.?up|burpee|mountain climber|jumping jack/i.test(raw)
    && !hasDumbbell && !hasBarbell && !/cable|machine/i.test(raw);
  let name = raw.replace(/dumbbell\s*/gi,'').replace(/barbell\s*/gi,'').replace(/\s+/g,' ').trim();
  const cap = titleCase(name);
  if (hasDumbbell) return `${cap} (DB)`;
  if (hasBarbell)  return `${cap} (Barbell)`;
  if (hasCable)    return `${cap} (Cable)`;
  if (isBW)        return `${cap} (BW)`;
  return cap;
}

// ─── Back Button Hook ─────────────────────────────────────────────────────────
function useBackButton(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ modal: true }, '');
    const handler = e => { e.preventDefault(); onClose(); };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [isOpen, onClose]);
}

// ─── GIF Popup ────────────────────────────────────────────────────────────────
function GifPopup({ url, onClose }) {
  useBackButton(!!url, onClose);
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-xs w-full mx-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-3 -left-3 z-10 w-8 h-8 bg-white text-slate-900 rounded-full font-black text-sm shadow-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">✕</button>
        <img src={url} alt="exercise demo" className="w-full rounded-3xl shadow-2xl" />
      </div>
    </div>
  );
}

// ─── Searchable Dropdown ──────────────────────────────────────────────────────
function SearchableDropdown({ options, value, onChange, placeholder = 'Search exercise...', allowNew = false }) {
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const filtered = useMemo(() => options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())), [options, q]);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mouseup', h);
    return () => document.removeEventListener('mouseup', h);
  }, []);
  const selected = options.find(o => o.name === value);
  return (
    <div ref={ref} className="relative w-full">
      <div onClick={() => setOpen(o => !o)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-sm cursor-pointer flex justify-between items-center gap-2 select-none">
        <span className="text-slate-400 text-xs">▾</span>
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>{selected ? formatName(selected.name) : placeholder}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." className="w-full p-2 bg-slate-50 rounded-xl text-sm font-bold outline-none" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && q.length === 0
              ? <div className="p-3 text-center text-slate-400 text-xs font-black">No results</div>
              : filtered.length === 0 && allowNew
              ? <div key="new" onMouseDown={() => { onChange(q); setQ(''); setOpen(false); }} className="p-3 text-left text-sm font-black hover:bg-blue-50 cursor-pointer border-b border-slate-50">
                  ➕ Add new: <span className="text-blue-600">{formatName(q)}</span>
                </div>
              : filtered.map(o => (
                <div key={o.id} onMouseDown={() => { onChange(o.name); setQ(''); setOpen(false); }} className="p-3 text-left text-sm font-black hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0">
                  {formatName(o.name)}
                </div>
              ))
            }
            {allowNew && q.length > 0 && filtered.length > 0 && (
              <div key="new" onMouseDown={() => { onChange(q); setQ(''); setOpen(false); }} className="p-3 text-left text-sm font-black hover:bg-blue-50 cursor-pointer border-t border-slate-50 bg-blue-50">
                ➕ Add new: <span className="text-blue-600">{formatName(q)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Client Selector Dropdown ─────────────────────────────────────────────────
function ClientSelector({ clientNames, value, onChange, placeholder = 'Select Client...' }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mouseup', h);
    return () => document.removeEventListener('mouseup', h);
  }, []);
  const selected = value ? clientNames[value] : null;
  return (
    <div ref={ref} className="relative w-full">
      <div onClick={() => setOpen(o => !o)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-sm cursor-pointer flex justify-between items-center gap-2 select-none">
        <span className="text-slate-400 text-xs">▾</span>
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>{selected ? titleCase(selected.name) : placeholder}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {Object.entries(clientNames).map(([phone, client]) => (
            <div key={phone} onMouseDown={() => { onChange(phone); setOpen(false); }} className="p-3 text-left text-sm font-black hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 text-slate-900">
              {titleCase(client.name)} {client.phone && <span className="text-xs text-slate-500">({client.phone})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WeeklyHeatmap Component
// ═══════════════════════════════════════════════════════════════════════════════
function WeeklyHeatmap({ logs, clientPhone }) {
  const heatmapData = useMemo(() => {
    const clientLogs = logs.filter(l => l.clientName === clientPhone);
    // Build last 10 weeks (70 days)
    const today = new Date();
    const days = [];
    for (let i = 69; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toLocaleDateString('en-US');
      const count = clientLogs.filter(l => {
        const ld = l.completedAt?.toDate?.();
        return ld && ld.toLocaleDateString('en-US') === key;
      }).length;
      days.push({ date: d, count, key });
    }
    return days;
  }, [logs, clientPhone]);

  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      w.push(heatmapData.slice(i, i + 7));
    }
    return w;
  }, [heatmapData]);

  const getColor = (count) => {
    if (count === 0) return 'bg-slate-100';
    if (count <= 1) return 'bg-emerald-200';
    if (count <= 3) return 'bg-emerald-400';
    return 'bg-emerald-600';
  };

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="rounded-2xl border-2 border-slate-100 bg-white p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-black text-slate-900 uppercase">Activity — Last 10 Weeks</h4>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-black text-slate-400">Less</span>
          {['bg-slate-100','bg-emerald-200','bg-emerald-400','bg-emerald-600'].map(c => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span className="text-[9px] font-black text-slate-400">More</span>
        </div>
      </div>
      {/* Day labels */}
      <div className="flex gap-1 mb-1 ml-0">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="w-6 text-center text-[9px] font-black text-slate-400">{d}</div>
        ))}
      </div>
      {/* Grid: rows = weeks, cols = days */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${day.count} log${day.count !== 1 ? 's' : ''}`}
                className={`w-6 h-6 rounded-sm transition-all ${getColor(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ExercisePerformance Component
// ═══════════════════════════════════════════════════════════════════════════════
function ExercisePerformance({ logs, clientPhone }) {
  const performanceData = useMemo(() => {
    const clientLogs = logs.filter(l => l.clientName === clientPhone && l.exerciseName);

    // Group by exercise
    const byExercise = {};
    clientLogs.forEach(log => {
      const name = log.exerciseName;
      if (!byExercise[name]) byExercise[name] = [];
      byExercise[name].push(log);
    });

    // Build performance stats per exercise
    return Object.entries(byExercise)
      .map(([name, entries]) => {
        const sorted = entries.sort((a, b) =>
          (a.completedAt?.toDate?.() || 0) - (b.completedAt?.toDate?.() || 0)
        );
        const weights = entries.flatMap(e => e.setsData?.map(s => parseFloat(s.weight) || 0) || []);
        const maxWeight = weights.length ? Math.max(...weights) : 0;
        const totalSets = entries.reduce((a, e) => a + (e.setsData?.length || 0), 0);
        const sessions = entries.length;
        const prs = entries.filter(e => e.isPR).length;
        const avgRpe = (() => {
          const r = entries.filter(e => Number(e.rpe));
          return r.length ? (r.reduce((a, e) => a + Number(e.rpe), 0) / r.length).toFixed(1) : '—';
        })();

        // Trend: compare first half vs second half avg weight
        const mid = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, mid).flatMap(e => e.setsData?.map(s => parseFloat(s.weight) || 0) || []);
        const secondHalf = sorted.slice(mid).flatMap(e => e.setsData?.map(s => parseFloat(s.weight) || 0) || []);
        const avg1 = firstHalf.length ? firstHalf.reduce((a, v) => a + v, 0) / firstHalf.length : 0;
        const avg2 = secondHalf.length ? secondHalf.reduce((a, v) => a + v, 0) / secondHalf.length : 0;
        const trend = avg2 > avg1 + 0.5 ? 'up' : avg2 < avg1 - 0.5 ? 'down' : 'flat';

        return { name, maxWeight, totalSets, sessions, prs, avgRpe, trend };
      })
      .filter(e => e.sessions >= 1)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);
  }, [logs, clientPhone]);

  if (performanceData.length === 0) return (
    <div className="rounded-2xl border-2 border-slate-100 bg-white p-4">
      <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Exercise Performance</h4>
      <p className="text-xs font-black text-slate-400 text-center py-4">No exercise data yet</p>
    </div>
  );

  const trendIcon = (t) => t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️';
  const trendColor = (t) => t === 'up' ? 'text-emerald-600' : t === 'down' ? 'text-red-500' : 'text-slate-500';

  return (
    <div className="rounded-2xl border-2 border-slate-100 bg-white p-4">
      <h4 className="text-sm font-black text-slate-900 uppercase mb-3">Exercise Performance</h4>
      <div className="space-y-2">
        {performanceData.map(ex => (
          <div key={ex.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all">
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-slate-900 truncate">{formatName(ex.name)}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-[10px] font-black text-slate-500">{ex.sessions} sessions · {ex.totalSets} sets</span>
                {ex.prs > 0 && <span className="text-[10px] font-black text-yellow-600">🏆 {ex.prs} PR</span>}
                <span className="text-[10px] font-black text-slate-500">RPE {ex.avgRpe}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              {ex.maxWeight > 0 && (
                <p className="font-black text-sm text-emerald-600">{ex.maxWeight}kg</p>
              )}
              <p className={`text-xs font-black ${trendColor(ex.trend)}`}>
                {trendIcon(ex.trend)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ClientProfileViewModal
// ═══════════════════════════════════════════════════════════════════════════════
function ClientProfileViewModal({ client, onClose, db, appId, onToPlan, logs = [], workouts = [] }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(client);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(client);
    setEditMode(false);
  }, [client]);

  const profileStats = useMemo(() => {
    const clientLogs = logs
      .filter(l => l.clientName === client.phone)
      .sort((a,b) => (a.completedAt?.toDate?.() || 0) - (b.completedAt?.toDate?.() || 0));
    const assigned = workouts.filter(w => w.assignedTo === client.phone);
    const lastLog = clientLogs[clientLogs.length - 1];
    const recent = clientLogs.slice(-8).map(log => {
      const date = log.completedAt?.toDate?.();
      const maxWeight = Math.max(...(log.setsData?.map(s => parseFloat(s.weight) || 0) || [0]));
      return {
        date: date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Log',
        maxWeight,
        rpe: Number(log.rpe) || null,
      };
    });
    const rpeLogs = clientLogs.filter(l => Number(l.rpe));
    const avgRpe = rpeLogs.length
      ? (rpeLogs.reduce((sum,l) => sum + Number(l.rpe), 0) / rpeLogs.length).toFixed(1)
      : '—';
    const muscleCounts = {};
    clientLogs.forEach(log => {
      const muscle = getMuscleGroup(log.exerciseName);
      if(muscle) muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
    });
    const muscleEntries = Object.entries(muscleCounts).sort((a,b)=>b[1]-a[1]);
    const overTrained = muscleEntries[0]?.[0] || '—';
    const underTrained = Object.keys(MUSCLE_COLORS).find(m => !muscleCounts[m]) || muscleEntries[muscleEntries.length-1]?.[0] || '—';

    return {
      assignedCount: assigned.length,
      loggedCount: clientLogs.length,
      prCount: clientLogs.filter(l => l.isPR).length,
      avgRpe,
      lastWorkout: lastLog?.completedAt?.toDate?.().toLocaleDateString('en-US') || '—',
      recent,
      overTrained,
      underTrained,
    };
  }, [client.phone, logs, workouts]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db,'artifacts',appId,'public','data','client_names',client.phone),{
        name: formData.name,
        age: formData.age,
        gender: formData.gender,
        height: formData.height,
        goal: formData.goal,
        level: formData.level,
        nasm_phase: formData.nasm_phase,
        daysPerWeek: formData.daysPerWeek,
        injuries: formData.injuries,
        weight: formData.weight || '',
        bodyFat: formData.bodyFat || '',
        measurements: formData.measurements || '',
        progressPhotos: formData.progressPhotos || '',
        coachNotes: formData.coachNotes || '',
      });
      setEditMode(false);
      alert('Updated ✅');
    } catch(e) {
      console.error(e);
      alert('Error updating');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border-2 border-slate-200 rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="bg-slate-900 p-5 flex justify-between items-center">
          <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
          <div className="text-right">
            <span className="text-emerald-400 font-black text-lg block">{titleCase(formData.name)}</span>
            <span className="text-slate-400 font-black text-[10px] uppercase">{client.phone}</span>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {editMode?(
            <>
              <input type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="Name" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
              <input type="number" value={formData.age||''} onChange={e=>setFormData({...formData,age:parseInt(e.target.value)||0})} placeholder="Age" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
              <select value={formData.gender||''} onChange={e=>setFormData({...formData,gender:e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input type="number" value={formData.height||''} onChange={e=>setFormData({...formData,height:parseInt(e.target.value)||0})} placeholder="Height (cm)" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
              <input type="text" value={formData.goal||''} onChange={e=>setFormData({...formData,goal:e.target.value})} placeholder="Goal" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
              <input type="text" value={formData.level||''} onChange={e=>setFormData({...formData,level:e.target.value})} placeholder="Level" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
              
              {/* NASM Phase Selection */}
              <div className="border-l-4 border-emerald-500 pl-3">
                <label className="text-xs font-black text-emerald-600 uppercase mb-2 block">NASM Phase</label>
                <select 
                  value={formData.nasm_phase||1} 
                  onChange={e=>setFormData({...formData,nasm_phase:parseInt(e.target.value)})} 
                  className="w-full p-3 border-2 border-emerald-300 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-emerald-50"
                >
                  {[1,2,3,4,5].map(p => (
                    <option key={p} value={p}>
                      {NASM_OPT_PHASES[p].phase}
                    </option>
                  ))}
                </select>
              </div>

              <input type="number" value={formData.daysPerWeek||''} onChange={e=>setFormData({...formData,daysPerWeek:parseInt(e.target.value)||0})} placeholder="Days/Week" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
              <input type="text" value={formData.injuries||''} onChange={e=>setFormData({...formData,injuries:e.target.value})} placeholder="Injuries" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={formData.weight||''} onChange={e=>setFormData({...formData,weight:e.target.value})} placeholder="Weight (kg)" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
                <input type="number" value={formData.bodyFat||''} onChange={e=>setFormData({...formData,bodyFat:e.target.value})} placeholder="Body Fat %" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
              </div>
              <textarea value={formData.measurements||''} onChange={e=>setFormData({...formData,measurements:e.target.value})} placeholder="Measurements: chest, waist, hips, arms..." rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
              <textarea value={formData.progressPhotos||''} onChange={e=>setFormData({...formData,progressPhotos:e.target.value})} placeholder="Progress photo URLs, one per line" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
              <textarea value={formData.coachNotes||''} onChange={e=>setFormData({...formData,coachNotes:e.target.value})} placeholder="Coach private notes" rows={3} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
            </>
          ):(
            <>
              {/* ── Stats Row ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {label:'Exercises', val:profileStats.assignedCount},
                  {label:'Logs',      val:profileStats.loggedCount},
                  {label:'PRs',       val:profileStats.prCount},
                  {label:'Avg RPE',   val:profileStats.avgRpe},
                ].map(s=>(
                  <div key={s.label} className="p-4 rounded-2xl bg-slate-50 text-center border border-slate-100">
                    <span className="text-2xl font-black text-emerald-500 block">{s.val}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* ── Client Info ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {label:'Age',         val:formData.age?`${formData.age} yrs`:'—'},
                  {label:'Gender',      val:formData.gender||'—'},
                  {label:'Height',      val:formData.height?`${formData.height} cm`:'—'},
                  {label:'Goal',        val:formData.goal||'—'},
                  {label:'Level',       val:formData.level||'—'},
                  {label:'NASM Phase',  val:NASM_OPT_PHASES[formData.nasm_phase||1]?.phase||'—'},
                  {label:'Days/Week',   val:formData.daysPerWeek?`${formData.daysPerWeek} days`:'—'},
                  {label:'Last Workout',val:profileStats.lastWorkout},
                  {label:'Weight',      val:formData.weight?`${formData.weight} kg`:'—'},
                  {label:'Body Fat',    val:formData.bodyFat?`${formData.bodyFat}%`:'—'},
                  {label:'Injuries',    val:formData.injuries||'None'},
                ].map(f=>(
                  <div key={f.label} className="flex justify-between items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-black text-slate-500 uppercase shrink-0">{f.label}</span>
                    <span className="text-sm font-black text-slate-900 text-right">{f.val}</span>
                  </div>
                ))}
              </div>

              {/* ── Recent Progress Chart ── */}
              <div className="rounded-2xl border-2 border-slate-100 bg-white p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-black text-slate-900 uppercase">Recent Progress</h4>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Max kg + RPE</span>
                </div>
                {profileStats.recent.length>0?(
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={profileStats.recent}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}/>
                        <YAxis yAxisId="kg" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false}/>
                        <YAxis yAxisId="rpe" orientation="right" domain={[1,10]} stroke="#f59e0b" fontSize={10} tickLine={false} axisLine={false}/>
                        <Tooltip contentStyle={{borderRadius:'16px',border:'none',boxShadow:'0 10px 25px -5px rgba(0,0,0,0.1)'}}/>
                        <Line yAxisId="kg" type="monotone" dataKey="maxWeight" name="Max kg" stroke="#10b981" strokeWidth={3} dot={{r:4}}/>
                        <Line yAxisId="rpe" type="monotone" dataKey="rpe" name="RPE" stroke="#f59e0b" strokeWidth={3} dot={{r:4}} connectNulls/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ):(
                  <div className="h-32 flex items-center justify-center text-sm font-black text-slate-400">No progress logs yet</div>
                )}
              </div>

              {/* ── Weekly Activity Heatmap ── */}
              <WeeklyHeatmap logs={logs} clientPhone={client.phone} />

              {/* ── Exercise Performance ── */}
              <ExercisePerformance logs={logs} clientPhone={client.phone} />

              {/* ── Measurements + Notes ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">Measurements</h4>
                  <p className="text-sm font-bold text-slate-900 whitespace-pre-line">{formData.measurements || 'No measurements yet'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">Coach Notes</h4>
                  <p className="text-sm font-bold text-slate-900 whitespace-pre-line">{formData.coachNotes || 'No coach notes yet'}</p>
                </div>
              </div>

              {formData.progressPhotos&&(
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3">Progress Photos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {formData.progressPhotos.split(/\n|,/).map(url=>url.trim()).filter(Boolean).slice(0,8).map(url=>(
                      <img key={url} src={url} alt="progress" className="aspect-square w-full object-cover rounded-xl border border-slate-200 bg-white"/>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Coach Recommendations ── */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                <h4 className="text-[10px] font-black text-emerald-700 uppercase mb-2">Coach Recommendations</h4>
                <div className="space-y-2">
                  {getCoachRecommendations(formData, profileStats).map(rec=>(
                    <p key={rec} className="text-sm font-black text-slate-800">• {rec}</p>
                  ))}
                </div>
              </div>

              {/* ── Muscle Balance ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                  <h4 className="text-[10px] font-black text-amber-700 uppercase mb-1">Potential Overload</h4>
                  <p className="text-lg font-black text-slate-900">{profileStats.overTrained}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                  <h4 className="text-[10px] font-black text-blue-700 uppercase mb-1">Needs Attention</h4>
                  <p className="text-lg font-black text-slate-900">{profileStats.underTrained}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 grid grid-cols-3 gap-2">
          {!editMode&&<button onClick={()=>setEditMode(true)} className="col-span-1 bg-slate-900 text-emerald-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">✏️ Edit</button>}
          {editMode&&<button onClick={handleSave} disabled={saving} className="col-span-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all disabled:opacity-40">{saving?'...':'Save'}</button>}
          {editMode&&<button onClick={()=>{setEditMode(false);setFormData(client);}} className="col-span-1 bg-slate-200 text-slate-600 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">Cancel</button>}
          {!editMode&&<button onClick={onToPlan} className="col-span-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">📋 Plan</button>}
          <button onClick={onClose} className={`border-2 border-slate-200 text-slate-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all ${editMode?'col-span-2':'col-span-1'}`}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Edit Exercise Modal
// ═══════════════════════════════════════════════════════════════════════════════
function EditExerciseModal({ exercise, onClose, db, appId }) {
  const [formData, setFormData] = useState({
    name: exercise.name,
    category: exercise.category || 'RESISTANCE',
    sets: exercise.sets || '',
    reps: exercise.reps || '',
    tempo: exercise.tempo || '',
    gifUrl: exercise.gifUrl || '',
    description: exercise.description || '',
    muscleGroup: exercise.muscleGroup || getMuscleGroup(exercise.name) || '',
    equipment: exercise.equipment || '',
    alternatives: exercise.alternatives || '',
    regressions: exercise.regressions || '',
    progressions: exercise.progressions || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db,'artifacts',appId,'public','data','library',exercise.id),{
        name: formData.name,
        category: formData.category,
        sets: formData.sets,
        reps: formData.reps,
        tempo: formData.tempo,
        gifUrl: formData.gifUrl,
        description: formData.description,
        muscleGroup: formData.muscleGroup,
        equipment: formData.equipment,
        alternatives: formData.alternatives,
        regressions: formData.regressions,
        progressions: formData.progressions
      });
      onClose();
      alert('Exercise updated ✅');
    } catch(e) {
      console.error(e);
      alert('Error updating exercise');
    }
    setSaving(false);
  };

  useBackButton(true, onClose);

  return (
    <div className="fixed inset-0 z-[998] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="bg-slate-900 p-5 flex justify-between items-center">
          <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
          <span className="text-emerald-400 font-black text-base">Edit Exercise</span>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="Exercise Name" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          
          <select value={formData.category} onChange={e=>setFormData({...formData,category:e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50">
            <option value="WARM-UP">WARM-UP</option>
            <option value="ACTIVATION">ACTIVATION</option>
            <option value="SKILL">SKILL</option>
            <option value="RESISTANCE">RESISTANCE</option>
            <option value="CARDIO">CARDIO</option>
            <option value="COOL-DOWN">COOL-DOWN</option>
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={formData.sets} onChange={e=>setFormData({...formData,sets:e.target.value})} placeholder="Default Sets" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center"/>
            <input type="text" value={formData.reps} onChange={e=>setFormData({...formData,reps:e.target.value})} placeholder="Default Reps" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center"/>
          </div>

          <input type="text" value={formData.tempo} onChange={e=>setFormData({...formData,tempo:e.target.value})} placeholder="Tempo" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>

          <input type="text" value={formData.gifUrl} onChange={e=>setFormData({...formData,gifUrl:e.target.value})} placeholder="GIF URL" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={formData.muscleGroup} onChange={e=>setFormData({...formData,muscleGroup:e.target.value})} placeholder="Muscle group" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
            <input type="text" value={formData.equipment} onChange={e=>setFormData({...formData,equipment:e.target.value})} placeholder="Equipment" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          </div>
          <textarea value={formData.alternatives} onChange={e=>setFormData({...formData,alternatives:e.target.value})} placeholder="Alternatives if equipment is busy" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
          <textarea value={formData.regressions} onChange={e=>setFormData({...formData,regressions:e.target.value})} placeholder="Regressions" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
          <textarea value={formData.progressions} onChange={e=>setFormData({...formData,progressions:e.target.value})} placeholder="Progressions" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>

          <textarea value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} placeholder="Description/Notes" rows={3} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-sm uppercase active:scale-95 transition-all disabled:opacity-40">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-400 py-3 rounded-2xl font-black text-sm uppercase active:scale-95 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Add Exercise Modal
// ═══════════════════════════════════════════════════════════════════════════════
function AddExerciseModal({ onClose, db, appId }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'RESISTANCE',
    sets: '',
    reps: '',
    tempo: '',
    gifUrl: '',
    description: '',
    muscleGroup: '',
    equipment: '',
    alternatives: '',
    regressions: '',
    progressions: ''
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('Exercise name required');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db,'artifacts',appId,'public','data','library'),{
        name: formData.name,
        category: formData.category || 'RESISTANCE',
        sets: formData.sets || '',
        reps: formData.reps || '',
        tempo: formData.tempo || '',
        gifUrl: formData.gifUrl || '',
        description: formData.description || '',
        muscleGroup: formData.muscleGroup || getMuscleGroup(formData.name) || '',
        equipment: formData.equipment || '',
        alternatives: formData.alternatives || '',
        regressions: formData.regressions || '',
        progressions: formData.progressions || '',
        createdAt: serverTimestamp()
      });
      alert('Exercise added ✅');
      onClose();
    } catch(e) {
      console.error(e);
      alert('Error adding exercise');
    }
    setSaving(false);
  };

  useBackButton(true, onClose);

  return (
    <div className="fixed inset-0 z-[998] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="bg-slate-900 p-5 flex justify-between items-center">
          <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
          <span className="text-emerald-400 font-black text-base">Add Exercise</span>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="Exercise Name *" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          
          <select value={formData.category} onChange={e=>setFormData({...formData,category:e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50">
            <option value="">Select Category</option>
            <option value="WARM-UP">WARM-UP</option>
            <option value="ACTIVATION">ACTIVATION</option>
            <option value="SKILL">SKILL</option>
            <option value="RESISTANCE">RESISTANCE</option>
            <option value="CARDIO">CARDIO</option>
            <option value="COOL-DOWN">COOL-DOWN</option>
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={formData.sets} onChange={e=>setFormData({...formData,sets:e.target.value})} placeholder="Default Sets" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center"/>
            <input type="text" value={formData.reps} onChange={e=>setFormData({...formData,reps:e.target.value})} placeholder="Default Reps" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center"/>
          </div>

          <input type="text" value={formData.tempo} onChange={e=>setFormData({...formData,tempo:e.target.value})} placeholder="Tempo (e.g 2-0-2-0)" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>

          <input type="text" value={formData.gifUrl} onChange={e=>setFormData({...formData,gifUrl:e.target.value})} placeholder="GIF URL (optional)" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={formData.muscleGroup} onChange={e=>setFormData({...formData,muscleGroup:e.target.value})} placeholder="Muscle group" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
            <input type="text" value={formData.equipment} onChange={e=>setFormData({...formData,equipment:e.target.value})} placeholder="Equipment" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          </div>
          <textarea value={formData.alternatives} onChange={e=>setFormData({...formData,alternatives:e.target.value})} placeholder="Alternatives if equipment is busy" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
          <textarea value={formData.regressions} onChange={e=>setFormData({...formData,regressions:e.target.value})} placeholder="Regressions" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
          <textarea value={formData.progressions} onChange={e=>setFormData({...formData,progressions:e.target.value})} placeholder="Progressions" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>

          <textarea value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} placeholder="Description/Notes (optional)" rows={3} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button onClick={handleAdd} disabled={saving} className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-sm uppercase active:scale-95 transition-all disabled:opacity-40">
            {saving ? 'Adding...' : '+ Add Exercise'}
          </button>
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-400 py-3 rounded-2xl font-black text-sm uppercase active:scale-95 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Add New Client Modal
// ═══════════════════════════════════════════════════════════════════════════════
function AddNewClientModal({ onClose, db, appId }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '',
    height: '',
    goal: '',
    level: '',
    nasm_phase: 1,
    daysPerWeek: '',
    injuries: '',
    weight: '',
    bodyFat: '',
    measurements: '',
    progressPhotos: '',
    coachNotes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Name and Phone required');
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db,'artifacts',appId,'public','data','client_names',formData.phone),{
        name: formData.name,
        phone: formData.phone,
        age: formData.age ? parseInt(formData.age) : 0,
        gender: formData.gender || '',
        height: formData.height ? parseInt(formData.height) : 0,
        goal: formData.goal || '',
        level: formData.level || '',
        nasm_phase: formData.nasm_phase || 1,
        daysPerWeek: formData.daysPerWeek ? parseInt(formData.daysPerWeek) : 0,
        injuries: formData.injuries || '',
        weight: formData.weight || '',
        bodyFat: formData.bodyFat || '',
        measurements: formData.measurements || '',
        progressPhotos: formData.progressPhotos || '',
        coachNotes: formData.coachNotes || '',
        archived: false,
        createdAt: serverTimestamp()
      });
      alert('Client added ✅');
      onClose();
    } catch(e) {
      console.error(e);
      alert('Error adding client');
    }
    setSaving(false);
  };

  useBackButton(true, onClose);

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="bg-slate-900 p-5 flex justify-between items-center">
          <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
          <span className="text-emerald-400 font-black text-base">Add New Client</span>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="Name *" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <input type="text" value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})} placeholder="Phone *" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <input type="number" value={formData.age} onChange={e=>setFormData({...formData,age:e.target.value})} placeholder="Age" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <select value={formData.gender} onChange={e=>setFormData({...formData,gender:e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50">
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <input type="number" value={formData.height} onChange={e=>setFormData({...formData,height:e.target.value})} placeholder="Height (cm)" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <input type="text" value={formData.goal} onChange={e=>setFormData({...formData,goal:e.target.value})} placeholder="Goal (e.g Weight Loss)" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <input type="text" value={formData.level} onChange={e=>setFormData({...formData,level:e.target.value})} placeholder="Level (e.g Beginner)" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          
          {/* NASM Phase Selection for New Client */}
          <div className="border-l-4 border-emerald-500 pl-3">
            <label className="text-xs font-black text-emerald-600 uppercase mb-2 block">Initial NASM Phase</label>
            <select 
              value={formData.nasm_phase} 
              onChange={e=>setFormData({...formData,nasm_phase:parseInt(e.target.value)})} 
              className="w-full p-3 border-2 border-emerald-300 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-emerald-50"
            >
              {[1,2,3,4,5].map(p => (
                <option key={p} value={p}>
                  {p}. {NASM_OPT_PHASES[p].phase}
                </option>
              ))}
            </select>
          </div>

          <input type="number" value={formData.daysPerWeek} onChange={e=>setFormData({...formData,daysPerWeek:e.target.value})} placeholder="Days/Week" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <input type="text" value={formData.injuries} onChange={e=>setFormData({...formData,injuries:e.target.value})} placeholder="Injuries/Notes" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={formData.weight} onChange={e=>setFormData({...formData,weight:e.target.value})} placeholder="Weight (kg)" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
            <input type="number" value={formData.bodyFat} onChange={e=>setFormData({...formData,bodyFat:e.target.value})} placeholder="Body Fat %" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          </div>
          <textarea value={formData.measurements} onChange={e=>setFormData({...formData,measurements:e.target.value})} placeholder="Measurements" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
          <textarea value={formData.coachNotes} onChange={e=>setFormData({...formData,coachNotes:e.target.value})} placeholder="Coach notes" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button onClick={handleAdd} disabled={saving} className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-sm uppercase active:scale-95 transition-all disabled:opacity-40">
            {saving ? 'Adding...' : 'Add Client'}
          </button>
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-400 py-3 rounded-2xl font-black text-sm uppercase active:scale-95 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DayTemplateModal
// ═══════════════════════════════════════════════════════════════════════════════
function DayTemplateModal({ onClose, db, appId, libraryData, targetClient, sessionName }) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  useBackButton(true, onClose);
  const filtered = useMemo(() =>
    libraryData.filter(ex => {
      const matchCat = catFilter === 'ALL' || ex.category === catFilter;
      const matchQ   = !search || ex.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchQ;
    }), [libraryData, catFilter, search]);
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const handleAssign = async () => {
    if (!selected.length) return;
    if (!targetClient || !sessionName) { alert('Please select a client and day first'); return; }
    setSaving(true);
    const base = Date.now();
    for (let i = 0; i < selected.length; i++) {
      const ex = libraryData.find(l => l.id === selected[i]);
      if (ex) await addDoc(collection(db,'artifacts',appId,'public','data','workouts'), {
        name: ex.name, category: ex.category, gifUrl: ex.gifUrl||'',
        muscleGroup: ex.muscleGroup || getMuscleGroup(ex.name) || '',
        equipment: ex.equipment || '',
        alternatives: ex.alternatives || '',
        regressions: ex.regressions || '',
        progressions: ex.progressions || '',
        sets:'3', reps:'10', tempo:'', coachNote:'',
        assignedTo: targetClient, day: sessionName, orderIndex: base + i
      });
    }
    onClose();
    alert(`✅ Assigned ${selected.length} exercises`);
  };
  return (
    <div className="fixed inset-0 z-[998] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight:'85vh' }}>
        <div className="bg-slate-900 p-5 flex justify-between items-center shrink-0">
          <button onClick={onClose} className="text-slate-400 font-black text-sm hover:text-white">✕ Cancel</button>
          <span className="text-emerald-400 font-black text-sm uppercase">Assign Full Day ({selected.length})</span>
        </div>
        <div className="p-4 border-b border-slate-100 shrink-0 space-y-2">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..." className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50" />
          <div className="flex flex-wrap gap-1">
            {['ALL',...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${catFilter===cat?'bg-emerald-500 text-white':'bg-slate-100 text-slate-500'}`}>{cat}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map(ex => {
            const isSel = selected.includes(ex.id);
            return (
              <div key={ex.id} onClick={() => toggle(ex.id)} className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${isSel?'border-emerald-500 bg-emerald-50':'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                <div className="text-left">
                  <span className="font-black text-sm text-slate-900 capitalize">{formatName(ex.name)}</span>
                  <p className="text-[10px] font-black text-emerald-500 uppercase">{ex.category}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSel?'bg-emerald-500 border-emerald-500 text-white':'border-slate-300'}`}>
                  {isSel && <span className="text-[10px] font-black">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button onClick={handleAssign} disabled={saving||!selected.length} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40">
            {saving ? 'Assigning...' : `Assign ${selected.length} Exercises ✅`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AnalyticsChart - Collapsible Chart Component
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsChart({ title, color, data, muscles, isRpe = false }) {
  const [open, setOpen] = useState(false);

  const hasData = isRpe ? data.length > 0 : muscles.length > 0;

  return (
    <div className="bg-white border-2 border-slate-200 rounded-[1.75rem] overflow-hidden shadow-sm">
      {/* Header - القابل للضغط */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-black text-sm text-slate-900 uppercase tracking-wide">{title}</span>
          {hasData && (
            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {isRpe ? `${data.length} logs` : `${muscles.length} muscles`}
            </span>
          )}
          {!hasData && (
            <span className="text-[10px] font-black text-slate-400">No data yet</span>
          )}
        </div>
        <span className={`text-slate-400 font-black text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Chart - يظهر فقط لما يكون مفتوح */}
      {open && (
        <div className="px-4 pb-5">
          {!hasData ? (
            <div className="h-20 flex items-center justify-center">
              <p className="text-xs font-black text-slate-400">No data to display</p>
            </div>
          ) : isRpe ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false}/>
                  <YAxis domain={[1,10]} stroke="#f59e0b" fontSize={9} tickLine={false} axisLine={false} width={24}/>
                  <Tooltip contentStyle={{borderRadius:'12px',border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',fontSize:11}}/>
                  <Legend iconSize={8} wrapperStyle={{fontSize:'10px',fontWeight:900}}/>
                  <Line type="monotone" dataKey="rpe" name="RPE" stroke="#f59e0b" strokeWidth={2.5} dot={{r:4,fill:'#f59e0b',strokeWidth:2,stroke:'#fff'}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false}/>
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} unit="kg" width={32}/>
                  <Tooltip
                    contentStyle={{borderRadius:'12px',border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',fontSize:11}}
                    formatter={(v,n) => [`${v}kg`, n]}
                  />
                  <Legend iconSize={8} wrapperStyle={{fontSize:'10px',fontWeight:900}}/>
                  {muscles.map(m => (
                    <Line
                      key={m}
                      type="monotone"
                      dataKey={m}
                      stroke={MUSCLE_COLORS[m] || '#94a3b8'}
                      strokeWidth={2.5}
                      dot={{r:4, fill:MUSCLE_COLORS[m]||'#94a3b8', strokeWidth:2, stroke:'#fff'}}
                      connectNulls
                      activeDot={{r:6}}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TrainerDashboard
// ═══════════════════════════════════════════════════════════════════════════════
function TrainerDashboard({ workouts, logs, db, appId, clientNames }) {
  const [activeTab, setActiveTab]             = useState('overview');
  const [targetClient, setTargetClient]       = useState('');
  const [sessionName, setSessionName]         = useState('');
  const [newEx, setNewEx]                     = useState({name:'',category:'RESISTANCE',sets:'3',reps:'10',tempo:'',coachNote:''});
  const [libraryData, setLibraryData]         = useState([]);
  const [showTemplate, setShowTemplate]       = useState(false);
  const [expandedDate, setExpandedDate]       = useState(null);
  const [analyticsClient, setAnalyticsClient] = useState('');
  const [selectedProfileModal, setSelectedProfileModal] = useState(null);
  const [showAddClient, setShowAddClient]     = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [menuOpen, setMenuOpen]               = useState(false);
  const [showProgramBuilder, setShowProgramBuilder] = useState(false);
  const [clientSearch, setClientSearch]       = useState('');
  const [clientGoalFilter, setClientGoalFilter] = useState('ALL');
  const [clientLevelFilter, setClientLevelFilter] = useState('ALL');
  const [clientSort, setClientSort]           = useState('last');
  const [templateName, setTemplateName]       = useState('Push/Pull/Legs');
  const [copyFromClient, setCopyFromClient]   = useState('');
  const [showArchived, setShowArchived]       = useState(false);

  const bg = 'bg-white border-slate-200';
  const tx = 'text-slate-900';
  const sub = 'text-slate-500';
  const inp = 'bg-slate-50 border-slate-200';
  const rowbg = 'bg-slate-50 border-slate-100';

  // Load library
  useEffect(()=>{
    const u = onSnapshot(collection(db,'artifacts',appId,'public','data','library'), s=>{
      setLibraryData(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    return()=>u();
  },[db,appId]);

  // Client days for session names
  const clientDays = useMemo(()=>{
    if(!targetClient) return [];
    const days = [...new Set(workouts.filter(w=>w.assignedTo===targetClient).map(w=>w.day))].filter(Boolean).sort((a,b)=>{
      const aNum = parseInt(a.split(' ')[1]) || 999;
      const bNum = parseInt(b.split(' ')[1]) || 999;
      return aNum - bNum;
    });
    return days;
  },[workouts,targetClient]);

  // Archive grouped by date
  const archiveGroups = useMemo(()=>{
    if(!analyticsClient) return [];
    const filtered = logs.filter(l=>l.clientName===analyticsClient);
    const grouped = {};
    filtered.forEach(log=>{
      const d = log.completedAt?.toDate?.().toLocaleDateString('en-US')||'Unknown';
      if(!grouped[d]) grouped[d]=[];
      grouped[d].push(log);
    });
    return Object.entries(grouped).sort(([a],[b])=>new Date(b)-new Date(a)).slice(0,10);
  },[logs,analyticsClient]);

  // Muscle chart data
  const muscleChartData = useMemo(()=>{
    if(!analyticsClient) return{data:[],muscles:[]};
    const filtered = logs.filter(l=>l.clientName===analyticsClient);
    const byDate = {};
    filtered.forEach(log=>{
      const d = log.completedAt?.toDate?.().toLocaleDateString('en-US')||'?';
      if(!byDate[d]) byDate[d]={};
      const muscle = getMuscleGroup(log.exerciseName);
      if(!muscle) return;
      const max = Math.max(...(log.setsData?.map(s=>parseFloat(s.weight)||0)||[0]));
      byDate[d][muscle] = Math.max(byDate[d][muscle]||0, max);
    });
    const dates = Object.keys(byDate).sort((a,b)=>new Date(a)-new Date(b)).slice(-7);
    const data = dates.map(d=>({date:d.substring(0,5),...byDate[d]}));
    const muscles = [...new Set(data.flatMap(o=>Object.keys(o).filter(k=>k!=='date')))];
    return{data,muscles};
  },[logs,analyticsClient]);

  const rpeChartData = useMemo(()=>{
    if(!analyticsClient) return [];
    return logs
      .filter(l=>l.clientName===analyticsClient&&Number(l.rpe))
      .sort((a,b)=>(a.completedAt?.toDate?.()||0)-(b.completedAt?.toDate?.()||0))
      .slice(-10)
      .map(l=>({
        date:l.completedAt?.toDate?.().toLocaleDateString('en-US',{month:'short',day:'numeric'})||'Log',
        rpe:Number(l.rpe),
        volume:Number(l.volume)||0,
      }));
  },[logs,analyticsClient]);

  const clientRows = useMemo(()=>{
    return Object.entries(clientNames).map(([phone,client])=>({
      phone,
      client,
      metrics:getClientMetrics(phone, workouts, logs)
    })).filter(row=>{
      if(!showArchived && row.client.archived) return false;
      const q = clientSearch.toLowerCase().trim();
      const matchQ = !q || row.client.name?.toLowerCase().includes(q) || row.phone.includes(q) || row.client.goal?.toLowerCase().includes(q);
      const matchGoal = clientGoalFilter === 'ALL' || (row.client.goal || '').toLowerCase().includes(clientGoalFilter.toLowerCase());
      const matchLevel = clientLevelFilter === 'ALL' || (row.client.level || '').toLowerCase().includes(clientLevelFilter.toLowerCase());
      return matchQ && matchGoal && matchLevel;
    }).sort((a,b)=>{
      if(clientSort === 'name') return (a.client.name||'').localeCompare(b.client.name||'');
      if(clientSort === 'goal') return (a.client.goal||'').localeCompare(b.client.goal||'');
      if(clientSort === 'level') return (a.client.level||'').localeCompare(b.client.level||'');
      if(clientSort === 'adherence') return b.metrics.adherence - a.metrics.adherence;
      return a.metrics.daysSinceLast - b.metrics.daysSinceLast;
    });
  },[clientNames, workouts, logs, clientSearch, clientGoalFilter, clientLevelFilter, clientSort, showArchived]);

  const alertRows = useMemo(() => {
    return Object.entries(clientNames).flatMap(([phone, client]) => {
      if(client.archived) return [];
      const metrics = getClientMetrics(phone, workouts, logs);
      const clientLogs = logs.filter(l => l.clientName === phone);
      const recentPain = clientLogs.find(l => /pain|injury|knee|shoulder|back|ألم|اصابة|إصابة/i.test(`${l.note || ''} ${l.exerciseName || ''}`));
      const alerts = [];
      if(metrics.daysSinceLast >= 7) alerts.push({phone, client, type:'No workout', detail:`${metrics.daysSinceLast === 999 ? 'Never logged' : `${metrics.daysSinceLast} days inactive`}`});
      if(Number(metrics.avgRpe) >= 8.5) alerts.push({phone, client, type:'High RPE', detail:`Average RPE ${metrics.avgRpe}`});
      if(recentPain || client.injuries) alerts.push({phone, client, type:'Injury check', detail: client.injuries || 'Pain mentioned in a log'});
      return alerts;
    }).slice(0, 8);
  }, [clientNames, workouts, logs]);

  const archiveClient = async (phone, archived = true) => {
    await updateDoc(doc(db,'artifacts',appId,'public','data','client_names',phone), { archived });
  };

  const dashboardStats = useMemo(()=>{
    const rows = Object.entries(clientNames).map(([phone])=>getClientMetrics(phone, workouts, logs));
    const adherence = rows.length ? Math.round(rows.reduce((a,m)=>a+m.adherence,0)/rows.length) : 0;
    const topMuscles = {};
    logs.forEach(l => {
      const muscle = getMuscleGroup(l.exerciseName);
      if(muscle) topMuscles[muscle] = (topMuscles[muscle] || 0) + 1;
    });
    return {
      adherence,
      completed: logs.length,
      topMuscle:Object.entries(topMuscles).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—',
      atRisk: rows.filter(m=>m.daysSinceLast>=7 || m.adherence<50).length,
    };
  },[clientNames, workouts, logs]);

  const applyTemplate = async () => {
    if(!targetClient) { alert('Select a client first'); return; }
    const items = WORKOUT_TEMPLATES[templateName] || [];
    const base = Date.now();
    for(let i=0;i<items.length;i++){
      await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
        ...items[i],
        gifUrl:'',
        assignedTo:targetClient,
        orderIndex:base+i,
      });
    }
    alert(`Assigned ${templateName} template ✅`);
  };

  const applySmartProgram = async () => {
    if(!targetClient) { alert('Select a client first'); return; }
    const client = clientNames[targetClient] || {};
    const goal = (client.goal || '').toLowerCase();
    const injuries = (client.injuries || '').toLowerCase();
    let selectedTemplate = 'Push/Pull/Legs';
    if(goal.includes('loss') || goal.includes('fat') || goal.includes('weight')) selectedTemplate = 'Fat Loss';
    if(goal.includes('strength') || (client.nasm_phase || 1) >= 4) selectedTemplate = 'Strength';
    if(injuries || goal.includes('rehab')) selectedTemplate = 'Rehab';
    const phase = client.nasm_phase || 1;
    const items = (WORKOUT_TEMPLATES[selectedTemplate] || []).map(item => ({
      ...item,
      sets: phase >= 4 && item.category === 'RESISTANCE' ? item.sets : item.sets,
      coachNote: [item.coachNote, injuries ? `Injury note: ${client.injuries}` : '', `Auto-generated from ${selectedTemplate}`].filter(Boolean).join(' · ')
    }));
    const base = Date.now();
    for(let i=0;i<items.length;i++){
      await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
        ...items[i],
        gifUrl:'',
        assignedTo:targetClient,
        orderIndex:base+i,
      });
    }
    alert(`Smart program generated: ${selectedTemplate} ✅`);
  };

  const copyProgram = async () => {
    if(!copyFromClient || !targetClient) { alert('Choose source and target clients'); return; }
    if(copyFromClient === targetClient) { alert('Choose two different clients'); return; }
    const source = workouts.filter(w=>w.assignedTo===copyFromClient).sort((a,b)=>a.orderIndex-b.orderIndex);
    if(!source.length) { alert('Source client has no program'); return; }
    const base = Date.now();
    for(let i=0;i<source.length;i++){
      const { id, assignedTo, ...rest } = source[i];
      await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
        ...rest,
        assignedTo:targetClient,
        orderIndex:base+i,
      });
    }
    alert(`Copied ${source.length} exercises ✅`);
  };

  const printProgram = () => {
    if(!targetClient) { alert('Select a client first'); return; }
    window.print();
  };

  const tabButtons = [
    {id:'overview', label:'Overview', icon:'📊'},
    {id:'clients', label:'Clients', icon:'👥'},
    {id:'library', label:'Library', icon:'📚'},
    {id:'plan', label:'Plan', icon:'📋'},
    {id:'analytics', label:'Analytics', icon:'📈'},
    {id:'inbox', label:'Inbox', icon:'📮'}
  ];

  return(
    <div className="space-y-5 font-black pb-20">
      {/* Tabs - Desktop */}
      <div className="hidden md:flex gap-2 border-b-2 border-slate-200 pb-3 overflow-x-auto hide-scrollbar">
        {tabButtons.map(tab=>(
          <button key={tab.id} onClick={()=>{setActiveTab(tab.id);setMenuOpen(false);}} className={`px-6 py-2 rounded-2xl text-sm font-black uppercase shrink-0 transition-all ${activeTab===tab.id?'bg-slate-900 text-emerald-400 scale-105':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden flex gap-2 items-center pb-2">
        <button onClick={()=>setMenuOpen(!menuOpen)} className="bg-slate-900 text-emerald-400 px-4 py-2 rounded-2xl font-black text-sm">☰</button>
        {menuOpen && (
          <div className="absolute top-20 left-4 right-4 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-50">
            {tabButtons.map(tab=>(
              <button key={tab.id} onClick={()=>{setActiveTab(tab.id);setMenuOpen(false);}} className="w-full text-left px-6 py-3 font-black text-sm border-b border-slate-100 last:border-0 hover:bg-emerald-50">
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* OVERVIEW */}
      {activeTab==='overview'&&(
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
            <h3 className={`font-black text-base border-b pb-3 mb-3 ${tx} border-slate-200`}>Clients ({Object.keys(clientNames).length})</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {clientRows.slice(0,8).map(({phone,client,metrics})=>{
                const clientPhase = client.nasm_phase || 1;
                return(
                  <div key={phone} onClick={()=>setSelectedProfileModal({...client,phone})} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 cursor-pointer transition-all hover:shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base shrink-0" style={{backgroundColor: PHASE_COLORS[clientPhase]}}>
                        {clientPhase}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-black text-sm ${tx}`}>{titleCase(client.name)}</p>
                        <p className={`text-[10px] ${sub}`}>{client.phone}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-black ${sub} shrink-0`}>{metrics.daysSinceLast===0?'Today':metrics.daysSinceLast===999?'Never':`${metrics.daysSinceLast}d ago`}</span>
                    </div>
                    <div className="h-1.5 rounded-full w-full bg-slate-100">
                      <div className="h-full rounded-full transition-all" style={{width:`${metrics.adherence}%`, backgroundColor: PHASE_COLORS[clientPhase]}}/>
                    </div>
                    <span className={`text-[9px] font-black ${sub}`}>4-week adherence {metrics.adherence}% · top {metrics.topMuscle}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl space-y-3`}>
            <h3 className={`font-black text-base border-b pb-3 ${tx} border-slate-200`}>Quick Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <p className="font-black text-3xl text-emerald-500">{Object.keys(clientNames).length}</p>
                <p className={`text-[10px] font-black ${sub} mt-1`}>Total Clients</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <p className="font-black text-3xl text-emerald-500">{workouts.length}</p>
                <p className={`text-[10px] font-black ${sub} mt-1`}>Total Exercises</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <p className="font-black text-3xl text-emerald-500">{logs.length}</p>
                <p className={`text-[10px] font-black ${sub} mt-1`}>Logs Recorded</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <p className="font-black text-3xl text-emerald-500">{logs.filter(l=>l.isPR).length}</p>
                <p className={`text-[10px] font-black ${sub} mt-1`}>PRs Achieved</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <p className="font-black text-3xl text-emerald-500">{dashboardStats.adherence}%</p>
                <p className={`text-[10px] font-black ${sub} mt-1`}>Avg Adherence</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <p className="font-black text-3xl text-emerald-500">{dashboardStats.atRisk}</p>
                <p className={`text-[10px] font-black ${sub} mt-1`}>At Risk</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-center">
              <p className="font-black text-xs uppercase text-slate-400">Most Trained Muscle</p>
              <p className="font-black text-2xl text-emerald-400">{dashboardStats.topMuscle}</p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <div className="flex items-center justify-between mb-2">
                <p className="font-black text-xs uppercase text-amber-700">Coach Alerts</p>
                <span className="text-[10px] font-black text-amber-700">{alertRows.length}</span>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {alertRows.length===0
                  ? <p className="text-xs font-black text-slate-400 text-center py-4">No active alerts</p>
                  : alertRows.map((a,i)=>(
                    <button key={`${a.phone}-${a.type}-${i}`} onClick={()=>setSelectedProfileModal({...a.client,phone:a.phone})} className="w-full text-left bg-white border border-amber-100 rounded-xl p-3 hover:border-amber-300 transition-all">
                      <p className="text-xs font-black text-slate-900">{titleCase(a.client.name)} · {a.type}</p>
                      <p className="text-[10px] font-black text-slate-500">{a.detail}</p>
                    </button>
                  ))
                }
              </div>
            </div>
            <button onClick={()=>setShowAddClient(true)} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">+ Add New Client</button>
          </div>
        </div>
      )}

      {/* CLIENTS */}
      {activeTab==='clients'&&(
        <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
            <div>
              <h3 className={`font-black text-base ${tx}`}>Client List</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase">{clientRows.length} visible clients</p>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setShowArchived(v=>!v)} className={`px-4 py-2 rounded-2xl font-black text-xs uppercase ${showArchived?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-500'}`}>{showArchived?'Hide Archived':'Show Archived'}</button>
              <button onClick={()=>setShowAddClient(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase">+ Add</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Search name, phone, goal..." className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}/>
            <select value={clientGoalFilter} onChange={e=>setClientGoalFilter(e.target.value)} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}>
              <option value="ALL">All Goals</option>
              <option value="Weight Loss">Weight Loss</option>
              <option value="Muscle">Muscle</option>
              <option value="Strength">Strength</option>
              <option value="Fitness">Fitness</option>
            </select>
            <select value={clientLevelFilter} onChange={e=>setClientLevelFilter(e.target.value)} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}>
              <option value="ALL">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <select value={clientSort} onChange={e=>setClientSort(e.target.value)} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}>
              <option value="last">Sort: Last Workout</option>
              <option value="adherence">Sort: Adherence</option>
              <option value="name">Sort: Name</option>
              <option value="goal">Sort: Goal</option>
              <option value="level">Sort: Level</option>
            </select>
          </div>
          <div className="space-y-3">
            {clientRows.map(({phone,client,metrics})=>{
              const clientPhase = client.nasm_phase || 1;
              return (
                <div key={phone} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0" style={{backgroundColor: PHASE_COLORS[clientPhase]}}>{clientPhase}</div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-black text-sm text-slate-900">{titleCase(client.name)}</p>
                      <p className="text-xs text-slate-500 truncate">{client.goal || 'No goal'} · {client.level || NASM_OPT_PHASES[clientPhase]?.phase}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div className="text-center bg-white rounded-xl p-2 border border-slate-100">
                        <p className="text-sm font-black text-emerald-500">{metrics.adherence}%</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Adherence</p>
                      </div>
                      <div className="text-center bg-white rounded-xl p-2 border border-slate-100">
                        <p className="text-sm font-black text-emerald-500">{metrics.completed}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Done</p>
                      </div>
                      <div className="text-center bg-white rounded-xl p-2 border border-slate-100">
                        <p className="text-sm font-black text-emerald-500">{metrics.daysSinceLast===999?'—':`${metrics.daysSinceLast}d`}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Last</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>{setTargetClient(phone);setActiveTab('plan');}} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase hover:border-emerald-300 transition-all">Plan</button>
                      <button onClick={()=>setSelectedProfileModal({...client,phone})} className="bg-slate-900 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-800 transition-all">View</button>
                      <button onClick={()=>archiveClient(phone,!client.archived)} className="bg-amber-50 border-2 border-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-black uppercase hover:border-amber-300 transition-all">{client.archived?'Restore':'Archive'}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedProfileModal&&(
        <ClientProfileViewModal client={selectedProfileModal} logs={logs} workouts={workouts} onClose={()=>setSelectedProfileModal(null)} db={db} appId={appId} onToPlan={()=>{setSelectedProfileModal(null);setTargetClient(selectedProfileModal.phone);setActiveTab('plan');}}/>
      )}

      {/* LIBRARY */}
      {activeTab==='library'&&(
        <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-black text-base ${tx}`}>Exercise Library ({libraryData.length})</h3>
            <button onClick={()=>setShowAddExercise(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase">+ Add Exercise</button>
          </div>
          {libraryData.length===0?(
            <div className="text-center py-12 text-slate-400 font-black">
              <p className="mb-4 text-2xl">📚</p>
              <p>Library is empty</p>
              <p className="text-sm mt-2">Add your first exercise to get started</p>
            </div>
          ):(
            <div className="space-y-3">
              {CATEGORIES.map(cat=>{
                const catExercises = libraryData.filter(ex=>ex.category===cat);
                if(catExercises.length===0) return null;
                return(
                  <div key={cat}>
                    <details className="border-2 border-slate-200 rounded-2xl overflow-hidden">
                      <summary className="p-4 bg-slate-900 text-emerald-400 font-black cursor-pointer hover:bg-slate-800 transition-all flex justify-between items-center select-none">
                        <span className="uppercase">{cat}</span>
                        <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full">{catExercises.length}</span>
                      </summary>
                      <div className="p-4 space-y-2 bg-slate-50">
                        {catExercises.map(ex=>(
                          <div key={ex.id} className="p-3 rounded-xl bg-white border-2 border-slate-100 hover:border-emerald-300 transition-all flex justify-between items-center group">
                            <div>
                              <p className="font-black text-sm text-slate-900">{formatName(ex.name)}</p>
                              {ex.gifUrl&&<p className="text-[10px] text-blue-600 font-black">✓ GIF</p>}
                            </div>
                            <div className="flex gap-1">
                              <button onClick={()=>setEditingExercise(ex)} className="text-blue-400 font-black text-[10px] bg-blue-50 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-500 hover:text-white">Edit</button>
                              <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','library',ex.id))} className="text-red-400 font-black text-[10px] bg-red-50 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">Del</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PLAN */}
      {activeTab==='plan'&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl space-y-3`}>
            <h4 className={`font-black text-base border-b pb-3 ${tx} border-slate-200`}>Assign Session</h4>
            <ClientSelector clientNames={clientNames} value={targetClient} onChange={phone=>{setTargetClient(phone);setAnalyticsClient(phone);setSessionName('');}} placeholder="Select Client..."/>
            {targetClient&&clientNames[targetClient]&&(
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm" style={{backgroundColor: PHASE_COLORS[clientNames[targetClient]?.nasm_phase || 1]}}>{clientNames[targetClient]?.nasm_phase || 1}</div>
                <div className="text-left">
                  <p className="font-black text-sm text-slate-900">{titleCase(clientNames[targetClient]?.name||targetClient)}</p>
                  <p className="text-[10px] text-slate-500">{NASM_OPT_PHASES[clientNames[targetClient]?.nasm_phase || 1]?.phase}</p>
                </div>
                {clientDays.length>0&&(
                  <div className="ml-auto flex gap-1 flex-wrap justify-end">
                    {clientDays.map((d,i)=>(
                      <button key={d} onClick={()=>setSessionName(d)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${sessionName===d?'bg-slate-900 text-emerald-400':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{d}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <input type="text" placeholder="Day Name (e.g Day 4)" value={sessionName} onChange={e=>setSessionName(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}/>

            <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 space-y-3">
              <div className="flex justify-between items-center gap-2">
                <div>
                  <h4 className="font-black text-sm text-slate-900 uppercase">Workout Templates</h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase">PPL, Fat Loss, Strength, Rehab</p>
                </div>
                <button onClick={applyTemplate} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase">Apply</button>
              </div>
              <select value={templateName} onChange={e=>setTemplateName(e.target.value)} className="w-full p-3 bg-white border-2 border-emerald-100 rounded-xl font-black text-sm outline-none focus:border-emerald-500">
                {Object.keys(WORKOUT_TEMPLATES).map(name=><option key={name} value={name}>{name}</option>)}
              </select>
              <button onClick={applySmartProgram} className="w-full bg-slate-900 text-emerald-400 py-3 rounded-xl text-xs font-black uppercase">Generate Smart Program From Client Goal</button>
            </div>

            <div className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="flex justify-between items-center gap-2">
                <div>
                  <h4 className="font-black text-sm text-slate-900 uppercase">Copy Program</h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Clone all days from another client</p>
                </div>
                <button onClick={copyProgram} className="bg-slate-900 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase">Copy</button>
              </div>
              <ClientSelector clientNames={clientNames} value={copyFromClient} onChange={setCopyFromClient} placeholder="Source Client..."/>
            </div>
            
            {/* CSV Upload */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center">
              <input type="file" accept=".csv" onChange={async(e)=>{
                const file = e.target.files[0];
                if(!file) return;
                const text = await file.text();
                const lines = text.split('\n').filter(l=>l.trim());
                const [header, ...rows] = lines;
                const cols = header.split(',').map(c=>c.trim().toLowerCase());
                
                if(!targetClient || !sessionName) { alert('Select client and day first'); return; }
                
                let count = 0;
                for(const row of rows) {
                  if(!row.trim()) continue;
                  const values = row.split(',').map(v=>v.trim());
                  const obj = {};
                  cols.forEach((col,i)=>obj[col]=values[i]||'');
                  
                  if(!obj.name) continue;
                  await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
                    name: obj.name,
                    category: obj.category||'RESISTANCE',
                    sets: obj.sets||'3',
                    reps: obj.reps||'10',
                    tempo: obj.tempo||'',
                    coachNote: obj.coachnote||'',
                    gifUrl: obj.gifurl||'',
                    assignedTo: targetClient,
                    day: sessionName,
                    orderIndex: Date.now() + count
                  });
                  count++;
                }
                alert(`✅ Imported ${count} exercises from CSV`);
                e.target.value = '';
              }} className="hidden" id="csvInput"/>
              <label htmlFor="csvInput" className="cursor-pointer block">
                <p className="font-black text-sm text-slate-900 mb-2">📊 Import from CSV</p>
                <p className="text-xs text-slate-500 mb-3">Click to upload or drag & drop</p>
                <p className="text-[10px] text-slate-400">Format: name, category, sets, reps, tempo, coachnote, gifurl</p>
              </label>
            </div>
            <SearchableDropdown options={libraryData} value={newEx.name} onChange={v=>setNewEx({...newEx,name:v})} placeholder="Search or add exercise..." allowNew={true}/>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder="Sets" value={newEx.sets} onChange={e=>setNewEx({...newEx,sets:e.target.value})} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none text-center focus:border-emerald-500 ${inp}`}/>
              <input type="text" placeholder="Reps" value={newEx.reps} onChange={e=>setNewEx({...newEx,reps:e.target.value})} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none text-center focus:border-emerald-500 ${inp}`}/>
              <select value={newEx.category} onChange={e=>setNewEx({...newEx,category:e.target.value})} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}>
                {CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Tempo (optional)" value={newEx.tempo} onChange={e=>setNewEx({...newEx,tempo:e.target.value})} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}/>
            <input type="text" placeholder="Coach Note (optional)" value={newEx.coachNote} onChange={e=>setNewEx({...newEx,coachNote:e.target.value})} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}/>
            <button onClick={async()=>{
              if(!targetClient||!newEx.name)return;
              const libEx=libraryData.find(l=>l.name===newEx.name);
              await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
                ...newEx,
                gifUrl:libEx?.gifUrl||'',
                muscleGroup: libEx?.muscleGroup || getMuscleGroup(newEx.name) || '',
                equipment: libEx?.equipment || '',
                alternatives: libEx?.alternatives || '',
                regressions: libEx?.regressions || '',
                progressions: libEx?.progressions || '',
                assignedTo:targetClient,day:sessionName,orderIndex:Date.now()
              });
              setNewEx({name:'',category:'RESISTANCE',sets:'3',reps:'10',tempo:'',coachNote:''});
              alert('Assigned ✅');
            }} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">Assign Workout +</button>
            <div className="flex gap-2">
              <button onClick={()=>setShowTemplate(true)} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">📋 Full Day Template</button>
              <button onClick={()=>{setNewEx({name:'',category:'RESISTANCE',sets:'3',reps:'10',tempo:'',coachNote:'**NEW**'});}} className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">➕ New Exercise</button>
              <button onClick={printProgram} className="flex-1 bg-slate-200 text-slate-700 py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">Print</button>
            </div>
          </div>

          <div className="space-y-5">
            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
              <h3 className={`font-black text-base border-b pb-3 mb-3 text-left ${tx} border-slate-200`}>Calendar View</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {clientDays.length>0?clientDays.map(day=>{
                  const dayExercises = workouts.filter(w=>w.assignedTo===targetClient&&w.day===day);
                  const muscleMix = [...new Set(dayExercises.map(ex=>getMuscleGroup(ex.name)).filter(Boolean))].slice(0,2).join(', ') || 'Mixed';
                  return (
                    <button key={day} onClick={()=>setSessionName(day)} className={`p-3 rounded-2xl border-2 text-left transition-all ${sessionName===day?'border-emerald-500 bg-emerald-50':'border-slate-100 bg-slate-50 hover:border-emerald-200'}`}>
                      <p className="font-black text-sm text-slate-900">{day}</p>
                      <p className="text-[10px] font-black text-slate-500">{dayExercises.length} exercises</p>
                      <p className="text-[10px] font-black text-emerald-600 truncate">{muscleMix}</p>
                    </button>
                  );
                }):(
                  <p className={`col-span-full text-xs font-black ${sub} text-center py-6`}>Select a client or apply a template to build the calendar</p>
                )}
              </div>
            </div>

            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl flex flex-col h-auto md:h-[450px]`}>
              <h3 className={`font-black text-base border-b pb-3 mb-3 text-left ${tx} border-slate-200`}>Plan View: <span className="text-emerald-500 break-words">{sessionName||'---'}</span></h3>
              <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                {workouts.filter(w=>w.assignedTo===targetClient&&w.day===sessionName).sort((a,b)=>a.orderIndex-b.orderIndex).map((ex,idx,arr)=>(
                  <ExerciseEditRow key={ex.id} exercise={ex} idx={idx} arr={arr} db={db} appId={appId}/>
                ))}
                {workouts.filter(w=>w.assignedTo===targetClient&&w.day===sessionName).length===0&&(
                  <p className={`text-xs font-black ${sub} text-center py-8`}>No exercises assigned</p>
                )}
              </div>
            </div>

            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
              <h3 className="font-black text-sm border-b pb-3 mb-3 text-left uppercase text-emerald-500 border-slate-200">Performance Archive</h3>
              {!analyticsClient
                ?<p className={`text-xs font-black ${sub} text-center py-8`}>Select a client to view history</p>
                :<div className="space-y-2 max-h-64 overflow-y-auto">
                  {archiveGroups.length===0
                    ?<p className={`text-xs font-black ${sub} text-center py-8`}>No records yet</p>
                    :archiveGroups.map(([date,entries])=>(
                      <div key={date}>
                        <button onClick={()=>setExpandedDate(expandedDate===date?null:date)} className={`w-full flex justify-between items-center p-3 rounded-xl font-black text-xs hover:bg-emerald-50 transition-all ${rowbg}`}>
                          <span className="font-black text-xs text-slate-600">{entries.length} exercises</span>
                          <span className="font-black text-xs text-emerald-600">{date}</span>
                        </button>
                        {expandedDate===date&&(
                          <div className="p-2 space-y-1 bg-white">
                            {entries.map((e,i)=>(
                              <div key={i} className="text-xs font-bold p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <p className="font-black text-slate-900 truncate">{formatName(e.exerciseName)}</p>
                                <div className="flex justify-between items-center mt-1">
                                  <p className={`text-[9px] ${sub}`}>{e.setsData?.length||0} sets</p>
                                  {e.setsData&&e.setsData.length>0&&<p className="text-[9px] font-black text-emerald-600">{Math.max(...e.setsData.map(s=>parseFloat(s.weight)||0))}kg</p>}
                                  {e.rpe&&<p className="text-[9px] font-black text-amber-600">RPE {e.rpe}</p>}
                                  {e.isPR&&<span className="text-xs">🏆</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              }
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS */}
      {activeTab==='analytics'&&(
        <div className="space-y-3">
          <div className={`${bg} border-2 p-5 rounded-[2rem] shadow-xl`}>
            <h3 className={`font-black text-sm border-b pb-3 mb-3 ${tx} border-slate-200 uppercase`}>Select Client</h3>
            <ClientSelector clientNames={clientNames} value={analyticsClient} onChange={setAnalyticsClient} placeholder="Select Client..."/>
          </div>

          {analyticsClient&&(
            <>
              {/* Upper Body */}
              <AnalyticsChart
                title="Upper Body"
                color="#ef4444"
                data={muscleChartData.data}
                muscles={['Chest','Shoulders','Arms'].filter(m=>muscleChartData.muscles.includes(m))}
              />

              {/* Back - منفصل مع 3 مناطق */}
              <AnalyticsChart
                title="Back"
                color="#1d4ed8"
                data={muscleChartData.data}
                muscles={['Upper Back','Middle Back','Lower Back'].filter(m=>muscleChartData.muscles.includes(m))}
              />

              {/* Lower Body */}
              <AnalyticsChart
                title="Lower Body"
                color="#f59e0b"
                data={muscleChartData.data}
                muscles={['Quads','Hamstrings','Glutes'].filter(m=>muscleChartData.muscles.includes(m))}
              />

              {/* Core */}
              <AnalyticsChart
                title="Core"
                color="#10b981"
                data={muscleChartData.data}
                muscles={['Core'].filter(m=>muscleChartData.muscles.includes(m))}
              />

              {/* RPE Trend */}
              <AnalyticsChart
                title="RPE Trend"
                color="#f59e0b"
                data={rpeChartData}
                muscles={[]}
                isRpe={true}
              />
            </>
          )}
        </div>
      )}

      {/* INBOX */}
      {activeTab==='inbox'&&(
        <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
          <h3 className={`font-black text-base border-b pb-3 mb-4 ${tx} border-slate-200`}>Client Messages</h3>
          <div className="text-center py-20 text-slate-400 font-black">
            <p className="text-3xl mb-3">📮</p>
            <p>No messages yet</p>
            <p className="text-sm mt-2">Messages from clients will appear here</p>
          </div>
        </div>
      )}

      {showAddClient&&<AddNewClientModal onClose={()=>setShowAddClient(false)} db={db} appId={appId}/>}
      {showAddExercise&&<AddExerciseModal onClose={()=>setShowAddExercise(false)} db={db} appId={appId}/>}
      {editingExercise&&<EditExerciseModal exercise={editingExercise} onClose={()=>setEditingExercise(null)} db={db} appId={appId}/>}
      {showTemplate&&<DayTemplateModal onClose={()=>setShowTemplate(false)} db={db} appId={appId} libraryData={libraryData} targetClient={targetClient} sessionName={sessionName}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ExerciseEditRow
// ══════════════════════════════════════════════════════════════════════════════
function ExerciseEditRow({ exercise, idx, arr, db, appId }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(exercise);
  const [saving, setSaving] = useState(false);
  const rowbg = 'bg-slate-50 border-slate-100';
  const tx = 'text-slate-900';
  const sub = 'text-slate-500';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id),{
        name: formData.name,
        sets: formData.sets,
        reps: formData.reps,
        tempo: formData.tempo,
        coachNote: formData.coachNote,
        category: formData.category,
      });
      setEditMode(false);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  return (
    <>
      {editMode?(
        <div className={`p-4 rounded-2xl border-2 gap-3 ${rowbg} space-y-2`}>
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="Exercise name" className="w-full p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white"/>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={formData.sets} onChange={e=>setFormData({...formData,sets:e.target.value})} placeholder="Sets" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>
            <input type="text" value={formData.reps} onChange={e=>setFormData({...formData,reps:e.target.value})} placeholder="Reps" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>
            <input type="text" value={formData.tempo||''} onChange={e=>setFormData({...formData,tempo:e.target.value})} placeholder="Tempo" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>
          </div>
          <input type="text" value={formData.coachNote||''} onChange={e=>setFormData({...formData,coachNote:e.target.value})} placeholder="Coach note" className="w-full p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white"/>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-500 text-white px-3 py-2 rounded-lg font-black text-xs uppercase transition-all disabled:opacity-40">Save</button>
            <button onClick={()=>{setEditMode(false);setFormData(exercise);}} className="flex-1 bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-black text-xs uppercase transition-all">Cancel</button>
          </div>
        </div>
      ):(
        <div className={`flex items-center p-3 rounded-2xl border-2 gap-3 ${rowbg}`}>
          <div className="flex flex-col gap-1 shrink-0">
            <button disabled={idx===0} onClick={async()=>{const prev=arr[idx-1];const tmp=exercise.orderIndex;await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id),{orderIndex:prev.orderIndex});await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',prev.id),{orderIndex:tmp});}} className={`text-xs font-black px-2 py-1 rounded-lg transition-all ${idx===0?'opacity-20 cursor-not-allowed':'bg-slate-200 hover:bg-emerald-500 hover:text-white'}`}>▲</button>
            <button disabled={idx===arr.length-1} onClick={async()=>{const next=arr[idx+1];const tmp=exercise.orderIndex;await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id),{orderIndex:next.orderIndex});await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',next.id),{orderIndex:tmp});}} className={`text-xs font-black px-2 py-1 rounded-lg transition-all ${idx===arr.length-1?'opacity-20 cursor-not-allowed':'bg-slate-200 hover:bg-emerald-500 hover:text-white'}`}>▼</button>
          </div>
          <div className="flex-1 text-left min-w-0">
            <span className="font-black text-sm text-slate-900 truncate block">{formatName(exercise.name)}</span>
            <p className="text-[10px] font-bold text-slate-500">{exercise.sets}x{exercise.reps}{exercise.tempo?` · ${exercise.tempo}`:''}</p>
            {exercise.coachNote&&<p className="text-[10px] text-emerald-500 font-bold truncate">💬 {exercise.coachNote}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={()=>setEditMode(true)} className="bg-blue-100 text-blue-600 font-black text-[10px] px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all">Edit</button>
            <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id))} className="text-red-400 font-black text-[10px] bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all">Del</button>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ExerciseRow
// ══════════════════════════════════════════════════════════════════════════════
function ExerciseRow({ exercise, db, appId, identifier, allLogs, sessionFinished, saveLog, onSaved }) {
  const setsCount = parseInt(exercise.sets) || 3;
  const [sets, setSets]           = useState(Array.from({length:setsCount}).map(()=>({weight:'',reps:exercise.reps||'10'})));
  const [rpe, setRpe]             = useState('7');
  const [isSaved, setIsSaved]     = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [showGif, setShowGif]     = useState(false);

  useEffect(()=>{ if(sessionFinished) setIsSaved(false); },[sessionFinished]);
  useEffect(()=>{
    const today = dayKey(new Date());
    const saved = allLogs.some(l=>l.exerciseId===exercise.id&&l.clientName===identifier&&dateFromLog(l)&&dayKey(dateFromLog(l))===today);
    if(saved) setIsSaved(true);
  },[allLogs,exercise.id,identifier]);

  const bestWeight = useMemo(()=>{
    const logs = allLogs.filter(l=>l.exerciseId===exercise.id&&l.clientName===identifier);
    if(!logs.length) return 0;
    return Math.max(...logs.flatMap(l=>l.setsData?.map(s=>parseFloat(s.weight)||0)||[0]));
  },[allLogs,exercise.id,identifier]);

  const progressData = useMemo(()=>{
    return allLogs
      .filter(l=>l.exerciseId===exercise.id&&l.clientName===identifier)
      .sort((a,b)=>(a.completedAt?.toDate?.()||0)-(b.completedAt?.toDate?.()||0))
      .slice(-6)
      .map(l=>({
        date:l.completedAt?.toDate?.().toLocaleDateString('en-US',{month:'short',day:'numeric'})||'Log',
        maxWeight:Math.max(...(l.setsData?.map(s=>parseFloat(s.weight)||0)||[0])),
        rpe:Number(l.rpe)||null,
      }));
  },[allLogs,exercise.id,identifier]);
  const overloadSuggestion = useMemo(()=>getOverloadSuggestion(exercise, allLogs, identifier), [exercise, allLogs, identifier]);

  const handleSave = async () => {
    if(isSaved||isSkipped) return;
    try {
      const currentMax = Math.max(...sets.map(s=>parseFloat(s.weight)||0));
      const volume = sets.reduce((sum,s)=>(sum+((parseFloat(s.weight)||0)*(parseFloat(s.reps)||0))),0);
      const isPR = currentMax>bestWeight&&bestWeight>0;
      const payload = {
        exerciseId:exercise.id, clientName:identifier, setsData:sets,
        exerciseName:exercise.name, category:exercise.category,
        rpe:Number(rpe), volume, maxWeight:currentMax, isPR
      };
      if(saveLog) await saveLog(payload);
      else await addDoc(collection(db,'artifacts',appId,'public','data','logs'),{...payload, completedAt:serverTimestamp()});
      setIsSaved(true);
      onSaved?.(exercise.id);
    } catch(e){ console.error(e); }
  };

  const saved    = isSaved && !sessionFinished;

  return (
    <>
      {showGif&&exercise.gifUrl&&<GifPopup url={exercise.gifUrl} onClose={()=>setShowGif(false)}/>}
      <div className={`rounded-[2rem] border-2 shadow-md transition-all duration-300 bg-white overflow-hidden
        ${saved ? 'border-emerald-400 shadow-emerald-100 bg-emerald-50/20'
          : isSkipped ? 'opacity-40 grayscale border-slate-200'
          : 'border-slate-200'}`}>

        {/* ── Header Bar ── */}
        <div className={`px-5 pt-5 pb-3 ${saved ? 'bg-emerald-50/40' : ''}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <h4 className="font-black text-lg leading-tight text-slate-900 flex-1">
              {formatName(exercise.name)}
            </h4>
            <div className="flex items-center gap-2 shrink-0">
              {exercise.gifUrl && (
                <button onClick={() => setShowGif(true)}
                  className="text-xs bg-slate-900 text-emerald-400 px-3 py-1.5 rounded-xl font-black hover:bg-slate-700 transition-all min-h-[36px]">
                  GIF
                </button>
              )}
            </div>
          </div>

          {/* Metadata Pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl min-h-[32px] flex items-center">
              {exercise.sets} × {exercise.reps}
            </span>
            {exercise.tempo && (
              <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl min-h-[32px] flex items-center">
                ⏱ {exercise.tempo}
              </span>
            )}
            {bestWeight > 0 && (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl min-h-[32px] flex items-center">
                💪 PB: {bestWeight}kg
              </span>
            )}
          </div>

          {/* Coach Note */}
          {exercise.coachNote && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
              <p className="text-xs font-bold text-amber-800">💬 {exercise.coachNote}</p>
            </div>
          )}

          {(exercise.equipment || exercise.alternatives || exercise.regressions || exercise.progressions) && (
            <div className="grid grid-cols-1 gap-2 mb-3">
              {exercise.equipment&&<p className="text-[11px] font-black text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">Equipment: {exercise.equipment}</p>}
              {exercise.alternatives&&<p className="text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">Alternatives: {exercise.alternatives}</p>}
              {exercise.regressions&&<p className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Easier: {exercise.regressions}</p>}
              {exercise.progressions&&<p className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">Harder: {exercise.progressions}</p>}
            </div>
          )}

          {/* Progressive Overload */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-3">
            <p className="text-[11px] font-black text-blue-700">📈 {overloadSuggestion}</p>
          </div>
        </div>

        {/* ── Sets Input ── */}
        <div className="px-5 pb-3 space-y-2">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400 w-10 shrink-0 text-center">S{i + 1}</span>
              <input
                type="number" step="0.5" value={s.weight}
                onChange={e => { const ns = [...sets]; ns[i] = { ...ns[i], weight: e.target.value }; setSets(ns); }}
                className="flex-1 min-w-0 p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center min-h-[48px] transition-colors"
                placeholder="kg"
              />
              <span className="text-xs text-slate-400 shrink-0">kg</span>
              <input
                type="text" value={s.reps}
                onChange={e => { const ns = [...sets]; ns[i] = { ...ns[i], reps: e.target.value }; setSets(ns); }}
                className="w-16 p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center min-h-[48px] transition-colors"
                placeholder="reps"
              />
            </div>
          ))}
        </div>

        {/* ── RPE ── */}
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Rate of Effort</p>
              <p className="text-xs font-black text-slate-700 mt-0.5">How hard was it?</p>
            </div>
            <select value={rpe} onChange={e => setRpe(e.target.value)}
              disabled={saved || isSkipped}
              className="w-20 p-2 bg-white border-2 border-slate-200 rounded-xl font-black text-base outline-none focus:border-emerald-500 text-center min-h-[44px] disabled:opacity-50">
              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* ── Mini Progress Chart ── */}
        {progressData.length > 1 && (
          <div className="px-5 pb-3">
            <div className="h-32 rounded-xl bg-slate-50 border border-slate-100 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 11 }} />
                  <Line type="monotone" dataKey="maxWeight" name="Max kg" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
                  <Line type="monotone" dataKey="rpe" name="RPE" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Save / Skip Buttons ── */}
        <div className="px-5 pb-5">
          {!saved && !isSkipped && (
            <div className="flex gap-2">
              <button onClick={handleSave}
                className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-md hover:bg-emerald-600 active:scale-95 transition-all min-h-[52px]">
                ✅ Save
              </button>
              <button onClick={() => setIsSkipped(true)}
                className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm uppercase hover:bg-slate-200 active:scale-95 transition-all min-h-[52px]">
                ⏭ Skip
              </button>
            </div>
          )}
          {saved && (
            <div className="flex items-center justify-center bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase min-h-[52px]">
              ✓ SAVED
            </div>
          )}
          {isSkipped && (
            <div className="flex items-center justify-center bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm uppercase min-h-[52px]">
              SKIPPED
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ClientView
// ══════════════════════════════════════════════════════════════════════════════
function ClientView({ workouts, db, appId, identifier, allLogs }) {
  const [selectedDay, setSelectedDay]         = useState('');
  const [note, setNote]                       = useState('');
  const [sessionFinished, setSessionFinished] = useState(false);
  const [showSummary, setShowSummary]         = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [sessionStarted, setSessionStarted]   = useState(false);
  const [currentIndex, setCurrentIndex]       = useState(0);
  const [localLogs, setLocalLogs]             = useState([]);
  const [cachedWorkouts, setCachedWorkouts]   = useState([]);
  const offline = useOfflineSync(db, appId);

  useEffect(() => {
    if (workouts.length) cacheClientWorkouts(identifier, workouts);
  }, [identifier, workouts]);

  useEffect(() => {
    cacheLogs(allLogs.filter(l => l.clientName === identifier));
  }, [allLogs, identifier]);

  useEffect(() => {
    getCachedWorkouts(identifier).then(setCachedWorkouts);
    getCachedLogs(identifier).then(setLocalLogs);
  }, [identifier, offline.isOnline, offline.pendingCount]);

  const visibleWorkouts = workouts.length ? workouts : cachedWorkouts;
  const visibleLogs = useMemo(() => {
    const byKey = new Map();
    [...allLogs.filter(l => l.clientName === identifier), ...localLogs].forEach(log => {
      const key = log.id || log.localId || `${log.exerciseId}-${log.completedAt}-${log.maxWeight}`;
      byKey.set(key, log);
    });
    return [...byKey.values()];
  }, [allLogs, localLogs, identifier]);

  const days = useMemo(() => {
    return [...new Set(visibleWorkouts.map(w => w.day))].filter(Boolean).sort((a, b) => {
      const aNum = parseInt(a.split(' ')[1]) || 999;
      const bNum = parseInt(b.split(' ')[1]) || 999;
      return aNum - bNum;
    });
  }, [visibleWorkouts]);

  useEffect(() => {
    if (days.length > 0 && !selectedDay) setSelectedDay(days[0]);
  }, [days, selectedDay]);

  useBackButton(showSummary, () => setShowSummary(false));

  const filtered = visibleWorkouts.filter(w => w.day === selectedDay).sort((a, b) => a.orderIndex - b.orderIndex);

  const exercisesByCategory = useMemo(() => {
    const grouped = {};
    CATEGORIES.forEach(cat => grouped[cat] = []);
    filtered.forEach(ex => {
      const cat = ex.category || 'RESISTANCE';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ex);
    });
    return grouped;
  }, [filtered]);

  const summaryData = useMemo(() => {
    const today = dayKey(new Date());
    const tl = visibleLogs.filter(l =>
      l.clientName === identifier &&
      dateFromLog(l) &&
      dayKey(dateFromLog(l)) === today
    );
    const rpeLogs = tl.filter(l => Number(l.rpe));
    return {
      count: tl.length,
      totalSets: tl.reduce((a, l) => a + (l.setsData?.length || 0), 0),
      prs: tl.filter(l => l.isPR),
      avgRpe: rpeLogs.length
        ? (rpeLogs.reduce((a, l) => a + Number(l.rpe), 0) / rpeLogs.length).toFixed(1)
        : '—'
    };
  }, [visibleLogs, identifier]);

  const workoutProgress = useMemo(() => {
    const today = dayKey(new Date());
    const completed = new Set(visibleLogs
      .filter(l => l.clientName === identifier && dateFromLog(l) && dayKey(dateFromLog(l)) === today)
      .map(l => l.exerciseId));
    return {
      done: filtered.filter(ex => completed.has(ex.id)).length,
      total: filtered.length,
      completed,
    };
  }, [filtered, visibleLogs, identifier]);

  const saveClientLog = useCallback(async (payload) => {
    if (navigator.onLine) {
      await addDoc(collection(db,'artifacts',appId,'public','data','logs'),{
        ...payload,
        completedAt: serverTimestamp(),
      });
      return;
    }
    const offlinePayload = {
      ...payload,
      completedAt: new Date().toISOString(),
      offlineStatus: 'pending',
    };
    const localId = await savePendingLog(offlinePayload);
    setLocalLogs(prev => [...prev, {...offlinePayload, localId}]);
    await offline.refreshPendingCount();
  }, [db, appId, offline]);

  const toggleCategory = (cat) => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }));

  return (
    <div className="max-w-2xl mx-auto px-4 pt-2 pb-8 font-black">

      {/* ── Session Complete Modal ── */}
      {showSummary && (
        <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-8 w-full max-w-sm shadow-2xl text-center space-y-5">
            <div className="text-5xl">🎉</div>
            <h2 className="font-black text-2xl text-slate-900">Session Complete!</h2>
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: 'Exercises', v: summaryData.count },
                { l: 'Sets',      v: summaryData.totalSets },
                { l: 'PRs',       v: summaryData.prs.length },
                { l: 'Avg RPE',   v: summaryData.avgRpe }
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-50">
                  <span className="text-xl font-black text-emerald-500 block">{s.v}</span>
                  <p className="text-[10px] font-black mt-1 text-slate-500">{s.l}</p>
                </div>
              ))}
            </div>
            {summaryData.prs.length > 0 && (
              <div className="p-4 rounded-2xl border-2 border-yellow-300 bg-yellow-50">
                <p className="text-xs font-black text-yellow-700 mb-2">🏆 New PRs!</p>
                {summaryData.prs.map((pr, i) => (
                  <p key={i} className="text-xs font-black text-slate-900">{formatName(pr.exerciseName)}</p>
                ))}
              </div>
            )}
            <button onClick={() => setShowSummary(false)}
              className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Day Tabs ── */}
      <div className="bg-white border-2 border-slate-200 rounded-[2rem] p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Today Workout</p>
            <h2 className="text-xl font-black text-slate-900">{selectedDay || 'No day selected'}</h2>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${offline.isOnline?'bg-emerald-50 text-emerald-700 border border-emerald-100':'bg-amber-50 text-amber-700 border border-amber-100'}`}>
            {offline.isSyncing ? 'Syncing' : offline.isOnline ? `Synced ${offline.pendingCount ? `(${offline.pendingCount} pending)` : ''}` : `Offline ${offline.pendingCount ? `(${offline.pendingCount})` : ''}`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{width: workoutProgress.total ? `${Math.round((workoutProgress.done/workoutProgress.total)*100)}%` : '0%'}}/>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setSessionStarted(true); setCurrentIndex(0); setSessionFinished(false); }} disabled={!filtered.length} className="flex-1 bg-slate-900 text-emerald-400 py-3 rounded-2xl font-black text-sm uppercase disabled:opacity-40 active:scale-95 transition-all">
            Start Workout
          </button>
          <button onClick={() => offline.syncPendingLogs()} disabled={!offline.isOnline || offline.isSyncing || !offline.pendingCount} className="px-4 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black text-xs uppercase disabled:opacity-40 active:scale-95 transition-all">
            Sync
          </button>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase mt-2">{workoutProgress.done}/{workoutProgress.total} exercises done today</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar mb-4">
        {days.map(d => (
          <button key={d}
            onClick={() => { setSelectedDay(d); setExpandedCategories({}); setSessionStarted(false); setCurrentIndex(0); }}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all shrink-0 border-2 min-h-[48px]
              ${selectedDay === d
                ? 'bg-slate-900 text-emerald-400 border-slate-900 scale-105 shadow-lg'
                : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300'
              }`}>
            {d}
          </button>
        ))}
      </div>

      {sessionStarted && filtered.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between bg-slate-900 text-white rounded-2xl px-4 py-3">
            <button onClick={() => setSessionStarted(false)} className="text-slate-300 text-xs font-black uppercase">Exit</button>
            <p className="text-emerald-400 text-xs font-black uppercase">Exercise {currentIndex + 1} / {filtered.length}</p>
          </div>
          <ExerciseRow
            exercise={filtered[currentIndex]}
            db={db}
            appId={appId}
            identifier={identifier}
            allLogs={visibleLogs}
            sessionFinished={sessionFinished}
            saveLog={saveClientLog}
            onSaved={() => setCurrentIndex(i => Math.min(i + 1, filtered.length - 1))}
          />
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))} disabled={currentIndex===0} className="bg-slate-100 text-slate-600 py-3 rounded-2xl font-black text-xs uppercase disabled:opacity-40">Prev</button>
            <button onClick={() => setCurrentIndex(i => Math.min(i + 1, filtered.length - 1))} disabled={currentIndex===filtered.length-1} className="bg-slate-100 text-slate-600 py-3 rounded-2xl font-black text-xs uppercase disabled:opacity-40">Next</button>
            <button onClick={() => { setSessionFinished(true); setShowSummary(true); setSessionStarted(false); }} className="bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs uppercase">Finish</button>
          </div>
        </div>
      )}

      {/* ── Category Groups ── */}
      {!sessionStarted&&<div className="space-y-2 mb-6">
        {CATEGORIES.map(cat => {
          const exercises = exercisesByCategory[cat] || [];
          if (exercises.length === 0) return null;
          const isExpanded = expandedCategories[cat];
          return (
            <div key={cat} className="rounded-2xl overflow-hidden border-2 border-slate-200">
              <button onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 text-emerald-400 font-black text-sm hover:bg-slate-800 transition-all min-h-[52px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                  <span className="uppercase tracking-wide">{cat}</span>
                  <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full">{exercises.length}</span>
                </div>
              </button>
              {isExpanded && (
                <div className="p-3 space-y-3 bg-slate-50">
                  {exercises.map(ex => (
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      db={db}
                      appId={appId}
                      identifier={identifier}
                      allLogs={visibleLogs}
                      sessionFinished={sessionFinished}
                      saveLog={saveClientLog}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-black text-slate-400 uppercase tracking-widest">No Workouts</p>
          </div>
        )}
      </div>}

      {/* ── Session Controls (inline, لا يخبي المحتوى) ── */}
      <div className="space-y-3 pb-6">
        <div className="flex gap-3">
          <button
            onClick={() => { setSessionFinished(true); setShowSummary(true); }}
            className="flex-[2] bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-xl text-base uppercase border-b-4 border-emerald-700 active:border-b-0 active:scale-95 transition-all min-h-[60px]">
            ✅ Finish Session
          </button>
          <button
            onClick={() => window.open('https://wa.me/201500807824', '_blank')}
            className="w-16 bg-slate-900 text-emerald-400 font-black py-5 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all active:scale-95 min-h-[60px]">
            <span className="text-xl">💬</span>
          </button>
        </div>
        <div className="relative bg-white border-2 border-slate-200 rounded-2xl shadow overflow-hidden">
          <textarea
            placeholder="Message Coach..."
            rows={3}
            className="w-full px-4 pt-3 pb-12 text-sm font-bold outline-none bg-transparent resize-none text-slate-900"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button
            onClick={async () => {
              if (!note) return;
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'user_notes'),
                { clientName: identifier, note, timestamp: serverTimestamp() });
              setNote('');
              alert('Sent ✅');
            }}
            className="absolute bottom-3 right-3 bg-slate-900 text-emerald-400 px-5 py-2 rounded-xl text-xs font-black uppercase min-h-[36px]">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── أضف هذا الـ Component قبل export default App ──────────────────────
// ────────────────────────────────────────────────────────────────────────
 
function ProgramBuilder({ onClose }) {
  const [step, setStep] = useState('assessment'); // assessment, review, program
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    fitnessLevel: 'Beginner',
    goal: 'General Fitness',
    daysPerWeek: 3,
    equipment: [],
    injuries: '',
  });
  const [generatedProgram, setGeneratedProgram] = useState(null);
 
  const EXERCISES_BY_PHASE = {
    1: {
      Chest: ['Push-ups (BW)', 'Dumbbell Bench Press'],
      Back: ['Bodyweight Rows', 'Dumbbell Rows'],
      Legs: ['Bodyweight Squats', 'Dumbbell Lunges'],
      Shoulders: ['Dumbbell Shoulder Press', 'Lateral Raises (DB)'],
      Core: ['Plank', 'Bird Dog', 'Dead Bug']
    },
    2: {
      Chest: ['Barbell Bench Press', 'Incline Dumbbell Press'],
      Back: ['Barbell Rows', 'Pull-ups', 'Lat Pulldown'],
      Legs: ['Barbell Squats', 'Romanian Deadlifts'],
      Shoulders: ['Barbell Shoulder Press', 'Dumbbell Shoulder Press'],
      Core: ['Plank Variations', 'Anti-Rotation Press']
    },
    3: {
      Chest: ['Barbell Incline Press', 'Dumbbell Flyes', 'Machine Press'],
      Back: ['Weighted Pull-ups', 'T-Bar Rows', 'Seal Rows'],
      Legs: ['Barbell Squats (heavy)', 'Leg Press', 'Leg Curls'],
      Shoulders: ['Heavy Dumbbell Press', 'Machine Shoulder Press'],
      Core: ['Weighted Planks', 'Hanging Leg Raises']
    },
    4: {
      Chest: ['Heavy Barbell Bench', '1RM Test'],
      Back: ['Heavy Deadlifts', 'Heavy Rows'],
      Legs: ['Heavy Squats', 'Heavy Deadlifts'],
      Shoulders: ['Heavy Military Press'],
      Core: ['Heavy Core Movements']
    },
    5: {
      Chest: ['Plyometric Push-ups', 'Medicine Ball Chest Pass'],
      Back: ['Explosive Pull-ups', 'Explosive Rows'],
      Legs: ['Jump Squats', 'Box Jumps', 'Explosive Lunges'],
      Shoulders: ['Medicine Ball Throws'],
      Core: ['Explosive Core Work']
    }
  };
 
  const determineStartingPhase = () => {
    if (formData.fitnessLevel === 'Beginner') return 1;
    if (formData.fitnessLevel === 'Intermediate') return 2;
    return 3;
  };
 
  const generateWeeklyPlan = (phase, daysPerWeek) => {
    const muscleGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'];
    const plan = {};
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < daysPerWeek; i++) {
      const muscleGroup = muscleGroups[i % muscleGroups.length];
      plan[dayLabels[i]] = {
        muscleGroup,
        exercises: EXERCISES_BY_PHASE[phase][muscleGroup] || [],
        sets: NASM_OPT_PHASES[phase].reps,
        reps: NASM_OPT_PHASES[phase].reps,
        intensity: NASM_OPT_PHASES[phase].intensity,
        rest: NASM_OPT_PHASES[phase].rest
      };
    }
    
    return plan;
  };
 
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        equipment: checked 
          ? [...prev.equipment, value]
          : prev.equipment.filter(item => item !== value)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
 
  const handleGenerateProgram = () => {
    const startingPhase = determineStartingPhase();
    const weeklyPlan = generateWeeklyPlan(startingPhase, parseInt(formData.daysPerWeek));
    
    const program = {
      ...formData,
      startingPhase,
      phaseInfo: NASM_OPT_PHASES[startingPhase],
      weeklyPlan,
      createdAt: new Date().toLocaleDateString('ar-SA'),
      duration: NASM_OPT_PHASES[startingPhase].duration
    };
    
    setGeneratedProgram(program);
    setStep('program');
  };
 
  if (step === 'assessment') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-slate-900">NASM OPT Builder</h2>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600">×</button>
          </div>
 
          <form className="space-y-5">
            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                name="name"
                placeholder="الاسم"
                value={formData.name}
                onChange={handleFormChange}
                className="col-span-2 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="number"
                name="age"
                placeholder="العمر"
                value={formData.age}
                onChange={handleFormChange}
                className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleFormChange}
                className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              >
                <option value="">الجنس</option>
                <option value="Male">ذكر</option>
                <option value="Female">أنثى</option>
              </select>
            </div>
 
            {/* Fitness Level */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">مستوى اللياقة</label>
              <select
                name="fitnessLevel"
                value={formData.fitnessLevel}
                onChange={handleFormChange}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              >
                <option value="Beginner">مبتدئ</option>
                <option value="Intermediate">متوسط</option>
                <option value="Advanced">متقدم</option>
              </select>
            </div>
 
            {/* Goal */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">الهدف</label>
              <select
                name="goal"
                value={formData.goal}
                onChange={handleFormChange}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              >
                <option value="General Fitness">اللياقة العامة</option>
                <option value="Weight Loss">خسارة الوزن</option>
                <option value="Muscle Gain">بناء العضلات</option>
                <option value="Strength">القوة</option>
                <option value="Endurance">التحمل</option>
              </select>
            </div>
 
            {/* Days Per Week */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">أيام التمرين في الأسبوع</label>
              <select
                name="daysPerWeek"
                value={formData.daysPerWeek}
                onChange={handleFormChange}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              >
                {[2, 3, 4, 5, 6].map(day => <option key={day} value={day}>{day} أيام</option>)}
              </select>
            </div>
 
            {/* Equipment */}
            <div>
              <label className="block text-sm font-black text-slate-700 mb-3">الأدوات المتاحة</label>
              <div className="grid grid-cols-2 gap-3">
                {['Dumbbells', 'Barbell', 'Cable', 'Bodyweight', 'Machines'].map(eq => (
                  <label key={eq} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={eq}
                      checked={formData.equipment.includes(eq)}
                      onChange={handleFormChange}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    <span className="text-sm font-black text-slate-700">{eq}</span>
                  </label>
                ))}
              </div>
            </div>
 
            {/* Injuries */}
            <textarea
              name="injuries"
              placeholder="إصابات سابقة أو ملاحظات طبية"
              value={formData.injuries}
              onChange={handleFormChange}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none h-20 resize-none"
            />
 
            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-black text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleGenerateProgram}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-black hover:bg-emerald-600 transition-all"
              >
                إنشاء البرنامج
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
 
  if (step === 'program' && generatedProgram) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-slate-900">برنامجك التدريبي</h2>
            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600">×</button>
          </div>
 
          {/* Program Header */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-6 mb-6 border-2 border-emerald-200">
            <h3 className="text-2xl font-black text-slate-900 mb-4">{generatedProgram.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-600 font-black text-xs">المرحلة</p>
                <p className="text-lg font-black text-emerald-600">{generatedProgram.phaseInfo.level}</p>
              </div>
              <div>
                <p className="text-slate-600 font-black text-xs">المدة</p>
                <p className="text-lg font-black text-emerald-600">{generatedProgram.duration}</p>
              </div>
              <div>
                <p className="text-slate-600 font-black text-xs">مستوى اللياقة</p>
                <p className="text-lg font-black text-emerald-600">{generatedProgram.fitnessLevel}</p>
              </div>
              <div>
                <p className="text-slate-600 font-black text-xs">الهدف</p>
                <p className="text-lg font-black text-emerald-600">{generatedProgram.goal}</p>
              </div>
            </div>
          </div>
 
          {/* Phase Info */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 mb-6">
            <h4 className="text-xl font-black mb-4">{generatedProgram.phaseInfo.phase}</h4>
            <p className="text-slate-300 mb-4">{generatedProgram.phaseInfo.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="text-slate-400 font-black text-xs">التكرارات</p>
                <p className="text-emerald-400 font-black">{generatedProgram.phaseInfo.reps}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="text-slate-400 font-black text-xs">الشدة</p>
                <p className="text-emerald-400 font-black">{generatedProgram.phaseInfo.intensity}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="text-slate-400 font-black text-xs">الراحة</p>
                <p className="text-emerald-400 font-black text-xs">{generatedProgram.phaseInfo.rest}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="text-slate-400 font-black text-xs">التركيز</p>
                <p className="text-emerald-400 font-black text-xs">{generatedProgram.phaseInfo.focus}</p>
              </div>
            </div>
          </div>
 
          {/* Weekly Plan */}
          <div className="mb-6">
            <h4 className="text-xl font-black text-slate-900 mb-4">جدول الأسبوع</h4>
            <div className="space-y-3">
              {Object.entries(generatedProgram.weeklyPlan).map(([day, info]) => (
                <div key={day} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-black text-slate-900">{day}</h5>
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black">
                      {info.muscleGroup}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-black mb-2">التمارين:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {info.exercises.map(ex => <li key={ex}>{ex}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                const text = `برنامج التدريب NASM OPT\n\n${generatedProgram.name}\n\nالمرحلة: ${generatedProgram.phaseInfo.level}\nالمدة: ${generatedProgram.duration}\n\n${Object.entries(generatedProgram.weeklyPlan).map(([day, info]) => `${day}: ${info.muscleGroup}`).join('\n')}`;
                navigator.clipboard.writeText(text);
                alert('تم نسخ البرنامج!');
              }}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-black hover:bg-blue-600 transition-all"
            >
              نسخ البرنامج
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-black hover:bg-emerald-600 transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }
}
// ══════════════════════════════════════════════════════════════════════════════
// Main App
// ══════════════════════════════════════════════════════════════════════════════
export default function WorkoutApp() {
  const [user, setUser]             = useState(null);
  const [authStep, setAuthStep]     = useState('login');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loginMode, setLoginMode]   = useState('client');
  const [phone, setPhone]           = useState('');
  const [loginError, setLoginError] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [role, setRole]             = useState('client');
  const [workouts, setWorkouts]     = useState([]);
  const [allLogs, setAllLogs]       = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [clientRegistry, setClientRegistry] = useState({});
  const [navVisible, setNavVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(()=>{
    const h=()=>{const y=window.scrollY;setNavVisible(y<=lastY.current||y<=80);lastY.current=y;};
    window.addEventListener('scroll',h,{passive:true});
    return()=>window.removeEventListener('scroll',h);
  },[]);

  useEffect(()=>{
    const u=onAuthStateChanged(auth,async au=>{
      setUser(au);
      if(!au){
        setAuthStep('login');
        setIdentifier('');
        setRole('client');
        setIsLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db,'users',au.uid));
        const pendingPhone = sessionStorage.getItem('gofit_client_phone') || '';
        if(!snap.exists() && au.isAnonymous && pendingPhone){
          setRole('client');
          setIdentifier(pendingPhone);
          setAuthStep('authenticated');
          setLoginError('');
          setIsLoading(false);
          return;
        }
        if(!snap.exists()){
          setLoginError('Account is signed in but has no GoFit role yet. Ask the owner to add a users/{uid} profile.');
          setAuthStep('login');
          await signOut(auth);
          return;
        }
        const profile = snap.data();
        setRole(profile.role || 'client');
        setIdentifier(profile.identifier || au.email || '');
        setAuthStep('authenticated');
        setLoginError('');
      } catch(e) {
        console.error(e);
        setLoginError('Could not load account permissions.');
        setAuthStep('login');
      } finally {
        setIsLoading(false);
      }
    });
    return()=>u();
  },[]);

  useEffect(()=>{
    if(!user||authStep!=='authenticated'||!identifier)return;
    const clientNamesRef = collection(db,'artifacts',APP_ID,'public','data','client_names');
    const workoutsRef = collection(db,'artifacts',APP_ID,'public','data','workouts');
    const logsRef = collection(db,'artifacts',APP_ID,'public','data','logs');
    const u1 = role === 'trainer' || role === 'owner'
      ? onSnapshot(clientNamesRef,s=>{ const m={};s.forEach(d=>{m[d.id]=d.data();});setClientRegistry(m); })
      : onSnapshot(doc(db,'artifacts',APP_ID,'public','data','client_names',identifier),d=>setClientRegistry(d.exists()?{[identifier]:d.data()}:{}));
    const u2 = role === 'trainer' || role === 'owner'
      ? onSnapshot(query(workoutsRef,orderBy('orderIndex','asc')),s=>setWorkouts(s.docs.map(d=>({id:d.id,...d.data()}))))
      : onSnapshot(query(workoutsRef,where('assignedTo','==',identifier),orderBy('orderIndex','asc')),s=>setWorkouts(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u3 = role === 'trainer' || role === 'owner'
      ? onSnapshot(logsRef,s=>setAllLogs(s.docs.map(d=>({id:d.id,...d.data()}))))
      : onSnapshot(query(logsRef,where('clientName','==',identifier)),s=>setAllLogs(s.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u1();u2();u3();};
  },[user,authStep,identifier,role]);

  const clientName=clientRegistry[identifier]?.name||identifier;
  const doLogin=async()=>{
    if(!email.trim()||!password)return;
    setLoginError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth,email.trim(),password);
    } catch(e) {
      console.error(e);
      setLoginError('Invalid email or password.');
      setIsLoading(false);
    }
  };

  const startPhoneLogin = async () => {
    if(!phone.trim()) return;
    setLoginError('');
    setIsLoading(true);
    try {
      sessionStorage.setItem('gofit_client_phone', phone.trim());
      await signInAnonymously(auth);
    } catch(e) {
      console.error(e);
      setLoginError('Could not enter with this phone number.');
      setIsLoading(false);
    }
  };

  if(isLoading)return(
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <p className="text-emerald-400 font-black text-3xl uppercase tracking-[0.3em]">GoFit</p>
        <p className="text-emerald-600 font-black text-sm uppercase tracking-[0.3em] mt-1 animate-pulse">Loading...</p>
      </div>
    </div>
  );

  if(authStep==='login')return(
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-black">
      <div className="w-full max-w-[320px] rounded-[2.5rem] shadow-2xl overflow-hidden border-[5px] border-slate-800 bg-white">
        <div className="bg-slate-900 py-8 px-6 text-center">
          <span className="text-emerald-400 font-black text-4xl uppercase tracking-tight">GoFit</span>
        </div>
        <div className="p-7 space-y-5">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 rounded-2xl p-1">
            <button onClick={()=>setLoginMode('client')} className={`py-2 rounded-xl text-xs font-black uppercase ${loginMode==='client'?'bg-white text-slate-900 shadow':'text-slate-400'}`}>Client</button>
            <button onClick={()=>setLoginMode('trainer')} className={`py-2 rounded-xl text-xs font-black uppercase ${loginMode==='trainer'?'bg-white text-slate-900 shadow':'text-slate-400'}`}>Trainer</button>
          </div>

          {loginMode==='client'?(
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase block tracking-widest text-slate-400">Phone Number</label>
                <input type="tel" placeholder="Client phone" value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==='Enter'&&startPhoneLogin()}
                  className="w-full p-4 border-2 rounded-2xl text-center font-black text-base outline-none focus:border-emerald-500 transition-all bg-slate-50 border-slate-200 text-slate-900"/>
              </div>
            </>
          ):(
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase block tracking-widest text-slate-400">Email</label>
                <input type="email" placeholder="name@gofit.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()}
                  className="w-full p-4 border-2 rounded-2xl text-center font-black text-base outline-none focus:border-emerald-500 transition-all bg-slate-50 border-slate-200 text-slate-900"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase block tracking-widest text-slate-400">Password</label>
                <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()}
                  className="w-full p-4 border-2 rounded-2xl text-center font-black text-base outline-none focus:border-emerald-500 transition-all bg-slate-50 border-slate-200 text-slate-900"/>
              </div>
            </>
          )}
          {loginError&&<p className="text-[11px] font-black text-red-500 text-center leading-relaxed">{loginError}</p>}
          <button onClick={loginMode==='client' ? startPhoneLogin : doLogin} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-xl shadow-xl uppercase active:scale-95 transition-all border-b-4 border-slate-800 active:border-b-0">
            Login
          </button>
        </div>
      </div>
    </div>
  );

  return(
    <div className="min-h-screen font-black bg-slate-50 text-slate-900">
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-slate-900 px-5 py-3 shadow-2xl border-b-4 border-emerald-500/20 transition-transform duration-300 ${navVisible?'translate-y-0':'-translate-y-full'}`}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-7 bg-emerald-500 rounded-full shadow-[0_0_12px_#10b981]"/>
            <span className="text-emerald-400 font-black text-2xl uppercase tracking-tight">GoFit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-black text-xs uppercase hidden md:block max-w-[120px] truncate">{titleCase(clientName)}</span>
            <button onClick={()=>{sessionStorage.removeItem('gofit_client_phone');signOut(auth);}} className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase">Logout</button>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-4 pt-20">
{(role==='trainer'||role==='owner')
  ?<TrainerDashboard workouts={workouts} logs={allLogs} db={db} appId={APP_ID} clientNames={clientRegistry}/>
  :<ClientView workouts={workouts.filter(w=>w.assignedTo===identifier)} db={db} appId={APP_ID} identifier={identifier} allLogs={allLogs}/>
}
      </main>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar,.scrollbar-hide::-webkit-scrollbar{display:none}
        .hide-scrollbar,.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
        .animate-fade-in{animation:fadeIn 0.3s ease-out}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}
