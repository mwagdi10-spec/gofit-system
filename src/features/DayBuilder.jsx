import React, { useState } from 'react';
import { updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getExerciseMuscle, formatName } from '../utils/formatters';
import { normalizeAlternatives, getFilledAlternatives, getAlternativeOptions, applySuggestedAlternatives } from '../utils/validators';
import { LinkifiedText } from '../components/shared/LinkifiedText';

let intervalUid = 0;
function newInterval() {
  intervalUid += 1;
  return { id: `iv-${Date.now()}-${intervalUid}`, label: '', seconds: 60 };
}

// محرر مراحل الـ Cardio Intervals (سرعة/شدة + مدة لكل مرحلة)
function IntervalsEditor({ intervals, onChange }) {
  const list = intervals?.length ? intervals : [];
  const addStage = () => onChange([...list, newInterval()]);
  const removeStage = (id) => onChange(list.filter(iv => iv.id !== id));
  const updateStage = (id, field, value) => onChange(list.map(iv => iv.id === id ? { ...iv, [field]: value } : iv));

  return (
    <div className="space-y-1.5 border border-slate-200 rounded-xl p-2 bg-white">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black text-slate-400 uppercase">Interval Stages</p>
        <button type="button" onClick={addStage} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-black text-[9px] uppercase hover:bg-emerald-500 hover:text-white transition-all">+ Stage</button>
      </div>
      {list.length === 0 && <p className="text-[10px] font-bold text-slate-400 text-center py-1">No stages yet</p>}
      {list.map((iv, i) => (
        <div key={iv.id} className="grid grid-cols-[1fr_60px_auto] gap-1 items-center">
          <input
            type="text" value={iv.label}
            onChange={e => updateStage(iv.id, 'label', e.target.value)}
            placeholder={`Speed ${i + 1} (e.g. 8km/h)`}
            className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-emerald-500 bg-slate-50"
          />
          <input
            type="number"
            value={Math.round((iv.seconds || 0) / 60 * 10) / 10}
            onChange={e => updateStage(iv.id, 'seconds', Math.max(1, Math.round((Number(e.target.value) || 0) * 60)))}
            placeholder="min"
            className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none text-center focus:border-emerald-500 bg-slate-50"
          />
          <button type="button" onClick={() => removeStage(iv.id)} className="text-red-400 font-black text-[10px] px-1 hover:text-red-600">✕</button>
        </div>
      ))}
    </div>
  );
}

