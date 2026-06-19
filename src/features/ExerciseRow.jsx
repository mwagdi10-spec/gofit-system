import React, { useState, useEffect, useMemo } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatName, getExerciseLink, normalizeHref } from '../utils/formatters';
import { getFilledAlternatives } from '../utils/validators';
import { getOverloadSuggestion } from '../engines/exercise';
import { useBackButton } from '../hooks/useBackButton';
import { GifPopup } from '../components/ui/GifPopup';
import { LinkifiedText } from '../components/shared/LinkifiedText';

export function AlternativesModal({ exercise, onSelect, onClose }) {
  useBackButton(!!exercise, onClose);
  if (!exercise) return null;
  const alternatives = getFilledAlternatives(exercise.alternatives);

  return (
    <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900 p-5 flex justify-between items-center">
          <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
          <span className="text-emerald-400 font-black text-base">بدائل متاحة</span>
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm font-black text-slate-900 mb-4">
            بدائل لـ <span className="text-emerald-600">{formatName(exercise.name)}</span>
          </p>

          {alternatives.length > 0 ? (
            alternatives.map((alt, idx) => (
              <button
                key={idx}
                onClick={() => { onSelect(alt); onClose(); }}
                className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer text-left transition-all active:scale-95"
              >
                <p className="font-black text-sm text-slate-900">{formatName(alt.name)}</p>
                <p className="text-xs text-slate-500 mt-1.5 font-bold">💬 {alt.reason}</p>
              </button>
            ))
          ) : (
            <p className="text-center py-8 text-slate-400 font-black text-sm">لا توجد بدائل متاحة</p>
          )}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button onClick={onClose} className="w-full border-2 border-slate-200 text-slate-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export function CoolDownStretchCard({ exercise, sessionFinished }) {
  const [done, setDone] = useState(false);
  const displayLink = getExerciseLink(exercise);
  useEffect(()=>{ if(sessionFinished) setDone(false); },[sessionFinished]);

  return (
    <div className={`flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 transition-opacity ${done?'opacity-50':''}`}>
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"/>
      <div className="flex-1 min-w-0">
        <p className={`font-black text-sm leading-tight ${done?'line-through text-slate-400':'text-slate-900'}`}>
          {formatName(exercise.name)}
        </p>
        {displayLink&&(
          <a href={normalizeHref(displayLink)} target="_blank" rel="noreferrer"
            className="text-xs text-blue-500 truncate block hover:underline mt-0.5">
            {displayLink}
          </a>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {displayLink&&(
          <a href={normalizeHref(displayLink)} target="_blank" rel="noreferrer"
            className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-black rounded-full hover:bg-slate-50 transition-colors uppercase">
            Link
          </a>
        )}
        <button onClick={()=>setDone(p=>!p)}
          className={`px-5 py-1.5 text-xs font-black rounded-full transition-all active:scale-95 ${done?'bg-emerald-500 text-white':'bg-slate-900 text-emerald-400'}`}>
          {done?'✓ Done':'Done'}
        </button>
      </div>
    </div>
  );
}

// Activation & Skills — reps only + Done + GIF, no LINK, saves to DB
export function ActivationSkillsCard({ exercise, db, appId, identifier, allLogs, sessionFinished }) {
  const setsCount = parseInt(exercise.sets)||3;
  const [reps, setReps]       = useState(Array.from({length:setsCount}).map(()=>({reps:exercise.reps||'10'})));
  const [done, setDone]       = useState(false);
  const [showGif, setShowGif] = useState(false);

  useEffect(()=>{ if(sessionFinished) setDone(false); },[sessionFinished]);
  useEffect(()=>{
    const today = new Date().toLocaleDateString('en-US');
    const saved = allLogs.some(l=>l.exerciseId===exercise.id&&l.clientName===identifier&&l.completedAt?.toDate().toLocaleDateString('en-US')===today);
    if(saved) setDone(true);
  },[allLogs,exercise.id,identifier]);

  const handleDone = async () => {
    if(done) return;
    try {
      await addDoc(collection(db,'artifacts',appId,'public','data','logs'),{
        exerciseId:exercise.id, clientName:identifier,
        setsData:reps.map(r=>({reps:r.reps,weight:0,type:'activation'})),
        completedAt:serverTimestamp(), exerciseName:exercise.name,
        originalExerciseName:null, isAlternative:false,
        category:exercise.category, rpe:null, volume:0, maxWeight:0, isPR:false
      });
      setDone(true);
    } catch(e){ console.error(e); }
  };

  return (
    <>
      {showGif&&exercise.gifUrl&&<GifPopup url={exercise.gifUrl} onClose={()=>setShowGif(false)}/>}
      <div className={`rounded-2xl border p-3 transition-all ${done?'border-emerald-300 bg-emerald-50':'border-slate-100 bg-white'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-3 h-3 rounded-full shrink-0 ${done?'bg-emerald-500':'bg-slate-200'}`}/>
          <p className={`font-black text-sm flex-1 leading-tight ${done?'text-emerald-700 line-through':'text-slate-900'}`}>{formatName(exercise.name)}</p>
          {/* GIF only — no LINK */}
          {exercise.gifUrl&&(
            <button onClick={()=>setShowGif(true)} className="text-[10px] bg-slate-900 text-emerald-400 px-2 py-1 rounded-lg font-black hover:bg-slate-800 transition-all">GIF</button>
          )}
        </div>
        {/* reps inputs */}
        {!done&&(
          <div className="space-y-1.5 mb-2 ml-5">
            {reps.map((s,i)=>(
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 w-12 shrink-0">Set {i+1}</span>
                <input type="text" value={s.reps}
                  onChange={e=>{const n=[...reps];n[i]={reps:e.target.value};setReps(n);}}
                  className="w-16 p-1.5 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-slate-50 text-center"
                  placeholder="reps"/>
                <span className="text-xs text-slate-500">reps</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={handleDone} disabled={done}
          className={`w-full py-2 rounded-xl text-xs font-black uppercase transition-all active:scale-95 ${done?'bg-emerald-500 text-white':'bg-slate-900 text-emerald-400'}`}>
          {done?'✓ Done':'Done'}
        </button>
      </div>
    </>
  );
}


export function ExerciseRow({ exercise, db, appId, identifier, allLogs, sessionFinished }) {
  const setsCount = parseInt(exercise.sets) || 3;
  const [sets, setSets]                   = useState(Array.from({length:setsCount}).map(()=>({weight:'',reps:exercise.reps||'10'})));
  const [isSaved, setIsSaved]             = useState(false);
  const [isSkipped, setIsSkipped]         = useState(false);
  const [showGif, setShowGif]             = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState(null);

  useEffect(()=>{ if(sessionFinished) setIsSaved(false); },[sessionFinished]);
  useEffect(()=>{
    const today = new Date().toLocaleDateString('en-US');
    const saved = allLogs.some(l=>l.exerciseId===exercise.id&&l.clientName===identifier&&l.completedAt?.toDate().toLocaleDateString('en-US')===today);
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

  const alternatives = getFilledAlternatives(exercise.alternatives);
  // الاسم الفعلي المستخدم (أصلي أو بديل)
  const activeExerciseName = selectedAlternative ? selectedAlternative.name : exercise.name;

  const handleSave = async () => {
    if(isSaved||isSkipped) return;
    try {
      const currentMax = Math.max(...sets.map(s=>parseFloat(s.weight)||0));
      const volume = sets.reduce((sum,s)=>(sum+((parseFloat(s.weight)||0)*(parseFloat(s.reps)||0))),0);
      const isPR = currentMax>bestWeight&&bestWeight>0;
      await addDoc(collection(db,'artifacts',appId,'public','data','logs'),{
        exerciseId: exercise.id,
        clientName: identifier,
        setsData: sets,
        completedAt: serverTimestamp(),
        exerciseName: activeExerciseName,
        originalExerciseName: selectedAlternative ? exercise.name : null,
        isAlternative: !!selectedAlternative,
        category: exercise.category,
        rpe: null,
        volume,
        maxWeight: currentMax,
        isPR
      });
      setIsSaved(true);
    } catch(e){ console.error(e); }
  };

  const handleSelectAlternative = (alt) => {
    setSelectedAlternative(alt);
    setShowAlternatives(false);
  };

  const saved = isSaved && !sessionFinished;

  return (
    <>
      {showGif&&exercise.gifUrl&&<GifPopup url={exercise.gifUrl} onClose={()=>setShowGif(false)}/>}
      <div className={`p-5 mb-4 rounded-[2.5rem] border-[2.5px] shadow-lg transition-all duration-300 bg-white ${saved?'!border-emerald-500 shadow-emerald-100 bg-emerald-50/30':isSkipped?'opacity-40 grayscale border-slate-200':'border-slate-200'}`}>
        {/* Exercise Name - Full Width */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-sm text-slate-900 whitespace-normal break-words leading-tight">{formatName(activeExerciseName)}</h4>
              {selectedAlternative&&(
                <p className="text-[10px] font-black text-slate-400 mt-0.5">
                  بديل من: {formatName(exercise.name)}
                </p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              {!saved&&!isSkipped&&(
                <button
                  onClick={()=>setShowAlternatives(p=>!p)}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg font-black hover:bg-blue-700 transition-all"
                >
                  ALT <span className="text-[9px]">{showAlternatives ? '▲' : '▼'}</span>
                </button>
              )}
              {exercise.gifUrl&&(
                <button onClick={()=>setShowGif(true)} className="text-xs bg-slate-900 text-emerald-400 px-2 py-1 rounded-lg font-black hover:bg-slate-800 transition-all">GIF</button>
              )}
            </div>
          </div>
          
          {/* Metadata Row */}
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            {selectedAlternative&&(
              <span className="text-[10px] text-blue-600 font-black bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">⇄ Alternative</span>
            )}
            {exercise.coachNote&&<span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">💬 <LinkifiedText text={exercise.coachNote}/></span>}
            {exercise.category&&<span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">📂 {exercise.category}</span>}
            {exercise.tempo&&<span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">Tempo: {exercise.tempo}</span>}
            {exercise.reps&&<span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">{exercise.sets}×—{exercise.reps}</span>}
          </div>

          {showAlternatives&&(
            <div className="mb-3 rounded-2xl border-2 border-blue-100 bg-blue-50/60 p-3 text-left space-y-2">
              {alternatives.length>0 ? alternatives.map((alt,idx)=>(
                <button
                  key={`${alt.name}-${idx}`}
                  onClick={()=>handleSelectAlternative(alt)}
                  className={`w-full rounded-xl border p-3 text-left transition-all active:scale-[0.99] ${selectedAlternative?.name===alt.name?'border-blue-500 bg-white shadow-sm':'border-blue-100 bg-white/80 hover:border-blue-300'}`}
                >
                  <p className="font-black text-sm text-slate-900">{formatName(alt.name)}</p>
                  {alt.reason&&<p className="mt-1 text-[10px] font-bold text-slate-500">{alt.reason}</p>}
                </button>
              )) : (
                <div className="rounded-xl border border-blue-100 bg-white/80 p-3 text-center text-xs font-black text-slate-400">
                  No Alternatives Added
                </div>
              )}
            </div>
          )}

          {/* Save/Skip Buttons */}
          <div className="flex gap-2">
            {!saved&&!isSkipped&&(
              <>
                <button onClick={handleSave} className="flex-1 bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-black text-xs uppercase hover:bg-slate-300 transition-all active:scale-95">Save</button>
                <button onClick={()=>setIsSkipped(true)} className="flex-1 bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-black text-xs uppercase hover:bg-slate-300 transition-all active:scale-95">Skip</button>
              </>
            )}
            {saved&&<span className="flex-1 text-center bg-emerald-500 text-white px-3 py-2 rounded-xl font-black text-xs uppercase">✓ SAVED</span>}
            {isSkipped&&<span className="flex-1 text-center bg-slate-200 text-slate-600 px-3 py-2 rounded-xl font-black text-xs uppercase">SKIPPED</span>}
          </div>
        </div>

        {/* Sets Input */}
        <div className="space-y-2">
          {sets.map((s,i)=>(
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 w-12 shrink-0">Set {i+1}</span>
              <input type="number" step="0.5" value={s.weight} onChange={e=>{const ns=[...sets];ns[i]={...ns[i],weight:e.target.value};setSets(ns);}} className="w-16 p-1.5 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-slate-50 text-center" placeholder="kg"/>
              <span className="text-xs text-slate-500">kg</span>
              <input type="text" value={s.reps} onChange={e=>{const ns=[...sets];ns[i]={...ns[i],reps:e.target.value};setSets(ns);}} className="w-16 p-1.5 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-slate-50 text-center" placeholder="10"/>
              <span className="text-xs text-slate-500">reps</span>
            </div>
          ))}
          {bestWeight>0&&<div className="text-xs font-black text-emerald-600 mt-2">💪 PB: {bestWeight}kg</div>}
          <div className="text-[11px] font-black text-slate-600 bg-blue-50 border border-blue-100 rounded-xl p-2 mt-2">
            Progressive overload: {overloadSuggestion}
          </div>
          {progressData.length>1&&(
            <div className="h-28 mt-3 rounded-2xl bg-slate-50 border border-slate-100 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <XAxis dataKey="date" hide/>
                  <YAxis hide/>
                  <Tooltip contentStyle={{borderRadius:'12px',border:'none',boxShadow:'0 10px 25px -5px rgba(0,0,0,0.1)'}}/>
                  <Line type="monotone" dataKey="maxWeight" name="Max kg" stroke="#10b981" strokeWidth={3} dot={{r:3}}/>
                  <Line type="monotone" dataKey="rpe" name="RPE" stroke="#f59e0b" strokeWidth={2} dot={{r:3}} connectNulls/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
}