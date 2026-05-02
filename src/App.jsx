import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, onSnapshot, addDoc, serverTimestamp,
  doc, query, orderBy, deleteDoc, updateDoc, setDoc
} from 'firebase/firestore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

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
const APP_ID       = "gofit-production";
const TRAINER_MAIL = "wagdi@gofit.com";
const CATEGORIES   = ['WARM-UP','ACTIVATION','SKILL','RESISTANCE','CARDIO','COOL-DOWN'];

// ─── Muscle Group Mapping ─────────────────────────────────────────────────────
const MUSCLE_COLORS = {
  'Chest':      '#ef4444',
  'Back':       '#3b82f6',
  'Quads':      '#f59e0b',
  'Hamstrings': '#8b5cf6',
  'Core':       '#10b981',
  'Shoulders':  '#ec4899',
  'Arms':       '#06b6d4',
  'Glutes':     '#f97316',
};

function getMuscleGroup(exerciseName = '') {
  const n = exerciseName.toLowerCase();
  if (/bench|chest|fly|pec|push.?up|dip/i.test(n))                              return 'Chest';
  if (/row|pull|lat|deadlift|back|chin/i.test(n))                               return 'Back';
  if (/squat|leg press|lunge|quad|extension/i.test(n))                          return 'Quads';
  if (/hamstring|curl|romanian|rdl|nordic/i.test(n))                            return 'Hamstrings';
  if (/plank|crunch|ab|core|sit.?up|cable crunch|wheel/i.test(n))               return 'Core';
  if (/shoulder|overhead|press|lateral raise|front raise|face pull/i.test(n))   return 'Shoulders';
  if (/bicep|tricep|curl|arm|pushdown|extension/i.test(n))                      return 'Arms';
  if (/glute|hip thrust|bridge|kickback/i.test(n))                              return 'Glutes';
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
        <button onClick={onClose} className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white text-slate-900 rounded-full font-black text-sm shadow-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">✕</button>
        <img src={url} alt="exercise demo" className="w-full rounded-3xl shadow-2xl" />
      </div>
    </div>
  );
}

