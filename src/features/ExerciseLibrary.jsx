import React, { useState } from 'react';
import { addDoc, updateDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { CATEGORIES, MUSCLE_GROUPS } from '../services/firebase/config';
import { getExerciseMuscle, getMuscleGroup, formatName } from '../utils/formatters';
import { makeDefaultAlternatives, normalizeAlternatives, getFilledAlternatives, getAlternativeOptions, applySuggestedAlternatives } from '../utils/validators';
import { useBackButton } from '../hooks/useBackButton';

export function EditExerciseModal({ exercise, onClose, db, appId, collectionName = 'workouts' }) {

  const [formData, setFormData] = useState({

    name: exercise.name,

    category: exercise.category || 'RESISTANCE',

    muscleGroup: getExerciseMuscle(exercise),

    sets: exercise.sets || '',

    reps: exercise.reps || '',

    tempo: exercise.tempo || '',

    gifUrl: exercise.gifUrl || '',

    description: exercise.description || '',

    alternatives: normalizeAlternatives(exercise.alternatives)

  });

  const [saving, setSaving] = useState(false);



  const handleSave = async () => {

    setSaving(true);

    try {

      await updateDoc(doc(db,'artifacts',appId,'public','data',collectionName,exercise.id),{

        name: formData.name,

        category: formData.category,

        muscleGroup: formData.muscleGroup,

        sets: formData.sets,

        reps: formData.reps,

        tempo: formData.tempo,

        gifUrl: formData.gifUrl,

        description: formData.description,

        alternatives: getFilledAlternatives(formData.alternatives)

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



          <select value={formData.muscleGroup} onChange={e=>setFormData({...formData,muscleGroup:e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50">

            {MUSCLE_GROUPS.map(m=><option key={m} value={m}>{m}</option>)}

          </select>



          <div className="grid grid-cols-2 gap-2">

            <input type="number" value={formData.sets} onChange={e=>setFormData({...formData,sets:e.target.value})} placeholder="Default Sets" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center"/>

            <input type="text" value={formData.reps} onChange={e=>setFormData({...formData,reps:e.target.value})} placeholder="Default Reps" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center"/>

          </div>



          <input type="text" value={formData.tempo} onChange={e=>setFormData({...formData,tempo:e.target.value})} placeholder="Tempo" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>



          <input type="text" value={formData.gifUrl} onChange={e=>setFormData({...formData,gifUrl:e.target.value})} placeholder="GIF URL" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>



          <textarea value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} placeholder="Description/Notes" rows={3} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>



          {/* Alternatives Section */}

          <div className="border-t-2 border-slate-200 pt-4 mt-4">

            <div className="flex items-center justify-between gap-2 mb-3">

              <p className="text-xs font-black text-emerald-600 uppercase block">البدائل المتاحة (حد أقصى 3)</p>

              <button

                type="button"

                onClick={()=>setFormData({...formData, alternatives: applySuggestedAlternatives(formData, formData.alternatives)})}

                className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase hover:bg-blue-500 hover:text-white transition-all"

              >

                Suggest

              </button>

            </div>

            <div className="space-y-2">

              {formData.alternatives.map((alt, idx) => (

                <div key={alt.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">

                  {idx < 2 ? (

                    <select

                      value={alt.name}

                      onChange={e => {

                        const selected = getAlternativeOptions(formData, alt.name).find(option => option.name === e.target.value);

                        const newAlts = [...formData.alternatives];

                        newAlts[idx] = {...newAlts[idx], name: e.target.value, reason: selected?.reason || newAlts[idx].reason};

                        setFormData({...formData, alternatives: newAlts});

                      }}

                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 bg-white"

                    >

                      <option value="">{`Suggested alternative ${idx + 1}`}</option>

                      {getAlternativeOptions(formData, alt.name).map(option => (

                        <option key={`${idx}-${option.name}`} value={option.name}>{option.name}</option>

                      ))}

                    </select>

                  ) : (

                    <input

                      type="text"

                      placeholder="Manual alternative"

                      value={alt.name}

                      onChange={e => {

                        const newAlts = [...formData.alternatives];

                        newAlts[idx].name = e.target.value;

                        setFormData({...formData, alternatives: newAlts});

                      }}

                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 bg-white"

                    />

                  )}

                  <input 

                    type="text" 

                    placeholder="السبب (مثل: بدون معدات، أسهل)"

                    value={alt.reason}

                    onChange={e => {

                      const newAlts = [...formData.alternatives];

                      newAlts[idx].reason = e.target.value;

                      setFormData({...formData, alternatives: newAlts});

                    }}

                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 bg-white"

                  />

                </div>

              ))}

            </div>

          </div>

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


export function AddExerciseModal({ onClose, db, appId }) {

  const [formData, setFormData] = useState({

    name: '',

    category: 'RESISTANCE',

    muscleGroup: 'Other',

    sets: '',

    reps: '',

    tempo: '',

    gifUrl: '',

    description: '',

    alternatives: makeDefaultAlternatives()

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

        muscleGroup: formData.muscleGroup || getMuscleGroup(formData.name) || 'Other',

        sets: formData.sets || '',

        reps: formData.reps || '',

        tempo: formData.tempo || '',

        gifUrl: formData.gifUrl || '',

        description: formData.description || '',

        alternatives: getFilledAlternatives(formData.alternatives),

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



          <select value={formData.muscleGroup} onChange={e=>setFormData({...formData,muscleGroup:e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50">

            <option value="">Select Muscle Group</option>

            {MUSCLE_GROUPS.map(m=><option key={m} value={m}>{m}</option>)}

          </select>



          <div className="grid grid-cols-2 gap-2">

            <input type="number" value={formData.sets} onChange={e=>setFormData({...formData,sets:e.target.value})} placeholder="Default Sets" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center"/>

            <input type="text" value={formData.reps} onChange={e=>setFormData({...formData,reps:e.target.value})} placeholder="Default Reps" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 text-center"/>

          </div>



          <input type="text" value={formData.tempo} onChange={e=>setFormData({...formData,tempo:e.target.value})} placeholder="Tempo (e.g 2-0-2-0)" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>



          <input type="text" value={formData.gifUrl} onChange={e=>setFormData({...formData,gifUrl:e.target.value})} placeholder="GIF URL (optional)" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>



          <textarea value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} placeholder="Description/Notes (optional)" rows={3} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>



          <div className="border-t-2 border-slate-200 pt-4 mt-4">

            <div className="flex items-center justify-between gap-2 mb-3">

              <p className="text-xs font-black text-emerald-600 uppercase">Suggested Alternatives</p>

              <button

                type="button"

                onClick={()=>setFormData({...formData, alternatives: applySuggestedAlternatives(formData, formData.alternatives)})}

                className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase hover:bg-blue-500 hover:text-white transition-all"

              >

                Suggest

              </button>

            </div>

            <div className="space-y-2">

              {normalizeAlternatives(formData.alternatives).map((alt, idx) => (

                <div key={alt.id} className="grid grid-cols-2 gap-2">

                  {idx < 2 ? (

                    <select

                      value={alt.name}

                      onChange={e=>{

                        const selected = getAlternativeOptions(formData, alt.name).find(option => option.name === e.target.value);

                        const alternatives = normalizeAlternatives(formData.alternatives);

                        alternatives[idx] = {...alternatives[idx], name:e.target.value, reason:selected?.reason || alternatives[idx].reason};

                        setFormData({...formData, alternatives});

                      }}

                      className="p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 bg-white"

                    >

                      <option value="">{`Suggested ${idx + 1}`}</option>

                      {getAlternativeOptions(formData, alt.name).map(option => (

                        <option key={`${idx}-${option.name}`} value={option.name}>{option.name}</option>

                      ))}

                    </select>

                  ) : (

                    <input

                      type="text"

                      placeholder="Manual alternative"

                      value={alt.name}

                      onChange={e=>{

                        const alternatives = normalizeAlternatives(formData.alternatives);

                        alternatives[idx] = {...alternatives[idx], name:e.target.value};

                        setFormData({...formData, alternatives});

                      }}

                      className="p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 bg-white"

                    />

                  )}

                  <input

                    type="text"

                    placeholder="Reason"

                    value={alt.reason}

                    onChange={e=>{

                      const alternatives = normalizeAlternatives(formData.alternatives);

                      alternatives[idx] = {...alternatives[idx], reason:e.target.value};

                      setFormData({...formData, alternatives});

                    }}

                    className="p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 bg-white"

                  />

                </div>

              ))}

            </div>

          </div>

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
