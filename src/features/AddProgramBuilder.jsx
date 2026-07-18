import React, { useState, useMemo } from 'react';
import { addDoc, deleteDoc, doc, collection } from 'firebase/firestore';
import { CATEGORIES, MUSCLE_GROUPS } from '../services/firebase/config';
import { getExerciseMuscle } from '../utils/formatters';
import { ClientSelector } from './ClientSelector';
import { SearchableDropdown } from '../components/ui/SearchableDropdown';
import { ExerciseEditRow } from './DayBuilder';
import { generateAutoDayItems, buildNasmCategoryCounts } from '../engines/autoGenerate';

const CATEGORY_LABELS = {
  'WARM-UP': 'Warm-Up',
  'ACTIVATION': 'Activation',
  'SKILL': 'Skill',
  'RESISTANCE': 'Resistance',
  'CARDIO': 'Cardio',
  'COOL-DOWN': 'Static Stretches',
};

export function AddProgramBuilder({ workouts, db, appId, clientNames, libraryData }) {
  const [targetClient, setTargetClient] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [sessionName, setSessionName]   = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [generating, setGenerating]     = useState(false);
  const [addingTo, setAddingTo]         = useState(null);

  const bg  = 'bg-white border-slate-200';
  const tx  = 'text-slate-900';
  const sub = 'text-slate-500';
  const inp = 'bg-slate-50 border-slate-200';

  const weeksList = useMemo(() => {
    if (!targetClient) return [];
    return [...new Set(workouts.filter(w => w.assignedTo === targetClient).map(w => w.week || 'Week 1'))]
      .sort((a, b) => (parseInt(a.match(/\d+/)?.[0]) || 0) - (parseInt(b.match(/\d+/)?.[0]) || 0));
  }, [workouts, targetClient]);

  const daysList = useMemo(() => {
    if (!targetClient || !selectedWeek) return [];
    return [...new Set(workouts.filter(w => w.assignedTo === targetClient && (w.week || 'Week 1') === selectedWeek).map(w => w.day))]
      .filter(Boolean)
      .sort((a, b) => (parseInt(a.match(/\d+/)?.[0]) || 999) - (parseInt(b.match(/\d+/)?.[0]) || 999));
  }, [workouts, targetClient, selectedWeek]);

  const dayExercises = useMemo(() => {
    if (!targetClient || !selectedWeek || !sessionName) return [];
    return workouts
      .filter(w => w.assignedTo === targetClient && (w.week || 'Week 1') === selectedWeek && w.day === sessionName)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [workouts, targetClient, selectedWeek, sessionName]);

  const handleNewWeek = () => {
    if (!targetClient) { alert('Select a client first'); return; }
    const max = weeksList.reduce((m, w) => Math.max(m, parseInt(w.match(/\d+/)?.[0]) || 0), 0);
    setSelectedWeek(`Week ${max + 1}`);
    setSessionName('');
  };

  const handleNewDay = () => {
    if (!selectedWeek) { alert('Select or create a week first'); return; }
    const max = daysList.reduce((m, d) => Math.max(m, parseInt((d || '').match(/\d+/)?.[0]) || 0), 0);
    setSessionName(`Day ${max + 1}`);
  };

  const handleAutoGenerate = async () => {
    if (!targetClient || !selectedWeek || !sessionName) { alert('Select client, week and day first'); return; }
    if (dayExercises.length && !window.confirm(`This will delete ${dayExercises.length} existing exercise(s) in ${sessionName} and replace them. Continue?`)) return;
    setGenerating(true);
    for (const ex of dayExercises) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', ex.id));
    const client = clientNames[targetClient] || {};
    const counts = buildNasmCategoryCounts({ goal: client.goal, phase: client.nasm_phase || 1 });
    const coachNote = [
      client.injuries ? `Respect injury notes: ${client.injuries}` : '',
      client.goal ? `Goal focus: ${client.goal}` : '',
      `NASM phase ${client.nasm_phase || 1}`,
    ].filter(Boolean).join(' · ');
    const items = generateAutoDayItems(libraryData, { muscleFilter, categoryCounts: counts, coachNote });
    if (!items.length) { alert('Library is empty or has no matching exercises'); setGenerating(false); return; }
    const base = Date.now();
    for (let i = 0; i < items.length; i++) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'workouts'), {
        ...items[i], assignedTo: targetClient, week: selectedWeek, day: sessionName, orderIndex: base + i,
      });
    }
    setGenerating(false);
  };

  const handleAddToCategory = async (category, exerciseName) => {
    const libEx = libraryData.find(l => l.name === exerciseName);
    if (!libEx) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'workouts'), {
      name: libEx.name, category, muscleGroup: getExerciseMuscle(libEx), gifUrl: libEx.gifUrl || '',
      sets: '3', reps: '10', tempo: '', coachNote: '', alternatives: libEx.alternatives || [],
      assignedTo: targetClient, week: selectedWeek, day: sessionName, orderIndex: Date.now(),
    });
    setAddingTo(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-black">
      {/* LEFT: Target + Generator */}
      <div className="md:col-span-1 space-y-4">
        <div className={`${bg} border-2 p-5 rounded-[2rem] shadow-xl space-y-3`}>
          <h3 className={`font-black text-sm ${tx}`}>Target Destination</h3>
          <ClientSelector
            clientNames={clientNames}
            value={targetClient}
            onChange={v => { setTargetClient(v); setSelectedWeek(''); setSessionName(''); }}
            placeholder="Select Client..."
          />
          <div className="flex gap-2">
            <select value={selectedWeek} onChange={e => { setSelectedWeek(e.target.value); setSessionName(''); }} disabled={!targetClient}
              className={`flex-1 p-2.5 border-2 rounded-xl font-black text-xs outline-none focus:border-emerald-500 disabled:opacity-40 ${inp}`}>
              <option value="">Select Week...</option>
              {weeksList.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <button onClick={handleNewWeek} disabled={!targetClient} className="bg-emerald-500 text-white px-3 rounded-xl font-black text-xs disabled:opacity-40">+ Week</button>
          </div>
          <div className="flex gap-2">
            <select value={sessionName} onChange={e => setSessionName(e.target.value)} disabled={!selectedWeek}
              className={`flex-1 p-2.5 border-2 rounded-xl font-black text-xs outline-none focus:border-emerald-500 disabled:opacity-40 ${inp}`}>
              <option value="">Select Day...</option>
              {daysList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={handleNewDay} disabled={!selectedWeek} className="bg-emerald-500 text-white px-3 rounded-xl font-black text-xs disabled:opacity-40">+ Day</button>
          </div>
          <select value={muscleFilter} onChange={e => setMuscleFilter(e.target.value)}
            className={`w-full p-2.5 border-2 rounded-xl font-black text-xs outline-none focus:border-emerald-500 ${inp}`}>
            <option value="">All Muscles (Resistance/Skill)</option>
            {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className={`${bg} border-2 p-5 rounded-[2rem] shadow-xl text-center`}>
          <h3 className={`font-black text-sm ${tx} mb-2`}>NASM Auto-Generator</h3>
          <p className="text-[11px] font-black text-slate-400 mb-3">Warm-Up, Activation, Skill, Resistance, Cardio, Static Stretches — built only from your library</p>
          <button onClick={handleAutoGenerate} disabled={generating || !targetClient || !selectedWeek || !sessionName}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40">
            {generating ? 'Generating...' : '⚡ Auto-Generate Day'}
          </button>
        </div>
      </div>

      {/* RIGHT: Generated / editable day */}
      <div className="md:col-span-2 space-y-3">
        {!sessionName ? (
          <div className={`${bg} border-2 border-dashed p-10 rounded-[2rem] text-center`}>
            <p className={`font-black text-sm ${sub}`}>Select client, week and day to start</p>
          </div>
        ) : (
          CATEGORIES.map(cat => {
            const exercises = dayExercises.filter(ex => ex.category === cat);
            return (
              <div key={cat} className={`${bg} border-2 rounded-2xl`}>
                <div className="bg-slate-900 rounded-t-2xl px-4 py-2.5 flex justify-between items-center">
                  <span className="font-black text-xs text-emerald-400 uppercase">{CATEGORY_LABELS[cat]}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded">{exercises.length} Exercise(s)</span>
                </div>
                <div className="p-3 space-y-2">
                  {exercises.map((ex, idx, arr) => (
                    <ExerciseEditRow key={ex.id} exercise={ex} idx={idx} arr={arr} db={db} appId={appId} libraryData={libraryData} />
                  ))}
                  {exercises.length === 0 && <p className="text-[11px] font-black text-slate-400 text-center py-2">No exercises in this phase</p>}
                  {addingTo === cat ? (
                    <div className="flex gap-1 items-center">
                      <div className="flex-1">
                        <SearchableDropdown options={libraryData.filter(l => l.category === cat)} value="" onChange={v => handleAddToCategory(cat, v)} placeholder={`Add ${CATEGORY_LABELS[cat]} exercise...`} allowNew={false} />
                      </div>
                      <button onClick={() => setAddingTo(null)} className="text-slate-400 font-black text-xs px-2">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingTo(cat)} className="w-full p-2 bg-slate-50 text-[11px] font-black text-emerald-600 hover:bg-slate-100 transition-all border border-slate-100 rounded-xl">+ Add Exercise</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