// ─── Searchable Dropdown (مع إضافة جديد) ──────────────────────────────────────
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
            <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="اكتب للبحث..." className="w-full p-2 bg-slate-50 rounded-xl text-sm font-bold outline-none" />
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
// ClientProfileViewModal (مع Edit)
// ═══════════════════════════════════════════════════════════════════════════════
function ClientProfileViewModal({ client, onClose, db, appId, onToPlan }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(client);
  const [saving, setSaving] = useState(false);

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
        daysPerWeek: formData.daysPerWeek,
        injuries: formData.injuries,
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
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="bg-slate-900 p-5 flex justify-between items-center">
          <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
          <span className="text-emerald-400 font-black text-base">{titleCase(formData.name)}</span>
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
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
              <input type="number" value={formData.daysPerWeek||''} onChange={e=>setFormData({...formData,daysPerWeek:parseInt(e.target.value)||0})} placeholder="Days/Week" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
              <input type="text" value={formData.injuries||''} onChange={e=>setFormData({...formData,injuries:e.target.value})} placeholder="Injuries" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
            </>
          ):(
            <>
              {[
                {label:'Phone',val:client.phone},
                {label:'Age',val:formData.age?`${formData.age} yrs`:'—'},
                {label:'Gender',val:formData.gender||'—'},
                {label:'Height',val:formData.height?`${formData.height} cm`:'—'},
                {label:'Goal',val:formData.goal||'—'},
                {label:'Level',val:formData.level||'—'},
                {label:'Days/Week',val:formData.daysPerWeek?`${formData.daysPerWeek} days`:'—'},
                {label:'Injuries',val:formData.injuries||'None'},
              ].map(f=>(
                <div key={f.label} className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                  <span className="text-xs font-black text-slate-500 uppercase">{f.label}</span>
                  <span className="text-sm font-black text-slate-900">{f.val}</span>
                </div>
              ))}
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
// Edit Exercise Modal (تعديل التصنيف والبيانات)
// ═══════════════════════════════════════════════════════════════════════════════
function EditExerciseModal({ exercise, onClose, db, appId }) {
  const [formData, setFormData] = useState({
    name: exercise.name,
    category: exercise.category || 'RESISTANCE',
    sets: exercise.sets || '',
    reps: exercise.reps || '',
    tempo: exercise.tempo || '',
    gifUrl: exercise.gifUrl || '',
    description: exercise.description || ''
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
        description: formData.description
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


function AddExerciseModal({ onClose, db, appId }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'RESISTANCE',
    sets: '',
    reps: '',
    tempo: '',
    gifUrl: '',
    description: ''
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


function AddNewClientModal({ onClose, db, appId }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '',
    height: '',
    goal: '',
    level: '',
    daysPerWeek: '',
    injuries: ''
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
        daysPerWeek: formData.daysPerWeek ? parseInt(formData.daysPerWeek) : 0,
        injuries: formData.injuries || '',
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
          <input type="number" value={formData.daysPerWeek} onChange={e=>setFormData({...formData,daysPerWeek:e.target.value})} placeholder="Days/Week" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
          <input type="text" value={formData.injuries} onChange={e=>setFormData({...formData,injuries:e.target.value})} placeholder="Injuries/Notes" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>
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
      const d = log.completedAt?.toDate?.().toLocaleDateString('ar-EG')||'Unknown';
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
      const d = log.completedAt?.toDate?.().toLocaleDateString('ar-EG')||'?';
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
              {Object.entries(clientNames).map(([phone,client])=>{
                const todayLogs = logs.filter(l=>l.clientName===phone&&l.completedAt?.toDate?.().toLocaleDateString('ar-EG')===new Date().toLocaleDateString('ar-EG'));
                const lastLog = logs.filter(l=>l.clientName===phone).sort((a,b)=>b.completedAt?.toDate?.()-a.completedAt?.toDate?.())[0];
                const lastDate = lastLog?.completedAt?.toDate?.().toLocaleDateString('ar-EG');
                const today = new Date().toLocaleDateString('ar-EG');
                const diff = lastDate===today?0:lastDate?(Math.floor((new Date()-new Date(lastDate))/(1000*60*60*24))):999;
                const pct = todayLogs.length>0?Math.round((todayLogs.length/(workouts.filter(w=>w.assignedTo===phone).length||1))*100):0;
                return(
                  <div key={phone} onClick={()=>setSelectedProfileModal({...client,phone})} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 cursor-pointer transition-all hover:shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black text-base shrink-0">
                        {titleCase(client.name)[0]}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-black text-sm ${tx}`}>{titleCase(client.name)}</p>
                        <p className={`text-[10px] ${sub}`}>{client.phone}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-black ${sub} shrink-0`}>{diff===0?'Today':diff===999?'Never':`${diff}d ago`}</span>
                    </div>
                    <div className="h-1.5 rounded-full w-full bg-slate-100">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${pct}%`}}/>
                    </div>
                    <span className={`text-[9px] font-black ${sub}`}>today {pct}%</span>
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
            </div>
            <button onClick={()=>setShowAddClient(true)} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">+ Add New Client</button>
          </div>
        </div>
      )}

      {/* CLIENTS */}
      {activeTab==='clients'&&(
        <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-black text-base ${tx}`}>Client List</h3>
            <button onClick={()=>setShowAddClient(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase">+ Add</button>
          </div>
          <div className="space-y-3">
            {Object.entries(clientNames).map(([phone,client])=>(
              <div key={phone} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 transition-all flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0">{titleCase(client.name)[0]}</div>
                  <div className="text-left">
                    <p className="font-black text-sm text-slate-900">{titleCase(client.name)}</p>
                    <p className="text-xs text-slate-500">{phone}</p>
                  </div>
                </div>
                <button onClick={()=>setSelectedProfileModal({...client,phone})} className="bg-slate-900 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-800 transition-all">View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedProfileModal&&(
        <ClientProfileViewModal client={selectedProfileModal} onClose={()=>setSelectedProfileModal(null)} db={db} appId={appId} onToPlan={()=>{setSelectedProfileModal(null);setTargetClient(selectedProfileModal.phone);setActiveTab('plan');}}/>
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
                    <details open className="border-2 border-slate-200 rounded-2xl overflow-hidden">
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
            <ClientSelector clientNames={clientNames} value={targetClient} onChange={phone=>{setTargetClient(phone);setSessionName('');}} placeholder="Select Client..."/>
            {targetClient&&clientNames[targetClient]&&(
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black text-sm">{titleCase(clientNames[targetClient]?.name||'')[0]}</div>
                <div className="text-left">
                  <p className="font-black text-sm text-slate-900">{titleCase(clientNames[targetClient]?.name||targetClient)}</p>
                  <p className="text-[10px] text-slate-500">{targetClient}</p>
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
              await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{...newEx,gifUrl:libEx?.gifUrl||'',assignedTo:targetClient,day:sessionName,orderIndex:Date.now()});
              setNewEx({name:'',category:'RESISTANCE',sets:'3',reps:'10',tempo:'',coachNote:''});
              alert('Assigned ✅');
            }} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">Assign Workout +</button>
            <div className="flex gap-2">
              <button onClick={()=>setShowTemplate(true)} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">📋 Full Day Template</button>
              <button onClick={()=>{setNewEx({name:'',category:'RESISTANCE',sets:'3',reps:'10',tempo:'',coachNote:'**NEW**'});}} className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">➕ New Exercise</button>
            </div>
          </div>

          <div className="space-y-5">
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
        <div className="space-y-5">
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
            <h3 className={`font-black text-base border-b pb-3 mb-3 ${tx} border-slate-200`}>Select Client for Analysis</h3>
            <ClientSelector clientNames={clientNames} value={analyticsClient} onChange={setAnalyticsClient} placeholder="Select Client..."/>
          </div>
          {analyticsClient&&(
            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
              <h3 className={`font-black text-base border-b pb-3 mb-4 ${tx} border-slate-200`}>Muscle Group Progression</h3>
              {muscleChartData.muscles.length>0?(
                <div className="h-64 -mx-6 px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={muscleChartData.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}/>
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="kg"/>
                      <Tooltip contentStyle={{borderRadius:'16px',border:'none',boxShadow:'0 10px 25px -5px rgba(0,0,0,0.1)',background:'#fff'}} formatter={(v,n)=>[`${v}kg`,n]}/>
                      <Legend/>
                      {muscleChartData.muscles.map(m=>(
                        <Line key={m} type="monotone" dataKey={m} stroke={MUSCLE_COLORS[m]||'#94a3b8'} strokeWidth={3} dot={{r:5,fill:MUSCLE_COLORS[m]||'#94a3b8',strokeWidth:2,stroke:'#fff'}} connectNulls activeDot={{r:7}}/>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ):(
                <div className="h-40 flex items-center justify-center">
                  <p className={`text-sm font-black ${sub} text-center`}>No workout data yet</p>
                </div>
              )}
            </div>
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
// ExerciseEditRow (للمدرب - يقدر يعدل والترتيب)
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
// ExerciseRow (للعميل - بتسجيل التمارين)
// ══════════════════════════════════════════════════════════════════════════════
function ExerciseRow({ exercise, db, appId, identifier, allLogs, sessionFinished }) {
  const setsCount = parseInt(exercise.sets) || 3;
  const [sets, setSets]           = useState(Array.from({length:setsCount}).map(()=>({weight:'',reps:exercise.reps||'10'})));
  const [isSaved, setIsSaved]     = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [showGif, setShowGif]     = useState(false);

  useEffect(()=>{ if(sessionFinished) setIsSaved(false); },[sessionFinished]);
  useEffect(()=>{
    const today = new Date().toLocaleDateString('ar-EG');
    const saved = allLogs.some(l=>l.exerciseId===exercise.id&&l.clientName===identifier&&l.completedAt?.toDate().toLocaleDateString('ar-EG')===today);
    if(saved) setIsSaved(true);
  },[allLogs,exercise.id,identifier]);

  const bestWeight = useMemo(()=>{
    const logs = allLogs.filter(l=>l.exerciseId===exercise.id&&l.clientName===identifier);
    if(!logs.length) return 0;
    return Math.max(...logs.flatMap(l=>l.setsData?.map(s=>parseFloat(s.weight)||0)||[0]));
  },[allLogs,exercise.id,identifier]);

  const handleSave = async () => {
    if(isSaved||isSkipped) return;
    try {
      const currentMax = Math.max(...sets.map(s=>parseFloat(s.weight)||0));
      const isPR = currentMax>bestWeight&&bestWeight>0;
      await addDoc(collection(db,'artifacts',appId,'public','data','logs'),{
        exerciseId:exercise.id, clientName:identifier, setsData:sets,
        completedAt:serverTimestamp(), exerciseName:exercise.name, category:exercise.category, isPR
      });
      setIsSaved(true);
    } catch(e){ console.error(e); }
  };

  const saved    = isSaved && !sessionFinished;
  const muscleGroup = useMemo(() => getMuscleGroup(exercise.name), [exercise.name]);

  return (
    <>
      {showGif&&exercise.gifUrl&&<GifPopup url={exercise.gifUrl} onClose={()=>setShowGif(false)}/>}
      <div className={`p-5 mb-4 rounded-[2.5rem] border-[2.5px] shadow-lg transition-all duration-300 bg-white ${saved?'!border-emerald-500 shadow-emerald-100 bg-emerald-50/30':isSkipped?'opacity-40 grayscale border-slate-200':'border-slate-200'}`}>
        {/* Exercise Name - Full Width */}
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="font-black text-base text-slate-900 flex-1 truncate">{formatName(exercise.name)}</h4>
            {exercise.gifUrl&&<button onClick={()=>setShowGif(true)} className="text-xs bg-slate-900 text-emerald-400 px-2 py-1 rounded-lg font-black hover:bg-slate-800 transition-all shrink-0">GIF</button>}
          </div>
          
          {/* Metadata Row - Coach Note, Muscle Group, Tempo, Rest */}
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            {exercise.coachNote&&<span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">💬 {exercise.coachNote}</span>}
            {muscleGroup&&<span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">{muscleGroup}</span>}
            {exercise.tempo&&<span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">Tempo: {exercise.tempo}</span>}
            {exercise.reps&&<span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">{exercise.sets}×{exercise.reps}</span>}
          </div>

          {/* Save/Skip Buttons Below Name */}
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
              <input type="text" value={s.reps} onChange={e=>{const ns=[...sets];ns[i]={...ns[i],reps:e.target.value};setSets(ns);}} className="w-12 p-1.5 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-slate-50 text-center" placeholder="10"/>
              <span className="text-xs text-slate-500">reps</span>
            </div>
          ))}
          {bestWeight>0&&<div className="text-xs font-black text-emerald-600 mt-2">💪 PB: {bestWeight}kg</div>}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ClientView (مع Category Tabs)
// ══════════════════════════════════════════════════════════════════════════════
function ClientView({ workouts, db, appId, identifier, allLogs }) {
  const [selectedDay, setSelectedDay]         = useState('');
  const [note, setNote]                       = useState('');
  const [sessionFinished, setSessionFinished] = useState(false);
  const [showSummary, setShowSummary]         = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const days = useMemo(()=>{
    return [...new Set(workouts.map(w=>w.day))].filter(Boolean).sort((a,b)=>{
      const aNum = parseInt(a.split(' ')[1]) || 999;
      const bNum = parseInt(b.split(' ')[1]) || 999;
      return aNum - bNum;
    });
  },[workouts]);

  useEffect(()=>{ if(days.length>0&&!selectedDay) setSelectedDay(days[0]); },[days,selectedDay]);
  useBackButton(showSummary,()=>setShowSummary(false));

  const filtered = workouts.filter(w=>w.day===selectedDay).sort((a,b)=>a.orderIndex-b.orderIndex);

  // Group exercises by category
  const exercisesByCategory = useMemo(()=>{
    const grouped = {};
    CATEGORIES.forEach(cat=>grouped[cat]=[]);
    filtered.forEach(ex=>{
      const cat = ex.category || 'RESISTANCE';
      if(!grouped[cat]) grouped[cat]=[];
      grouped[cat].push(ex);
    });
    return grouped;
  },[filtered]);

  const summaryData = useMemo(()=>{
    const today=new Date().toLocaleDateString('ar-EG');
    const tl=allLogs.filter(l=>l.clientName===identifier&&l.completedAt?.toDate().toLocaleDateString('ar-EG')===today);
    return{count:tl.length,totalSets:tl.reduce((a,l)=>a+(l.setsData?.length||0),0),prs:tl.filter(l=>l.isPR)};
  },[allLogs,identifier]);

  const toggleCategory = (cat) => {
    setExpandedCategories(p=>({...p,[cat]:!p[cat]}));
  };

  return(
    <div className="max-w-xl mx-auto p-4 space-y-5 font-black">
      {showSummary&&(
        <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-white border-2 border-slate-200 rounded-[3rem] p-8 w-full max-w-sm shadow-2xl text-center space-y-5">
            <div className="text-5xl">🎉</div>
            <h2 className="font-black text-2xl text-slate-900">Session Done!</h2>
            <div className="grid grid-cols-3 gap-3">
              {[{l:'Exercises',v:summaryData.count},{l:'Sets',v:summaryData.totalSets},{l:'PRs 🏆',v:summaryData.prs.length}].map((s,i)=>(
                <div key={i} className="p-4 rounded-2xl bg-slate-50">
                  <span className="text-2xl font-black text-emerald-500 block">{s.v}</span>
                  <p className="text-[10px] font-black mt-1 text-slate-500">{s.l}</p>
                </div>
              ))}
            </div>
            {summaryData.prs.length>0&&(
              <div className="p-4 rounded-2xl border-2 border-yellow-300 bg-yellow-50">
                <p className="text-[11px] font-black text-yellow-600 mb-1">New PRs 🏆</p>
                {summaryData.prs.map((pr,i)=><p key={i} className="text-xs font-black text-slate-900">{formatName(pr.exerciseName)}</p>)}
              </div>
            )}
            <button onClick={()=>setShowSummary(false)} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">Close</button>
          </div>
        </div>
      )}

      {/* Day Selection Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
        {days.map((d,i)=>(
          <button key={d} onClick={()=>{setSelectedDay(d);setExpandedCategories({});}}
            className={`px-7 py-4 rounded-[2rem] font-black text-sm transition-all shrink-0 shadow-lg border-2 ${selectedDay===d?'bg-slate-900 text-emerald-400 border-slate-900 scale-105':'bg-white border-slate-200 text-slate-400'}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Category Tabs with Collapsible Exercises */}
      <div className="space-y-2">
        {CATEGORIES.map(cat=>{
          const exercises = exercisesByCategory[cat];
          const isExpanded = expandedCategories[cat];
          if(exercises.length===0) return null;

          return(
            <div key={cat}>
              {/* Category Tab Button */}
              <button
                onClick={()=>toggleCategory(cat)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-emerald-400 font-black text-sm transition-all hover:bg-slate-800 border-2 border-slate-800">
                <div className="flex items-center gap-2">
                  <span>{isExpanded?'▼':'▶'}</span>
                  <span className="uppercase">{cat}</span>
                  <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full">{exercises.length}</span>
                </div>
              </button>

              {/* Expanded Exercises */}
              {isExpanded&&(
                <div className="space-y-3 mt-2 ml-2 border-l-2 border-slate-200 pl-4">
                  {exercises.map(ex=>(
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      db={db}
                      appId={appId}
                      identifier={identifier}
                      allLogs={allLogs}
                      sessionFinished={sessionFinished}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length===0&&(
          <div className="py-32 text-center text-2xl font-black uppercase opacity-20 tracking-widest text-slate-900">No Workouts</div>
        )}
      </div>

      {/* Session Controls */}
      <div className="pt-4 pb-20 space-y-4">
        <div className="flex gap-3">
          <button onClick={()=>{setSessionFinished(true);setShowSummary(true);}}
            className="flex-[2] bg-emerald-500 text-slate-900 font-black py-6 rounded-[2rem] shadow-2xl text-lg border-b-[8px] border-emerald-800 active:border-b-0 active:scale-95 transition-all uppercase flex items-center justify-center gap-2">
            ✅ Finish Session
          </button>
          <button onClick={()=>window.open('https://wa.me/201500807824','_blank')}
            className="flex-1 bg-slate-800 text-emerald-400 font-black py-6 rounded-[2rem] shadow-xl text-sm flex flex-col items-center justify-center gap-1 transition-all active:scale-95">
            <span className="text-2xl">💬</span>
            <span className="text-[9px] uppercase">WhatsApp</span>
          </button>
        </div>
        <div className="relative bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-lg overflow-hidden">
          <textarea placeholder="Message Coach..." rows={3} className="w-full p-5 text-sm font-bold outline-none bg-transparent text-left resize-none text-slate-900" value={note} onChange={e=>setNote(e.target.value)}/>
          <button onClick={async()=>{
            if(!note)return;
            await addDoc(collection(db,'artifacts',appId,'public','data','user_notes'),{clientName:identifier,note,timestamp:serverTimestamp()});
            setNote('');alert('Sent ✅');
          }} className="absolute bottom-4 right-4 bg-slate-900 text-emerald-400 px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl">Send</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main App
// ══════════════════════════════════════════════════════════════════════════════
export default function WorkoutApp() {
  const [user, setUser]             = useState(null);
  const [authStep, setAuthStep]     = useState(localStorage.getItem('gofit_user')?'authenticated':'login');
  const [identifier, setIdentifier] = useState(localStorage.getItem('gofit_user')||'');
  const [role, setRole]             = useState(localStorage.getItem('gofit_role')||'client');
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
    signInAnonymously(auth).catch(console.error);
    const u=onAuthStateChanged(auth,au=>{setUser(au);setIsLoading(false);});
    return()=>u();
  },[]);

  useEffect(()=>{
    if(!user||authStep!=='authenticated')return;
    const u1=onSnapshot(collection(db,'artifacts',APP_ID,'public','data','client_names'),s=>{
      const m={};s.forEach(d=>{m[d.id]=d.data();});setClientRegistry(m);
    });
    const u2=onSnapshot(query(collection(db,'artifacts',APP_ID,'public','data','workouts'),orderBy('orderIndex','asc')),s=>
      setWorkouts(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    const u3=onSnapshot(collection(db,'artifacts',APP_ID,'public','data','logs'),s=>
      setAllLogs(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    return()=>{u1();u2();u3();};
  },[user,authStep]);

  const clientName=clientRegistry[identifier]?.name||identifier;
  const doLogin=()=>{
    if(!identifier.trim())return;
    const r=identifier.toLowerCase()===TRAINER_MAIL.toLowerCase()?'trainer':'client';
    localStorage.setItem('gofit_user',identifier);localStorage.setItem('gofit_role',r);setRole(r);setAuthStep('authenticated');
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
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase block tracking-widest text-slate-400">Access Key</label>
            <input type="text" placeholder="Enter ID" value={identifier} onChange={e=>setIdentifier(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()}
              className="w-full p-4 border-2 rounded-2xl text-center font-black text-xl outline-none focus:border-emerald-500 transition-all bg-slate-50 border-slate-200 text-slate-900"/>
          </div>
          <button onClick={doLogin} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-xl shadow-xl uppercase active:scale-95 transition-all border-b-4 border-slate-800 active:border-b-0">Login</button>
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
            <button onClick={()=>{localStorage.clear();window.location.reload();}} className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase">Logout</button>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-4 pt-20">
        {role==='trainer'
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
