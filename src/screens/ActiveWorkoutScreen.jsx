import { useState, useEffect, useMemo } from 'react';
import { addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';
import { HIITTimer } from '../components/shared/HIITTimer';
import { StretchTimer } from '../components/shared/StretchTimer';
import { SendNoteBox } from '../components/shared/SendNoteBox';

// WARM-UP, STATIC STRETCHES, COOL-DOWN → DONE-only, no kg/reps
const NO_LOG_CATS = new Set(['WARM-UP', 'STATIC STRETCHES', 'COOL-DOWN']);

// لينكات يوتيوب اتحفظت من غير https:// كانت بتتفسّر كمسار داخلي فترجّع للـ Home
function openVideo(url) {
  if (!url) return;
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  window.open(href, '_blank', 'noopener,noreferrer');
}

function fmtDate(ts) {
  const d = ts?.toDate?.();
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Spin Questions: إحساس سريع بدل سلايدر RPE 1-10
const SPIN_QUESTIONS = [
  { emoji: '😊', label: 'Easy',     rpe: 5 },
  { emoji: '😐', label: 'Moderate', rpe: 7 },
  { emoji: '😩', label: 'Hard',     rpe: 9 },
];

function initPhases(raw) {
  return JSON.parse(JSON.stringify(raw)).map(ph => ({
    ...ph,
    exercises: ph.exercises.map(ex => ({
      ...ex,
      setsData: Array.from({ length: Number(ex.targetSets) || 1 }, () => ({
        weight: '',
        reps: String(ex.targetReps || ''),
      })),
    })),
  }));
}

export default function ActiveWorkoutScreen({ navigate, goBack, params = {}, sessionPhases = [], identifier = '', checkIns = [], onEndWorkout }) {
  const [phases,   setPhases]   = useState(() => initPhases(sessionPhases));
  const [gifModal, setGifModal] = useState(null);
  const [altSearch, setAltSearch] = useState({});
  const [showRecap, setShowRecap] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const latestCheckIn = checkIns[0];
  const readiness = Number(latestCheckIn?.readiness);

  // listener حي زي اللي شغال في Progress (بدل getDocs مرة واحدة كان بيفشل بصمت
  // لو الاتصال/الـ auth لسه بيتظبط، فيفضل historyLogs = [] للأبد → "No previous record" غلط)
  useEffect(() => {
    if (!identifier) return;
    const u = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'),
        where('clientName', '==', identifier),
        orderBy('completedAt', 'desc')
      ),
      snap => { setHistoryLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setHistoryLoading(false); },
      e => { console.error('history listener failed:', e); setHistoryLoading(false); }
    );
    return () => u();
  }, [identifier]);

  // يعمل init مرة واحدة فقط لكل جلسة (لا يتأثر بتحديثات logs الحية)
  useEffect(() => {
    setPhases(initPhases(sessionPhases));
  }, [identifier, params.day, params.weekId]);

  function togglePhase(id) {
    setPhases(p => p.map(ph => ph.id === id ? { ...ph, isExpanded: !ph.isExpanded } : ph));
  }

  function updateSet(phaseId, exId, si, field, value) {
    setPhases(p => p.map(ph => ph.id !== phaseId ? ph : {
      ...ph,
      exercises: ph.exercises.map(e => {
        if (e.id !== exId) return e;
        const s = [...e.setsData];
        s[si] = { ...s[si], [field]: value };
        return { ...e, setsData: s };
      }),
    }));
  }

  // اختيار RPE للتمرين (من Spin Questions)
  function updateExRpe(phaseId, exId, value) {
    setPhases(p => p.map(ph => ph.id !== phaseId ? ph : {
      ...ph,
      exercises: ph.exercises.map(e => e.id !== exId ? e : { ...e, rpe: value }),
    }));
  }

  // تحديث عدد جولات HIIT المنجزة حاليًا (لدعم زر SAVE اليدوي)
  function updateExRound(phaseId, exId, roundNow) {
    setPhases(p => p.map(ph => ph.id !== phaseId ? ph : {
      ...ph,
      exercises: ph.exercises.map(e => e.id !== exId ? e : { ...e, currentRound: roundNow }),
    }));
  }

  function toggleAlt(phaseId, exId) {
    setPhases(p => p.map(ph => ph.id !== phaseId ? ph : {
      ...ph,
      exercises: ph.exercises.map(e => e.id !== exId ? e : { ...e, altOpen: !e.altOpen }),
    }));
  }

  function selectAlt(phaseId, exId, alt) {
    setPhases(p => p.map(ph => ph.id !== phaseId ? ph : {
      ...ph,
      exercises: ph.exercises.map(e => e.id !== exId ? e : {
        ...e,
        originalExerciseName: e.originalExerciseName || e.name,
        name: alt.name, gifUrl: alt.gifUrl, videoUrl: alt.videoUrl || '',
        tempo: alt.tempo, targetSets: alt.targetSets,
        targetReps: alt.targetReps, unit: alt.unit,
        setsData: Array.from({ length: Number(alt.targetSets) || 1 }, () => ({
          weight: '', reps: String(alt.targetReps || ''),
        })),
        altOpen: false,
      }),
    }));
  }

  // 6.md CRITICAL FIX: only collapse+advance when EVERY exercise in phase is non-pending
  function autoAdvance(next, phaseId) {
    const phIdx = next.findIndex(ph => ph.id === phaseId);
    if (phIdx < 0) return;
    const allCompleted = next[phIdx].exercises.every(e => e.status !== 'pending');
    // If NOT all completed → do nothing, leave accordion open
    if (!allCompleted) return;
    if (phIdx < next.length - 1) {
      setTimeout(() => {
        setPhases(p => p.map((ph2, i) => ({
          ...ph2,
          isExpanded: i === phIdx ? false : i === phIdx + 1 ? true : ph2.isExpanded,
        })));
      }, 800);
    }
  }

  // 6.md: undo → back to pending + reset setsData
  function undoEx(phaseId, exId) {
    setPhases(p => p.map(ph => ph.id !== phaseId ? ph : {
      ...ph,
      exercises: ph.exercises.map(e => e.id !== exId ? e : {
        ...e,
        status: 'pending',
        setsData: Array.from({ length: Number(e.targetSets) || 1 }, () => ({
          weight: '', reps: String(e.targetReps || ''),
        })),
      }),
    }));
  }

  async function saveEx(phaseId, exId) {
    // Update status first, then check autoAdvance on the resulting state
    setPhases(prev => {
      const next = prev.map(ph => ph.id !== phaseId ? ph : {
        ...ph,
        exercises: ph.exercises.map(e =>
          e.id !== exId ? e : { ...e, status: 'saved', altOpen: false }
        ),
      });
      autoAdvance(next, phaseId); // only fires if all done
      return next;
    });

    try {
      const phase = phases.find(ph => ph.id === phaseId);
      const ex    = phase?.exercises.find(e => e.id === exId);
      if (!ex || !identifier) return;
      const setsData = (ex.setsData || []).map(s => ({
        weight: String(parseFloat(s.weight) || 0),
        reps:   String(parseFloat(s.reps)   || 0),
        done:   true,
      }));
      const maxW     = Math.max(...setsData.map(s => parseFloat(s.weight) || 0), 0);
      const totalVol = setsData.reduce((a, s) =>
        a + (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0), 0);
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), {
        exerciseId:           ex.id,
        clientName:           identifier,
        exerciseName:         ex.name,
        category:             ex.category,
        setsData,
        maxWeight:            maxW,
        volume:               totalVol,
        rpe:                  ex.rpe ? Number(ex.rpe) : null,
        isPR:                 false,
        isAlternative:        !!ex.originalExerciseName,
        originalExerciseName: ex.originalExerciseName || null,
        completedAt:          serverTimestamp(),
      });
    } catch (e) { console.error('log write failed:', e); }
  }

  // تسجيل تمرين HIIT بمعيار Work/Rest بدل كيلو/تكرار
  async function saveHiitEx(phaseId, exId, roundsCompleted) {
    setPhases(prev => {
      const next = prev.map(ph => ph.id !== phaseId ? ph : {
        ...ph,
        exercises: ph.exercises.map(e =>
          e.id !== exId ? e : { ...e, status: 'saved', altOpen: false }
        ),
      });
      autoAdvance(next, phaseId);
      return next;
    });

    try {
      const phase = phases.find(ph => ph.id === phaseId);
      const ex    = phase?.exercises.find(e => e.id === exId);
      if (!ex || !identifier) return;
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), {
        exerciseId:      ex.id,
        clientName:      identifier,
        exerciseName:    ex.name,
        category:        'HIIT',
        workSeconds:     ex.workSeconds || 30,
        restSeconds:     ex.restSeconds || 15,
        roundsCompleted: roundsCompleted || ex.rounds || 0,
        isPR:            false,
        isAlternative:   !!ex.originalExerciseName,
        originalExerciseName: ex.originalExerciseName || null,
        completedAt:     serverTimestamp(),
      });
    } catch (e) { console.error('log write failed:', e); }
  }

  // Static Stretches: تكتمل بالتايمر مباشرة، من غير كتابة Firestore (مفيش وزن/تكرار يتسجل)
  function finishStretch(phaseId, exId) {
    setPhases(prev => {
      const next = prev.map(ph => ph.id !== phaseId ? ph : {
        ...ph,
        exercises: ph.exercises.map(e => e.id !== exId ? e : { ...e, status: 'saved' }),
      });
      autoAdvance(next, phaseId);
      return next;
    });
  }

  function skipEx(phaseId, exId) {
    setPhases(prev => {
      const next = prev.map(ph => ph.id !== phaseId ? ph : {
        ...ph,
        exercises: ph.exercises.map(e =>
          e.id !== exId ? e : { ...e, status: 'skipped', altOpen: false }
        ),
      });
      autoAdvance(next, phaseId);
      return next;
    });
  }

  // تمارين خطة اليوم (أسماء فريدة) لعرض الـ Records الخاصة بيها فقط
  const dayExerciseNames = useMemo(() => {
    const names = phases.flatMap(ph => ph.exercises || [])
      .filter(ex => ex.category !== 'HIIT') // HIIT مالوش كيلو/تكرار يتسجل في الـ History
      .map(ex => ex.name);
    return [...new Set(names)];
  }, [phases]);

  // لكل تمرين في خطة اليوم: أفضل سجل سابق (Record) من Firestore، إن وُجد
  const dayHistory = useMemo(() => {
    return dayExerciseNames.map(name => {
      const logsForEx = historyLogs.filter(l => l.exerciseName === name);
      if (!logsForEx.length) return { name, record: null };
      const isHiit = logsForEx[0].category === 'HIIT';
      const best = isHiit
        ? logsForEx[0] // أحدث محاولة HIIT (logs مرتبة desc أصلاً)
        : logsForEx.reduce((a, b) => (b.maxWeight || 0) > (a.maxWeight || 0) ? b : a);
      return { name, record: best, isHiit };
    });
  }, [dayExerciseNames, historyLogs]);

  const recap = useMemo(() => {
    const flat = phases.flatMap(ph => ph.exercises || []);
    const completed = flat.filter(ex => ex.status === 'saved');
    const skipped = flat.filter(ex => ex.status === 'skipped');
    const maxWeight = completed.reduce((m, ex) => {
      const exMax = Math.max(...(ex.setsData || []).map(s => parseFloat(s.weight) || 0), 0);
      return Math.max(m, exMax);
    }, 0);
    const totalVolume = completed.reduce((sum, ex) => {
      return sum + (ex.setsData || []).reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0), 0);
    }, 0);
    return { completed: completed.length, skipped: skipped.length, maxWeight, totalVolume };
  }, [phases]);

  if (!phases.length) {
    return (
      <div className="min-h-screen bg-[#1E293B] max-w-sm mx-auto flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400 font-semibold">No exercises for this day</p>
        <button onClick={goBack} className="text-blue-400 font-bold">← Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E293B] max-w-sm mx-auto flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A50] sticky top-0 bg-[#1E293B] z-10">
        <button onClick={goBack} className="text-white text-2xl leading-none">‹</button>
        <span className="text-white font-bold text-lg">{params.day || params.type || 'Workout'}</span>
        <button
          onClick={() => setShowHistory(true)}
          className="text-slate-300 text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-[#2A2A50] hover:bg-[#343465] transition-colors"
        >
          History
        </button>
      </div>

      {!Number.isNaN(readiness) && (
        <div className={`mx-3 mt-3 rounded-2xl px-4 py-3 text-xs font-black ${readiness >= 70 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : readiness >= 45 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
          {readiness >= 70 ? 'Readiness is strong. Keep progressing if form stays clean.' : readiness >= 45 ? 'Moderate readiness. Control tempo and loads.' : 'Low readiness. Consider reducing load or stopping early if needed.'}
        </div>
      )}

      {/* Phases */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 pb-28">
        {phases.map(phase => (
          <div key={phase.id} className="rounded-2xl overflow-hidden border border-[#2A2A50]">

            <button
              onClick={() => togglePhase(phase.id)}
              className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors
                ${phase.isExpanded ? 'bg-[#252545]' : 'bg-[#14142B]'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-white font-black text-sm tracking-wider">{phase.title}</span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {phase.exercises?.length ?? 0}
                </span>
              </div>
              <span className="text-slate-400 text-xs">{phase.isExpanded ? '▲' : '▼'}</span>
            </button>

            {phase.isExpanded && (
              <div className="bg-[#1E293B] p-2 space-y-2">
                {phase.exercises.map((ex, exIdx) => {
                  const isDone = ex.status === 'saved';
                  const isSkip = ex.status === 'skipped';
                  const isHiit = ex.category === 'HIIT';
                  const isStretch = ex.category === 'STATIC STRETCHES';
                  // per-exercise noLog check on category
                  const noLog  = NO_LOG_CATS.has(ex.category) || NO_LOG_CATS.has(phase.title);

                  return (
                    <div key={ex.id} className={`rounded-2xl border p-4 transition-all
                      ${isDone ? 'opacity-70 bg-green-50 border-green-300'
                      : isSkip ? 'opacity-50 bg-slate-50 border-slate-200'
                      :          'bg-white border-slate-200'}`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Fix 3: high-contrast numbered badge */}
                          <span className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center shrink-0">
                            <span className="text-white text-[10px] font-bold">{exIdx + 1}</span>
                          </span>
                          <span className="font-black text-slate-900 text-sm flex-1 leading-snug">{ex.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* 6.md: Undo — visible orange pill, only when done/skipped */}
                          {ex.status !== 'pending' && (
                            <button
                              onClick={() => undoEx(phase.id, ex.id)}
                              className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                            >
                              ↺ Undo
                            </button>
                          )}
                          {ex.gifUrl && ex.status === 'pending' && !isStretch && (
                            <button
                              onClick={() => setGifModal(ex.gifUrl)}
                              className="bg-slate-100 text-blue-600 text-[10px] font-black px-2 py-1 rounded-lg border border-slate-200 hover:bg-blue-50 transition-colors"
                            >
                              GIF ▶
                            </button>
                          )}
                          {ex.videoUrl && ex.status === 'pending' && (
                            <button
                              onClick={() => openVideo(ex.videoUrl)}
                              className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center shrink-0"
                              title="Watch on YouTube"
                            >
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M10 15.5l6-3.5-6-3.5v7z"/><path d="M21.6 7.2c-.2-1-1-1.7-2-1.9C17.9 5 12 5 12 5s-5.9 0-7.6.3c-1 .2-1.8.9-2 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8c.2 1 1 1.7 2 1.9C6.1 19 12 19 12 19s5.9 0 7.6-.3c1-.2 1.8-.9 2-1.9.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8z"/></svg>
                            </button>
                          )}
                          {ex.alternatives?.length > 0 && ex.status === 'pending' && (
                            <button
                              onClick={() => toggleAlt(phase.id, ex.id)}
                              className="bg-blue-100 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-lg"
                            >
                              ALT {ex.altOpen ? '▲' : '▾'}
                            </button>
                          )}
                        </div>
                      </div>

                      {ex.originalExerciseName && (
                        <p className="text-xs text-slate-400 italic mb-2">
                          Alternative to: {ex.originalExerciseName}
                        </p>
                      )}

                      {/* ALT Dropdown */}
                      {ex.altOpen && (
                        <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/60 overflow-hidden">
                          <div className="px-3 py-2 border-b border-blue-100">
                            <input
                              type="text"
                              placeholder="Search alternatives..."
                              value={altSearch[ex.id] || ''}
                              onChange={e => setAltSearch(p => ({ ...p, [ex.id]: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400"
                            />
                          </div>
                          {ex.alternatives
                            .filter(a => a.name.toLowerCase().includes((altSearch[ex.id] || '').toLowerCase()))
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(alt => (
                              <button key={alt.id} onClick={() => selectAlt(phase.id, ex.id, alt)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-blue-100 last:border-0 hover:bg-blue-100 transition-colors text-left"
                              >
                                {alt.gifUrl && <img src={alt.gifUrl} alt={alt.name} className="w-10 h-10 rounded-lg object-cover border border-blue-200 shrink-0" />}
                                <div>
                                  <p className="text-slate-900 text-xs font-bold">{alt.name}</p>
                                  <p className="text-slate-400 text-[10px]">{alt.targetSets}×{alt.targetReps} {alt.unit}{alt.tempo ? ` · ${alt.tempo}` : ''}</p>
                                </div>
                              </button>
                            ))}
                        </div>
                      )}

                      {/* Metadata Pills */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">📁 {ex.category}</span>
                        {ex.tempo && !isHiit && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">Tempo: {ex.tempo}</span>}
                        {isHiit
                          ? <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">{ex.workSeconds}s work / {ex.restSeconds}s rest × {ex.rounds}</span>
                          : <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">{ex.targetSets}×{ex.targetReps} {ex.unit}</span>
                        }
                        {ex.coachNote && <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-md">💬 {ex.coachNote}</span>}
                      </div>

                      {/* PR badges — Resistance only, motivational reference */}
                      {ex.category === 'RESISTANCE' && (ex.bestReps > 0 || ex.bestWeight > 0) && (
                        <div className="flex gap-2 mb-3">
                          {ex.bestReps > 0 && (
                            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-2 py-1.5 text-center">
                              <p className="text-amber-600 text-[9px] font-bold uppercase tracking-wide">🏆 Best Reps</p>
                              <p className="text-amber-700 text-sm font-black">{ex.bestReps}</p>
                            </div>
                          )}
                          {ex.bestWeight > 0 && (
                            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-2 py-1.5 text-center">
                              <p className="text-amber-600 text-[9px] font-bold uppercase tracking-wide">🏆 Max Weight</p>
                              <p className="text-amber-700 text-sm font-black">{ex.bestWeight} kg</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* HIIT: تايمر Work/Rest بدل كيلو/تكرار */}
                      {isHiit && ex.status === 'pending' && (
                        <div className="mb-3">
                          <HIITTimer
                            workSeconds={ex.workSeconds || 30}
                            restSeconds={ex.restSeconds || 15}
                            rounds={ex.rounds || 8}
                            onFinish={(roundsCompleted) => saveHiitEx(phase.id, ex.id, roundsCompleted)}
                            onRoundChange={(r) => updateExRound(phase.id, ex.id, r)}
                          />
                        </div>
                      )}

                      {/* Static Stretches: صورة GIF مصغرة + عداد 30 ثانية بدل DONE */}
                      {isStretch && ex.status === 'pending' && (
                        <div className="mb-3">
                          {ex.gifUrl && (
                            <button
                              onClick={() => setGifModal(ex.gifUrl)}
                              className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 mb-3"
                            >
                              <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" />
                            </button>
                          )}
                          <StretchTimer seconds={30} onFinish={() => finishStretch(phase.id, ex.id)} />
                        </div>
                      )}

                      {/* Multi-set inputs — hidden for noLog/HIIT categories */}
                      {!noLog && !isHiit && ex.status === 'pending' && (
                        <div className="space-y-2 mb-3">
                          {(ex.setsData || []).map((set, si) => (
                            <div key={si} className="flex items-center gap-2 w-full">
                              <span className="text-xs font-bold text-slate-500 w-10 shrink-0">Set {si + 1}</span>
                              <div className="flex items-center bg-slate-100 rounded-xl px-2 py-2 flex-1 min-w-0">
                                <input
                                  type="number" placeholder="0" value={set.weight}
                                  onChange={e => updateSet(phase.id, ex.id, si, 'weight', e.target.value)}
                                  className="bg-transparent w-full text-center outline-none text-sm font-bold text-slate-800"
                                />
                                <span className="text-slate-400 text-xs ml-1 shrink-0">kg</span>
                              </div>
                              <div className="flex items-center bg-slate-100 rounded-xl px-2 py-2 flex-1 min-w-0">
                                <input
                                  type="number" value={set.reps}
                                  onChange={e => updateSet(phase.id, ex.id, si, 'reps', e.target.value)}
                                  className="bg-transparent w-full text-center outline-none text-sm font-bold text-slate-800"
                                />
                                <span className="text-slate-400 text-xs ml-1 shrink-0">reps</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Spin Questions — إحساس سريع بدل RPE 1-10، مخفي للـ noLog/HIIT */}
                      {!noLog && !isHiit && ex.status === 'pending' && (
                        <div className="mb-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">How did it feel?</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {SPIN_QUESTIONS.map(q => (
                              <button
                                key={q.rpe}
                                type="button"
                                onClick={() => updateExRpe(phase.id, ex.id, ex.rpe === q.rpe ? null : q.rpe)}
                                className={`py-2 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition-colors
                                  ${ex.rpe === q.rpe ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                              >
                                <span className="text-lg leading-none">{q.emoji}</span>
                                {q.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {ex.status === 'pending' ? (
                        !isHiit && !isStretch && (
                          <div className="flex gap-2 mb-3">
                            {noLog ? (
                              // DONE-only for stretch/warmup/cooldown
                              <button
                                onClick={() => saveEx(phase.id, ex.id)}
                                className="w-full bg-[#1a2332] hover:bg-slate-800 text-white text-sm font-black py-3 rounded-xl transition-colors border border-slate-700"
                              >
                                DONE
                              </button>
                            ) : (
                              <>
                                <button onClick={() => saveEx(phase.id, ex.id)}
                                  className="flex-1 bg-[#1C1C38] text-white text-xs font-black py-2.5 rounded-xl hover:bg-[#2A2A50] transition-colors">
                                  SAVE
                                </button>
                                <button onClick={() => skipEx(phase.id, ex.id)}
                                  className="flex-1 bg-slate-100 text-slate-500 text-xs font-black py-2.5 rounded-xl hover:bg-slate-200 transition-colors">
                                  SKIP
                                </button>
                              </>
                            )}
                          </div>
                        )
                      ) : (
                        <div className={`text-center text-xs font-black py-2 rounded-xl mb-3
                          ${isDone ? 'bg-green-500/20 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          {isDone ? '✓ SAVED' : '⊘ SKIPPED'}
                        </div>
                      )}

                      {/* HIIT: تسجيل تلقائي عند اكتمال التايمر (onFinish) — SKIP فقط يدوي */}
                      {isHiit && ex.status === 'pending' && (
                        <div className="flex gap-2 mb-1">
                          <button onClick={() => skipEx(phase.id, ex.id)}
                            className="w-full bg-slate-100 text-slate-500 text-xs font-black py-2.5 rounded-xl hover:bg-slate-200 transition-colors">
                            SKIP
                          </button>
                        </div>
                      )}

                      {/* Overload alert — hidden for noLog */}
                      {!noLog && ex.overloadMessage && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                          <p className="text-blue-500 text-[10px] font-semibold leading-relaxed">{ex.overloadMessage}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* End Workout */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm px-14 pb-8 pt-2 bg-[#1E293B]">
        <button
          onClick={() => setShowRecap(true)}
          className="w-full bg-red-500 hover:bg-red-600 active:scale-95 rounded-2xl py-4 text-white font-bold text-lg transition-all"
        >
          End Workout
        </button>
      </div>

      {showRecap && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-2xl border-2 border-slate-100 space-y-4">
            <div className="text-center">
              <p className="text-3xl font-black text-slate-900">Session Recap</p>
              <p className="text-xs font-black text-slate-400 uppercase mt-1">{params.day || 'Workout Complete'}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-black text-emerald-500">{recap.completed}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Done</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-black text-amber-500">{recap.skipped}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Skipped</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-black text-blue-500">{Math.round(recap.totalVolume)}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Volume</p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Top Load</p>
              <p className="text-2xl font-black text-slate-900">{recap.maxWeight} kg</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRecap(false)}
                className="flex-1 rounded-2xl bg-slate-100 text-slate-700 py-3 font-black text-sm"
              >
                Review
              </button>
              <button
                onClick={() => onEndWorkout ? onEndWorkout(recap) : navigate('Home')}
                className="flex-1 rounded-2xl bg-emerald-500 text-slate-900 py-3 font-black text-sm"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal — تمارين اليوم المسجلة فقط */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setShowHistory(false)}>
          <div className="w-full max-w-sm bg-white rounded-t-[2rem] p-5 max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-900 text-lg font-black">{params.day || 'Today'} · History</p>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 text-xl leading-none">✕</button>
            </div>

            {historyLoading && (
              <p className="text-slate-400 text-sm font-semibold text-center py-8">Loading...</p>
            )}

            {!historyLoading && (
              <div className="space-y-2">
                {dayHistory.map(({ name, record, isHiit }) => (
                  <div key={name} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-slate-900 text-sm font-black">{name}</p>
                      {record?.completedAt && (
                        <span className="text-slate-400 text-[10px] font-bold">{fmtDate(record.completedAt)}</span>
                      )}
                    </div>
                    {!record ? (
                      <p className="text-slate-400 text-[11px] font-semibold">No previous record</p>
                    ) : isHiit ? (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        {record.workSeconds}s work / {record.restSeconds}s rest · {record.roundsCompleted} rounds
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(record.setsData || []).map((s, i) => (
                          <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            {s.weight}kg×{s.reps}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <SendNoteBox identifier={identifier} context={`day-history:${params.day || ''}`} theme="light" />
            </div>
          </div>
        </div>
      )}

      {/* GIF Modal */}
      {gifModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-6" onClick={() => setGifModal(null)}>
          <div className="relative max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setGifModal(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full text-slate-900 font-black text-sm shadow-lg flex items-center justify-center z-10">✕</button>
            <img src={gifModal} alt="Exercise form" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
