import React, { useState, useEffect, useMemo } from 'react';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NASM_OPT_PHASES } from '../constants/nasm';
import { MUSCLE_COLORS } from '../constants/colors';
import { getMuscleGroup, titleCase, formatName } from '../utils/formatters';
import { getSuggestedCardioMinutes } from '../utils/helpers';
import { getCoachRecommendations } from '../engines/nasm';
import { deleteClientCompletely } from '../services/firebase/clients';

export function ClientProfileViewModal({ client, onClose, db, appId, onToPlan, logs = [], workouts = [], checkIns = [] }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(client);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    setFormData(client);
    setEditMode(false);
    setShowDeleteConfirm(false);
    setDeleteTyped('');
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
  const clientCheckIns = useMemo(
    () => checkIns.filter(ci => ci.clientName === client.phone).slice(0, 5),
    [checkIns, client.phone]
  );
  const milestones = useMemo(() => {
    const totalLogs = profileStats.loggedCount;
    const prCount = profileStats.prCount;
    const checkInCount = clientCheckIns.length;
    const completed = [
      totalLogs >= 5 && '5 sessions logged',
      totalLogs >= 15 && '15 sessions logged',
      prCount >= 3 && '3 PRs hit',
      checkInCount >= 3 && '3 check-ins submitted',
      String(formData.weight || '').trim() && 'weight tracked',
      String(formData.bodyFat || '').trim() && 'body fat tracked',
    ].filter(Boolean);
    const next = completed.length < 6
      ? [
          totalLogs < 5 && 'Reach 5 logged sessions',
          prCount < 3 && 'Push for 3 PRs',
          checkInCount < 3 && 'Collect 3 check-ins',
          !String(formData.weight || '').trim() && 'Add body weight',
        ].filter(Boolean)[0]
      : 'All milestone targets reached';
    return { completed, next };
  }, [profileStats.loggedCount, profileStats.prCount, clientCheckIns.length, formData.weight, formData.bodyFat]);
  const restrictionSummary = useMemo(() => {
    const raw = String(formData.injuries || '').trim();
    if (!raw) return [];
    return raw
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [formData.injuries]);
  const timelineItems = useMemo(() => {
    const sessions = logs
      .filter(l => l.clientName === client.phone)
      .slice(-3)
      .map(l => ({
        kind: 'session',
        label: `${formatName(l.exerciseName)} • ${Number(l.rpe) ? `RPE ${l.rpe}` : 'logged'}`,
        date: l.completedAt?.toDate?.().toLocaleDateString('en-US') || '—',
      }));
    const checkinItems = clientCheckIns.slice(0, 3).map(ci => ({
      kind: 'checkin',
      label: `Sleep ${ci.sleep}/10 • Energy ${ci.energy}/10`,
      date: ci.createdAt?.toDate?.().toLocaleDateString('en-US') || 'Recent',
    }));
    return [...checkinItems, ...sessions].slice(0, 6);
  }, [logs, client.phone, clientCheckIns]);

  const suggestedCardioMinutes = useMemo(() => getSuggestedCardioMinutes(formData), [formData.weeklyCardioTarget, formData.daysPerWeek]);

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
        weeklyCardioTarget: formData.weeklyCardioTarget ? parseInt(formData.weeklyCardioTarget) : 0,
        injuries: formData.injuries,
        weight: formData.weight || '',
        bodyFat: formData.bodyFat || '',
        measurements: formData.measurements || '',
        progressPhotos: formData.progressPhotos || '',
        coachNotes: formData.coachNotes || '',
        coachNotesUpdatedAt: serverTimestamp(),
      });
      setEditMode(false);
      alert('Updated ✅');
    } catch(e) {
      console.error(e);
      alert('Error updating');
    }
    setSaving(false);
  };

  const handleDeleteClient = async () => {
    setDeleting(true);
    try {
      const count = await deleteClientCompletely(db, appId, client.phone);
      alert(`Deleted client and ${count} related record(s) ✅`);
      onClose();
    } catch(e) {
      console.error(e);
      alert('Error deleting client');
      setDeleting(false);
    }
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
          {showDeleteConfirm&&(
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
              <h4 className="text-sm font-black text-red-700 uppercase">Delete Client Permanently</h4>
              <p className="text-xs font-bold text-red-700 leading-relaxed">
                This will permanently delete {titleCase(formData.name)} ({client.phone}) and all workouts, logs, check-ins, and notes. This cannot be undone.
              </p>
              <p className="text-xs font-black text-red-700">Type the client's name (<span className="underline">{titleCase(formData.name)}</span>) to confirm:</p>
              <input
                type="text"
                value={deleteTyped}
                onChange={e=>setDeleteTyped(e.target.value)}
                placeholder={titleCase(formData.name)}
                className="w-full p-3 border-2 border-red-300 rounded-xl font-black text-sm outline-none focus:border-red-500 bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDeleteClient}
                  disabled={deleting || deleteTyped.trim().toLowerCase() !== String(formData.name||'').trim().toLowerCase()}
                  className="bg-red-600 text-white py-3 rounded-2xl font-black text-xs uppercase disabled:opacity-40 active:scale-95 transition-all"
                >
                  {deleting?'Deleting...':'Confirm Delete'}
                </button>
                <button onClick={()=>{setShowDeleteConfirm(false);setDeleteTyped('');}} disabled={deleting} className="bg-slate-200 text-slate-600 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">Cancel</button>
              </div>
            </div>
          )}
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

              <div className="border-l-4 border-blue-400 pl-3">
                <label className="text-xs font-black text-blue-500 uppercase mb-2 block">Weekly Cardio Target (mins)</label>
                <input type="number" value={formData.weeklyCardioTarget||''} onChange={e=>setFormData({...formData,weeklyCardioTarget:e.target.value})} placeholder="e.g 150" className="w-full p-3 border-2 border-blue-200 rounded-xl font-black text-sm outline-none focus:border-blue-500 bg-blue-50"/>
                {suggestedCardioMinutes&&<p className="text-[10px] font-black text-blue-500 mt-1">≈ {suggestedCardioMinutes} min/session × {formData.daysPerWeek} days</p>}
              </div>

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
                  {label:'Weekly Cardio',val: formData.weeklyCardioTarget ? `${formData.weeklyCardioTarget} min${suggestedCardioMinutes?` (${suggestedCardioMinutes}/session)`:''}` : '—'},
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

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3">Recent Check-ins</h4>
                {clientCheckIns.length > 0 ? (
                  <div className="space-y-2">
                    {clientCheckIns.map(ci => (
                      <div key={ci.id} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-100 px-3 py-2">
                        <div>
                          <p className="text-sm font-black text-slate-900">Sleep {ci.sleep}/10 · Energy {ci.energy}/10</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Soreness {ci.soreness}/10 · Stress {ci.stress}/10</p>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${Number(ci.readiness) >= 70 ? 'bg-emerald-100 text-emerald-700' : Number(ci.readiness) >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {ci.readiness || 0}/100
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-black text-slate-400">No check-ins yet</p>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="text-[10px] font-black text-emerald-700 uppercase">Milestones</h4>
                  <span className="text-[10px] font-black text-emerald-600 uppercase">{milestones.completed.length} done</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {milestones.completed.length > 0 ? milestones.completed.map(item => (
                    <span key={item} className="px-2.5 py-1 rounded-full bg-white border border-emerald-100 text-[10px] font-black text-emerald-700">
                      {item}
                    </span>
                  )) : (
                    <span className="text-xs font-black text-emerald-700">No milestones yet</span>
                  )}
                </div>
                <p className="text-xs font-black text-emerald-700 mt-3 leading-relaxed">
                  Next: {milestones.next}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase">Timeline</h4>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Check-ins + sessions</span>
                </div>
                {timelineItems.length > 0 ? (
                  <div className="space-y-2">
                    {timelineItems.map((item, idx) => (
                      <div key={`${item.kind}-${idx}`} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">{item.label}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase">{item.kind}</p>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 shrink-0">{item.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-black text-slate-400">No timeline items yet</p>
                )}
              </div>

              {restrictionSummary.length > 0 && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-[10px] font-black text-red-700 uppercase">Movement Restrictions</h4>
                    <span className="text-[10px] font-black text-red-600 uppercase">Coach Alert</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {restrictionSummary.map(item => (
                      <span key={item} className="px-2.5 py-1 rounded-full bg-white border border-red-100 text-[10px] font-black text-red-700">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs font-black text-red-700 mt-3 leading-relaxed">
                    Review exercise selection, ranges of motion, and loading before assigning the next session.
                  </p>
                </div>
              )}

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
        <div className="p-4 border-t border-slate-200 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {!editMode&&<button onClick={()=>setEditMode(true)} className="col-span-1 bg-slate-900 text-emerald-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">✏️ Edit</button>}
            {editMode&&<button onClick={handleSave} disabled={saving} className="col-span-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all disabled:opacity-40">{saving?'...':'Save'}</button>}
            {editMode&&<button onClick={()=>{setEditMode(false);setFormData(client);}} className="col-span-1 bg-slate-200 text-slate-600 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">Cancel</button>}
            {!editMode&&<button onClick={onToPlan} className="col-span-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">📋 Plan</button>}
            <button onClick={onClose} className={`border-2 border-slate-200 text-slate-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all ${editMode?'col-span-2':'col-span-1'}`}>Close</button>
          </div>
          {!editMode&&!showDeleteConfirm&&(
            <button onClick={()=>setShowDeleteConfirm(true)} className="w-full bg-red-50 border-2 border-red-200 text-red-600 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all hover:bg-red-500 hover:text-white">🗑️ Delete Client</button>
          )}
        </div>
      </div>
    </div>
  );
}
