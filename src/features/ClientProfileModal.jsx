import React, { useState, useEffect, useMemo } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NASM_OPT_PHASES } from '../constants/nasm';
import { MUSCLE_COLORS } from '../constants/colors';
import { getMuscleGroup, titleCase, formatName } from '../utils/formatters';
import { getCoachRecommendations } from '../engines/nasm';

export function ClientProfileViewModal({ client, onClose, db, appId, onToPlan, logs = [], workouts = [] }) {
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {label:'Exercises',val:profileStats.assignedCount},
                  {label:'Logs',val:profileStats.loggedCount},
                  {label:'PRs',val:profileStats.prCount},
                  {label:'Avg RPE',val:profileStats.avgRpe},
                ].map(s=>(
                  <div key={s.label} className="p-4 rounded-2xl bg-slate-50 text-center border border-slate-100">
                    <span className="text-2xl font-black text-emerald-500 block">{s.val}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {label:'Age',val:formData.age?`${formData.age} yrs`:'—'},
                  {label:'Gender',val:formData.gender||'—'},
                  {label:'Height',val:formData.height?`${formData.height} cm`:'—'},
                  {label:'Goal',val:formData.goal||'—'},
                  {label:'Level',val:formData.level||'—'},
                  {label:'NASM Phase',val:NASM_OPT_PHASES[formData.nasm_phase||1]?.phase||'—'},
                  {label:'Days/Week',val:formData.daysPerWeek?`${formData.daysPerWeek} days`:'—'},
                  {label:'Last Workout',val:profileStats.lastWorkout},
                  {label:'Weight',val:formData.weight?`${formData.weight} kg`:'—'},
                  {label:'Body Fat',val:formData.bodyFat?`${formData.bodyFat}%`:'—'},
                  {label:'Injuries',val:formData.injuries||'None'},
                ].map(f=>(
                  <div key={f.label} className="flex justify-between items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-black text-slate-500 uppercase shrink-0">{f.label}</span>
                    <span className="text-sm font-black text-slate-900 text-right">{f.val}</span>
                  </div>
                ))}
              </div>

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

              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                <h4 className="text-[10px] font-black text-emerald-700 uppercase mb-2">Coach Recommendations</h4>
                <div className="space-y-2">
                  {getCoachRecommendations(formData, profileStats).map(rec=>(
                    <p key={rec} className="text-sm font-black text-slate-800">• {rec}</p>
                  ))}
                </div>
              </div>

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