export function ExerciseEditRow({ exercise, idx, arr, db, appId, libraryData = [] }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    ...exercise,
    workSeconds: exercise.workSeconds || 30,
    restSeconds: exercise.restSeconds || 15,
    rounds: exercise.rounds || 8,
    cardioMetric: exercise.cardioMetric || 'duration',
    targetDuration: exercise.targetDuration || 20,
    targetDistance: exercise.targetDistance || '',
    targetCalories: exercise.targetCalories || '',
    intervals: Array.isArray(exercise.intervals) ? exercise.intervals : [],
    videoUrl: exercise.videoUrl || '',
    alternatives: normalizeAlternatives(exercise.alternatives)
  });
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rowbg = 'bg-slate-50 border-slate-100';
  const tx = 'text-slate-900';
  const sub = 'text-slate-500';
  const isHiit = (formData.category || exercise.category) === 'HIIT';
  const isCardio = (formData.category || exercise.category) === 'CARDIO';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id),{
        name: formData.name,
        sets: formData.sets,
        reps: formData.reps,
        workSeconds: Number(formData.workSeconds) || 30,
        restSeconds: Number(formData.restSeconds) || 15,
        rounds: Number(formData.rounds) || 8,
        cardioMetric: formData.cardioMetric || 'duration',
        targetDuration: Number(formData.targetDuration) || 0,
        targetDistance: Number(formData.targetDistance) || 0,
        targetCalories: Number(formData.targetCalories) || 0,
        intervals: formData.cardioMetric === 'intervals' ? formData.intervals.filter(iv => iv.label.trim()) : [],
        tempo: formData.tempo,
        coachNote: formData.coachNote,
        category: formData.category,
        muscleGroup: formData.muscleGroup || getExerciseMuscle(formData),
        gifUrl: formData.gifUrl || '',
        videoUrl: formData.videoUrl || '',
        alternatives: getFilledAlternatives(formData.alternatives),
      });
      setEditMode(false);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  // swaps to a listed alternative, or a random exercise from the same category
  const handleSwap = async () => {
    const alts = getFilledAlternatives(exercise.alternatives).map(a=>a.name).filter(Boolean);
    const pool = alts.length
      ? libraryData.filter(l => alts.includes(l.name) && l.name !== exercise.name)
      : libraryData.filter(l => l.category === exercise.category && l.name !== exercise.name);
    if (!pool.length) { alert('No alternative available'); return; }
    const next = pool[Math.floor(Math.random()*pool.length)];
    await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id),{
      name: next.name,
      muscleGroup: getExerciseMuscle(next),
      gifUrl: next.gifUrl || '',
      videoUrl: next.videoUrl || '',
    });
  };

  // reorders arr: moves this row (idx) to wherever the pointer is released
  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (e) => {
    const hovered = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-exercise-idx]');
    document.querySelectorAll('[data-exercise-idx]').forEach(r=>r.classList.remove('ring-2','ring-emerald-400'));
    if (hovered && Number(hovered.dataset.exerciseIdx) !== idx) hovered.classList.add('ring-2','ring-emerald-400');
  };

  const handlePointerUp = async (e) => {
    setDragging(false);
    document.querySelectorAll('[data-exercise-idx]').forEach(r=>r.classList.remove('ring-2','ring-emerald-400'));
    const hovered = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-exercise-idx]');
    const targetIdx = hovered ? Number(hovered.dataset.exerciseIdx) : NaN;
    if (Number.isNaN(targetIdx) || targetIdx === idx) return;
    const reordered = [...arr];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const orderPool = arr.map(item => item.orderIndex);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].orderIndex !== orderPool[i]) {
        await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',reordered[i].id), { orderIndex: orderPool[i] });
      }
    }
  };

  return (
    <>
      {editMode?(
        <div className={`p-4 rounded-2xl border-2 gap-3 ${rowbg} space-y-2`}>
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="Exercise name" className="w-full p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white"/>
          {isHiit ? (
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={formData.workSeconds} onChange={e=>setFormData({...formData,workSeconds:e.target.value})} placeholder="Work(s)" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>
              <input type="number" value={formData.restSeconds} onChange={e=>setFormData({...formData,restSeconds:e.target.value})} placeholder="Rest(s)" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>
              <input type="number" value={formData.rounds} onChange={e=>setFormData({...formData,rounds:e.target.value})} placeholder="Rounds" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>
            </div>
          ) : isCardio ? (
            <div className="space-y-1.5">
              <select value={formData.cardioMetric} onChange={e=>setFormData({...formData,cardioMetric:e.target.value})} className="w-full p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white">
                <option value="duration">Duration (timer)</option>
                <option value="distance">Distance (km)</option>
                <option value="duration_distance">Duration + Distance</option>
                <option value="calories">Calories</option>
                <option value="intervals">Intervals (varying speed)</option>
              </select>
              {formData.cardioMetric === 'intervals' ? (
                <IntervalsEditor intervals={formData.intervals} onChange={iv => setFormData({...formData, intervals: iv})} />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {(formData.cardioMetric === 'duration' || formData.cardioMetric === 'duration_distance') && (
                    <input type="number" value={formData.targetDuration} onChange={e=>setFormData({...formData,targetDuration:e.target.value})} placeholder="Target (min)" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none text-center focus:border-emerald-500 bg-white"/>
                  )}
                  {(formData.cardioMetric === 'distance' || formData.cardioMetric === 'duration_distance') && (
                    <input type="number" value={formData.targetDistance} onChange={e=>setFormData({...formData,targetDistance:e.target.value})} placeholder="Target (km)" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none text-center focus:border-emerald-500 bg-white"/>
                  )}
                  {formData.cardioMetric === 'calories' && (
                    <input type="number" value={formData.targetCalories} onChange={e=>setFormData({...formData,targetCalories:e.target.value})} placeholder="Target (kcal)" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none text-center focus:border-emerald-500 bg-white"/>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={formData.sets} onChange={e=>setFormData({...formData,sets:e.target.value})} placeholder="Sets" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>
              <input type="text" value={formData.reps} onChange={e=>setFormData({...formData,reps:e.target.value})} placeholder="Reps" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>
              <input type="text" value={formData.tempo||''} onChange={e=>setFormData({...formData,tempo:e.target.value})} placeholder="Tempo" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>
            </div>
          )}
          <input type="text" value={formData.coachNote||''} onChange={e=>setFormData({...formData,coachNote:e.target.value})} placeholder="Coach note" className="w-full p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white"/>
          <input type="text" value={formData.videoUrl||''} onChange={e=>setFormData({...formData,videoUrl:e.target.value})} placeholder="YouTube URL" className="w-full p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white"/>

          {/* Alternatives */}
          <div className="border-t border-slate-200 pt-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-black text-blue-600 uppercase">البدائل (3 كحد أقصى)</p>
              <button
                type="button"
                onClick={()=>setFormData({...formData, alternatives: applySuggestedAlternatives(formData, formData.alternatives, libraryData)})}
                className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-black text-[9px] uppercase hover:bg-blue-500 hover:text-white transition-all"
              >
                Suggest
              </button>
            </div>
            {formData.alternatives.map((alt, i) => (
              <div key={alt.id} className="grid grid-cols-2 gap-1">
                {i < 2 ? (
                  <select
                    value={alt.name}
                    onChange={e => {
                      const selected = getAlternativeOptions(formData, alt.name, libraryData).find(option => option.name === e.target.value);
                      const newAlts = [...formData.alternatives];
                      newAlts[i] = {...newAlts[i], name: e.target.value, reason: selected?.reason || newAlts[i].reason};
                      setFormData({...formData, alternatives: newAlts});
                    }}
                    className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="">{`بديل مقترح ${i+1}`}</option>
                    {getAlternativeOptions(formData, alt.name, libraryData).map(option => (
                      <option key={`${i}-${option.name}`} value={option.name}>{option.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="بديل يدوي"
                    value={alt.name}
                    onChange={e => {
                      const newAlts = [...formData.alternatives];
                      newAlts[i] = {...newAlts[i], name: e.target.value};
                      setFormData({...formData, alternatives: newAlts});
                    }}
                    className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-400 bg-white"
                  />
                )}
                <input
                  type="text"
                  placeholder="السبب"
                  value={alt.reason}
                  onChange={e => {
                    const newAlts = [...formData.alternatives];
                    newAlts[i] = {...newAlts[i], reason: e.target.value};
                    setFormData({...formData, alternatives: newAlts});
                  }}
                  className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-400 bg-white"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-500 text-white px-3 py-2 rounded-lg font-black text-xs uppercase transition-all disabled:opacity-40">Save</button>
            <button onClick={()=>{setEditMode(false);setFormData({...exercise, alternatives: normalizeAlternatives(exercise.alternatives)});}} className="flex-1 bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-black text-xs uppercase transition-all">Cancel</button>
          </div>
        </div>
      ):(
        <div
          data-exercise-idx={idx}
          className={`flex items-center p-3 rounded-2xl border-2 gap-2 ${rowbg} group transition-all ${dragging ? 'opacity-50 scale-[0.98]' : ''}`}
        >
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={()=>setDragging(false)}
            style={{touchAction:'none'}}
            className="shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 text-base px-1 select-none"
            title="Drag to reorder"
          >
            ⠿
          </div>
          <div className="flex-1 text-left min-w-0">
            <span className="font-black text-sm text-slate-900 truncate block">{formatName(exercise.name)}</span>
            <p className="text-[10px] font-bold text-slate-500">
              {exercise.category==='HIIT'
                ? `${exercise.workSeconds||30}s/${exercise.restSeconds||15}s x${exercise.rounds||8}`
                : exercise.category==='CARDIO'
                ? (exercise.cardioMetric === 'intervals'
                    ? `${(exercise.intervals||[]).length} intervals`
                    : [
                        (exercise.cardioMetric === 'duration' || exercise.cardioMetric === 'duration_distance' || !exercise.cardioMetric) && `${exercise.targetDuration || 20} min`,
                        (exercise.cardioMetric === 'distance' || exercise.cardioMetric === 'duration_distance') && `${exercise.targetDistance || 0} km`,
                        exercise.cardioMetric === 'calories' && `${exercise.targetCalories || 0} kcal`,
                      ].filter(Boolean).join(' · '))
                : `${exercise.sets}x${exercise.reps}${exercise.tempo?` · ${exercise.tempo}`:''}`}
            </p>
            {exercise.coachNote&&<p className="text-[10px] text-emerald-500 font-bold truncate">💬 <LinkifiedText text={exercise.coachNote}/></p>}
            {getFilledAlternatives(exercise.alternatives).length>0&&(
              <p className="text-[9px] font-black text-blue-500">⇄ {getFilledAlternatives(exercise.alternatives).length} بديل</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={handleSwap} className="bg-amber-100 text-amber-600 font-black text-[10px] px-2 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white transition-all" title="Swap exercise">⇄</button>
            <button onClick={()=>setEditMode(true)} className="bg-blue-100 text-blue-600 font-black text-[10px] px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all">Edit</button>
            <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id))} className="text-red-400 font-black text-[10px] bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all">Del</button>
          </div>
        </div>
      )}
    </>
  );
}
