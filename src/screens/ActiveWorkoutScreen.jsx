import { useState, useEffect, useRef } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// WARM-UP, STATIC STRETCHES, COOL-DOWN → DONE-only, no kg/reps
const NO_LOG_CATS = new Set(['WARM-UP', 'STATIC STRETCHES', 'COOL-DOWN']);

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

export default function ActiveWorkoutScreen({ navigate, goBack, params = {}, sessionPhases = [], identifier = '', onEndWorkout }) {
  const [phases,   setPhases]   = useState(() => initPhases(sessionPhases));
  const [elapsed,  setElapsed]  = useState(0);
  const [gifModal, setGifModal] = useState(null);
  const [altSearch, setAltSearch] = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    setPhases(initPhases(sessionPhases));
  }, [JSON.stringify(sessionPhases)]);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

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
        name: alt.name, gifUrl: alt.gifUrl,
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
        rpe:                  null,
        isPR:                 false,
        isAlternative:        !!ex.originalExerciseName,
        originalExerciseName: ex.originalExerciseName || null,
        completedAt:          serverTimestamp(),
      });
    } catch (e) { console.error('log write failed:', e); }
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
        <span className="text-[#00D4AA] font-bold tabular-nums">{fmt(elapsed)}</span>
      </div>

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
                          {ex.gifUrl && ex.status === 'pending' && (
                            <button
                              onClick={() => setGifModal(ex.gifUrl)}
                              className="bg-slate-100 text-blue-600 text-[10px] font-black px-2 py-1 rounded-lg border border-slate-200 hover:bg-blue-50 transition-colors"
                            >
                              GIF ▶
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
                        {ex.tempo && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">Tempo: {ex.tempo}</span>}
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">{ex.targetSets}×{ex.targetReps} {ex.unit}</span>
                        {ex.coachNote && <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-md">💬 {ex.coachNote}</span>}
                      </div>

                      {/* Multi-set inputs — hidden for noLog categories */}
                      {!noLog && ex.status === 'pending' && (
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

                      {/* Action Buttons */}
                      {ex.status === 'pending' ? (
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
                      ) : (
                        <div className={`text-center text-xs font-black py-2 rounded-xl mb-3
                          ${isDone ? 'bg-green-500/20 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          {isDone ? '✓ SAVED' : '⊘ SKIPPED'}
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
          onClick={() => onEndWorkout ? onEndWorkout() : navigate('Home')}
          className="w-full bg-red-500 hover:bg-red-600 active:scale-95 rounded-2xl py-4 text-white font-bold text-lg transition-all"
        >
          End Workout
        </button>
      </div>

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