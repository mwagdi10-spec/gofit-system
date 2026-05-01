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
const TRAINER_MAIL = "admin@gofit.com";
const CATEGORIES   = ['WARM-UP','ACTIVATION','SKILL','RESISTANCE','CARDIO','COOL-DOWN'];
const GEMINI_KEY   = "AIzaSyBH174p9h9yFpsnGVvLK2u0c9PCBv5T5mk";

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

// ─── Searchable Dropdown ──────────────────────────────────────────────────────
function SearchableDropdown({ options, value, onChange, placeholder = 'Search exercise...' }) {
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
            {filtered.length === 0
              ? <div className="p-3 text-center text-slate-400 text-xs font-black">No results</div>
              : filtered.map(o => (
                <div key={o.id} onMouseDown={() => { onChange(o.name); setQ(''); setOpen(false); }} className="p-3 text-left text-sm font-black hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0">
                  {formatName(o.name)}
                </div>
              ))
            }
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
  const clients = useMemo(() =>
    Object.entries(clientNames)
      .map(([phone, data]) => ({ phone, name: typeof data === 'object' ? data.name || phone : data || phone }))
      .filter(c => /^[\d\+]{7,15}$/.test(c.phone))
      .sort((a, b) => a.name.localeCompare(b.name))
  , [clientNames]);
  const selected = clients.find(c => c.phone === value);
  return (
    <div ref={ref} className="relative w-full">
      <div onClick={() => setOpen(o => !o)} className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-sm cursor-pointer flex justify-between items-center gap-2 select-none">
        <span className="text-slate-400 text-xs">▾</span>
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>{selected ? titleCase(selected.name) : placeholder}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {clients.length === 0
              ? <div className="p-3 text-center text-slate-400 text-xs font-black">No clients yet</div>
              : clients.map(c => (
                <div key={c.phone} onMouseDown={() => { onChange(c.phone); setOpen(false); }}
                  className="p-3 text-left text-sm font-black hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center">
                  <span>{titleCase(c.name)}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{c.phone}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────
function AddClientModal({ onClose, db, appId }) {
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(); const phoneRef = useRef(); const ageRef = useRef();
  const heightRef = useRef(); const injuriesRef = useRef();
  const [gender, setGender] = useState('Male');
  const [goal, setGoal]     = useState('Weight Loss');
  const [level, setLevel]   = useState('Beginner');
  const [days, setDays]     = useState('3');
  useBackButton(true, onClose);
  const handleSave = async () => {
    const name = nameRef.current?.value?.trim(); const phone = phoneRef.current?.value?.trim();
    if (!name || !phone) { alert('Name and phone are required'); return; }
    setSaving(true);
    try {
      await setDoc(doc(db,'artifacts',appId,'public','data','client_names',phone), {
        name, phone, age: ageRef.current?.value?.trim(), gender,
        height: heightRef.current?.value?.trim(), goal, level,
        injuries: injuriesRef.current?.value?.trim(), daysPerWeek: days, createdAt: serverTimestamp()
      });
      onClose();
    } catch (e) { console.error(e); setSaving(false); }
  };
  const inp = 'bg-slate-50 border-slate-200 text-slate-900';
  const Field = ({ label, children }) => (
    <div><label className="text-[10px] font-black uppercase block mb-1 text-slate-500">{label}</label>{children}</div>
  );
  return (
    <div className="fixed inset-0 z-[998] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-5 flex justify-between items-center">
          <button onClick={onClose} className="text-slate-400 font-black text-sm hover:text-white">✕ Cancel</button>
          <span className="text-emerald-400 font-black text-base uppercase tracking-widest">New Client</span>
        </div>
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          <Field label="Full Name *"><input ref={nameRef} type="text" defaultValue="" placeholder="Client Name" autoComplete="off" className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`} /></Field>
          <Field label="Phone Number *"><input ref={phoneRef} type="text" defaultValue="" placeholder="01xxxxxxxxx" autoComplete="off" className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age"><input ref={ageRef} type="number" defaultValue="" placeholder="25" className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`} /></Field>
            <Field label="Gender"><select value={gender} onChange={e => setGender(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm ${inp}`}><option>Male</option><option>Female</option></select></Field>
          </div>
          <Field label="Height (cm)"><input ref={heightRef} type="number" defaultValue="" placeholder="175" className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`} /></Field>
          <Field label="Main Goal"><select value={goal} onChange={e => setGoal(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm ${inp}`}><option>Weight Loss</option><option>Muscle Gain</option><option>General Fitness</option></select></Field>
          <Field label="Fitness Level"><select value={level} onChange={e => setLevel(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm ${inp}`}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></Field>
          <Field label="Days / Week"><select value={days} onChange={e => setDays(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm ${inp}`}>{['2','3','4','5','6'].map(d => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Injuries / Health Issues"><textarea ref={injuriesRef} defaultValue="" placeholder="Any injuries or health concerns..." rows={2} className={`w-full p-3 border-2 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 resize-none ${inp}`} /></Field>
        </div>
        <div className="p-5 border-t border-slate-200">
          <button onClick={handleSave} disabled={saving} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-50">{saving ? 'Saving...' : '+ Add Client'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Client Modal ────────────────────────────────────────────────────────
function EditClientModal({ client, onClose, db, appId }) {
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(); const ageRef = useRef(); const heightRef = useRef(); const injuriesRef = useRef();
  const [gender, setGender] = useState(client.gender || 'Male');
  const [goal, setGoal]     = useState(client.goal || 'Weight Loss');
  const [level, setLevel]   = useState(client.level || 'Beginner');
  const [days, setDays]     = useState(client.daysPerWeek || '3');
  useBackButton(true, onClose);
  const handleSave = async () => {
    const name = nameRef.current?.value?.trim();
    if (!name) { alert('Name is required'); return; }
    setSaving(true);
    try {
      await setDoc(doc(db,'artifacts',appId,'public','data','client_names',client.phone), {
        name, phone: client.phone, age: ageRef.current?.value?.trim(), gender,
        height: heightRef.current?.value?.trim(), goal, level,
        injuries: injuriesRef.current?.value?.trim(), daysPerWeek: days,
        createdAt: client.createdAt || serverTimestamp()
      }, { merge: true });
      onClose();
    } catch (e) { console.error(e); setSaving(false); }
  };
  const handleDelete = async () => {
    if (!window.confirm(`Delete client "${client.name}"?`)) return;
    try { await deleteDoc(doc(db,'artifacts',appId,'public','data','client_names',client.phone)); onClose(); }
    catch (e) { console.error(e); }
  };
  const inp = 'bg-slate-50 border-slate-200 text-slate-900';
  const Field = ({ label, children }) => (
    <div><label className="text-[10px] font-black uppercase block mb-1 text-slate-500">{label}</label>{children}</div>
  );
  return (
    <div className="fixed inset-0 z-[998] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-5 flex justify-between items-center">
          <button onClick={onClose} className="text-slate-400 font-black text-sm hover:text-white">✕ Cancel</button>
          <span className="text-emerald-400 font-black text-base uppercase tracking-widest">Edit Client</span>
        </div>
        <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">
          <Field label="Full Name *"><input ref={nameRef} type="text" defaultValue={client.name||''} placeholder="Client Name" autoComplete="off" className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`} /></Field>
          <Field label="Phone (read-only)"><div className={`w-full p-3 border-2 rounded-2xl font-black text-sm opacity-50 bg-slate-50 border-slate-200`}>{client.phone}</div></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age"><input ref={ageRef} type="number" defaultValue={client.age||''} placeholder="25" className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`} /></Field>
            <Field label="Gender"><select value={gender} onChange={e => setGender(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm ${inp}`}><option>Male</option><option>Female</option></select></Field>
          </div>
          <Field label="Height (cm)"><input ref={heightRef} type="number" defaultValue={client.height||''} placeholder="175" className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`} /></Field>
          <Field label="Main Goal"><select value={goal} onChange={e => setGoal(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm ${inp}`}><option>Weight Loss</option><option>Muscle Gain</option><option>General Fitness</option></select></Field>
          <Field label="Fitness Level"><select value={level} onChange={e => setLevel(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm ${inp}`}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></Field>
          <Field label="Days / Week"><select value={days} onChange={e => setDays(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm ${inp}`}>{['2','3','4','5','6'].map(d => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Injuries / Health Issues"><textarea ref={injuriesRef} defaultValue={client.injuries||''} placeholder="Any injuries..." rows={2} className={`w-full p-3 border-2 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 resize-none ${inp}`} /></Field>
        </div>
        <div className="p-5 border-t border-slate-200 space-y-3">
          <button onClick={handleSave} disabled={saving} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-50">{saving ? 'Saving...' : '💾 Save Changes'}</button>
          <button onClick={handleDelete} className="w-full bg-red-50 text-red-500 border-2 border-red-200 py-3 rounded-2xl font-black text-sm uppercase active:scale-95 transition-all">🗑 Delete Client</button>
        </div>
      </div>
    </div>
  );
}

// ─── Client Profile Modal — with View Plan button ─────────────────────────────
function ClientProfileModal({ client, onClose, onEdit, onViewPlan }) {
  useBackButton(!!client, onClose);
  if (!client) return null;
  const fields = [
    { label:'Phone',     val:client.phone },
    { label:'Age',       val:client.age ? `${client.age} yrs` : '—' },
    { label:'Gender',    val:client.gender || '—' },
    { label:'Height',    val:client.height ? `${client.height} cm` : '—' },
    { label:'Goal',      val:client.goal || '—' },
    { label:'Level',     val:client.level || '—' },
    { label:'Days/Week', val:client.daysPerWeek ? `${client.daysPerWeek} days` : '—' },
    { label:'Injuries',  val:client.injuries || 'None' },
  ];
  return (
    <div className="fixed inset-0 z-[998] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900 p-5 flex justify-between items-center">
          <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
          <span className="text-emerald-400 font-black text-base">{titleCase(client.name)}</span>
        </div>
        <div className="p-5 space-y-2 max-h-[50vh] overflow-y-auto">
          {fields.map(f => (
            <div key={f.label} className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
              <span className="text-xs font-black text-slate-500 uppercase">{f.label}</span>
              <span className="text-sm font-black text-slate-900">{f.val}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200 grid grid-cols-3 gap-2">
          <button onClick={onViewPlan} className="col-span-1 bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">📋 Plan</button>
          <button onClick={onEdit} className="col-span-1 bg-slate-900 text-emerald-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">✏️ Edit</button>
          <button onClick={onClose} className="col-span-1 border-2 border-slate-200 text-slate-400 py-3 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Day Template Modal ───────────────────────────────────────────────────────
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
          <span className="text-emerald-400 font-black text-sm uppercase">Assign Full Day ({selected.length} selected)</span>
        </div>
        <div className="p-4 border-b border-slate-100 shrink-0 space-y-2">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..." className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50" />
          <div className="flex flex-wrap gap-1">
            {['ALL',...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${catFilter===cat?'bg-emerald-500 text-white':'bg-slate-100 text-slate-500'}`}>{cat}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map(ex => {
            const isSel = selected.includes(ex.id);
            return (
              <div key={ex.id} onClick={() => toggle(ex.id)}
                className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${isSel?'border-emerald-500 bg-emerald-50':'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
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
          <button onClick={handleAssign} disabled={saving||!selected.length}
            className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40">
            {saving ? 'Assigning...' : `Assign ${selected.length} Exercises ✅`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Client Plan View Modal ───────────────────────────────────────────────────
function ClientPlanModal({ client, workouts, onClose }) {
  useBackButton(!!client, onClose);
  if (!client) return null;
  const clientWorkouts = workouts.filter(w => w.assignedTo === client.phone);
  const days = [...new Set(clientWorkouts.map(w => w.day))].filter(Boolean).sort();
  const [selectedDay, setSelectedDay] = useState(days[0] || '');
  const dayWorkouts = clientWorkouts.filter(w => w.day === selectedDay).sort((a,b) => a.orderIndex - b.orderIndex);
  return (
    <div className="fixed inset-0 z-[998] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight:'85vh' }} onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900 p-5 flex justify-between items-center shrink-0">
          <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
          <span className="text-emerald-400 font-black text-base">{titleCase(client.name)} — Plan</span>
        </div>
        {/* Day tabs */}
        <div className="p-4 border-b border-slate-100 shrink-0">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {days.length === 0
              ? <p className="text-xs font-black text-slate-400 w-full text-center py-2">No days assigned yet</p>
              : days.map((d, i) => (
                <button key={d} onClick={() => setSelectedDay(d)}
                  className={`px-5 py-2.5 rounded-2xl font-black text-xs shrink-0 transition-all border-2 ${selectedDay===d?'bg-slate-900 text-emerald-400 border-slate-900':'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  Day {i+1}
                </button>
              ))
            }
          </div>
        </div>
        {/* Exercises */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {dayWorkouts.length === 0
            ? <div className="text-center py-16 text-slate-300 font-black text-xl uppercase tracking-widest">No Exercises</div>
            : dayWorkouts.map((ex, i) => (
              <div key={ex.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                <span className="w-7 h-7 bg-slate-900 text-emerald-400 rounded-full flex items-center justify-center font-black text-xs shrink-0">{i+1}</span>
                <div className="text-left flex-1">
                  <span className="font-black text-sm text-slate-900 capitalize">{formatName(ex.name)}</span>
                  <p className="text-[10px] font-bold text-slate-500">{ex.sets} sets × {ex.reps} reps{ex.tempo ? ` · ${ex.tempo}` : ''}</p>
                  {ex.coachNote && <p className="text-[10px] text-emerald-500 font-bold">💬 {ex.coachNote}</p>}
                </div>
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                  getMuscleGroup(ex.name) ? 'text-white' : 'bg-slate-100 text-slate-400'
                }`} style={getMuscleGroup(ex.name) ? { background: MUSCLE_COLORS[getMuscleGroup(ex.name)] || '#94a3b8' } : {}}>
                  {getMuscleGroup(ex.name) || ex.category}
                </span>
              </div>
            ))
          }
        </div>
        <div className="p-4 border-t border-slate-100 shrink-0">
          <p className="text-center text-[10px] font-black text-slate-400">{clientWorkouts.length} total exercises across {days.length} days</p>
        </div>
      </div>
    </div>
  );
}

// ─── AI Assistant — Gemini ────────────────────────────────────────────────────
function AIAssistant({ onClose, clientData }) {
  const [messages, setMessages] = useState([
    { role: 'model', content: 'مرحباً Coach! 👋\nأنا GoFit AI — اسألني في أي حاجة تخص التدريب أو العملاء أو NASM OPT.' }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);
  useBackButton(true, onClose);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
    setMessages(p => [...p, { role:'user', content:userMsg }]);
    setLoading(true);
    try {
      // Build Gemini chat history (exclude first greeting)
      const history = messages.slice(1).map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }]
      }));

      const systemPrompt = `أنت GoFit AI، مساعد ذكي متخصص في التدريب الرياضي واللياقة البدنية بناءً على NASM OPT Model. تساعد المدرب الشخصي. أجب بإيجاز وعملياً باللغة العربية أو الإنجليزية حسب سؤال المستخدم. ${clientData?.length ? `بيانات العملاء الحاليين: ${JSON.stringify(clientData.map(c => ({ name:c.name, goal:c.goal, level:c.level })))}` : ''}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [...history, { role:'user', parts:[{ text:userMsg }] }],
            generationConfig: { maxOutputTokens:1000, temperature:0.7 }
          })
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data  = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'حدث خطأ، حاول مجدداً.';
      setMessages(p => [...p, { role:'model', content:reply }]);
    } catch (e) {
      setMessages(p => [...p, { role:'model', content:`❌ خطأ في الاتصال: ${e.message}` }]);
    }
    setLoading(false);
  }, [input, loading, messages, clientData]);

  return (
    <div className="fixed inset-0 z-[997] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ height:'80vh' }}>
        <div className="bg-slate-900 p-4 flex justify-between items-center shrink-0">
          <button onClick={onClose} className="text-slate-400 font-black text-sm">✕</button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-400 font-black text-sm uppercase tracking-widest">GoFit AI</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-bold leading-relaxed whitespace-pre-wrap ${m.role==='user'?'bg-slate-900 text-emerald-400 rounded-br-md':'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="p-3 rounded-2xl rounded-bl-md bg-slate-100">
                <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="p-4 border-t border-slate-200 shrink-0">
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask GoFit AI..." className="flex-1 p-3 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 bg-slate-50" />
            <button onClick={send} disabled={loading||!input.trim()} className="bg-emerald-500 text-white px-5 rounded-2xl font-black text-sm disabled:opacity-40 active:scale-95 transition-all">↑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ExerciseRow
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
  const isSingle = setsCount === 1;

  return (
    <>
      {showGif&&exercise.gifUrl&&<GifPopup url={exercise.gifUrl} onClose={()=>setShowGif(false)}/>}
      <div className={`p-5 mb-4 rounded-[2.5rem] border-[2.5px] shadow-lg transition-all duration-300 bg-white ${saved?'!border-emerald-500 shadow-emerald-100 bg-emerald-50/30':isSkipped?'opacity-40 grayscale border-slate-200':'border-slate-200'}`}>
        <div className="flex flex-col gap-4 font-black">
          <div className="flex flex-col gap-2 text-left">
            <h3 onClick={()=>exercise.gifUrl&&setShowGif(true)}
              className={`text-lg font-black capitalize tracking-tight leading-snug text-left ${exercise.gifUrl?'cursor-pointer underline decoration-dotted decoration-emerald-400 underline-offset-4':''} text-slate-900`}>
              {formatName(exercise.name)}
            </h3>
            <div className="flex flex-wrap gap-2 justify-start">
              <span className="px-3 py-1 rounded-xl text-[10px] font-black border bg-blue-50 text-blue-600 border-blue-100">Best: {bestWeight}kg</span>
              {exercise.tempo&&<span className="px-3 py-1 rounded-xl text-[10px] font-black border bg-slate-900 text-emerald-400 border-slate-800">Tempo: {exercise.tempo}</span>}
              <span className="px-3 py-1 rounded-xl text-[10px] font-black border bg-slate-50 text-slate-500 border-slate-200">Rest: 60-90s</span>
            </div>
            {exercise.coachNote&&<div className="text-[11px] font-bold px-3 py-2 rounded-xl border-l-4 border-emerald-500 bg-emerald-50 text-slate-600">💬 {exercise.coachNote}</div>}
          </div>

          {isSingle ? (
            <div className="flex justify-center">
              <div className={`w-28 border-[2.5px] rounded-[1.8rem] p-4 flex flex-col items-center shadow-md ${saved?'border-emerald-500 bg-white':'border-slate-200 bg-slate-50'}`}>
                <span className="text-[9px] mb-2 font-black uppercase tracking-widest text-slate-400">S1</span>
                <input type="number" inputMode="decimal" value={sets[0].weight}
                  onChange={e=>{setSets([{...sets[0],weight:e.target.value}]);setIsSaved(false);}}
                  className="w-full text-center font-black text-xl outline-none bg-transparent text-slate-900" placeholder="0"/>
                <span className="text-[8px] font-black text-slate-400 mb-1">KG</span>
                <div className="w-6 border-t border-slate-200 my-1"/>
                <input type="text" value={sets[0].reps}
                  onChange={e=>{setSets([{...sets[0],reps:e.target.value}]);setIsSaved(false);}}
                  className="w-full text-center font-bold text-sm outline-none bg-transparent text-slate-500"/>
                <span className="text-[9px] font-black text-slate-500">RPS</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-row gap-3 overflow-x-auto pb-1 hide-scrollbar">
              {sets.map((s,i)=>(
                <div key={i} className={`min-w-[88px] border-[2.5px] rounded-[1.8rem] p-4 flex flex-col items-center shadow-md transition-all ${saved?'border-emerald-500 bg-white':'border-slate-200 bg-slate-50'}`}>
                  <span className="text-[9px] mb-2 font-black uppercase tracking-widest text-slate-400">S{i+1}</span>
                  <input type="number" inputMode="decimal" value={s.weight}
                    onChange={e=>{const n=[...sets];n[i]={...n[i],weight:e.target.value};setSets(n);setIsSaved(false);}}
                    className="w-full text-center font-black text-xl outline-none bg-transparent text-slate-900" placeholder="0"/>
                  <span className="text-[8px] font-black text-slate-400 mb-1">KG</span>
                  <div className="w-6 border-t border-slate-200 my-1"/>
                  <input type="text" value={s.reps}
                    onChange={e=>{const n=[...sets];n[i]={...n[i],reps:e.target.value};setSets(n);setIsSaved(false);}}
                    className="w-full text-center font-bold text-sm outline-none bg-transparent text-slate-500"/>
                  <span className="text-[9px] font-black text-slate-500">RPS</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={()=>!isSaved&&setIsSkipped(p=>!p)}
              className={`w-24 py-4 rounded-[1.5rem] font-black text-xs uppercase border-2 transition-all ${isSkipped?'bg-red-500 text-white border-red-500':'border-slate-300 text-slate-500 bg-slate-50 hover:border-red-300 hover:text-red-400'}`}>Skip</button>
            <button onClick={handleSave} disabled={isSkipped}
              className={`flex-1 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 ${saved?'bg-emerald-500 text-white shadow-emerald-200':'bg-slate-900 text-emerald-400'}`}>
              {saved?'✓ Saved':'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TrainerDashboard
// ══════════════════════════════════════════════════════════════════════════════
function TrainerDashboard({ workouts, logs, db, appId, clientNames, onNavigateToPlan }) {
  const [activeTab, setActiveTab]         = useState('clients');
  const [targetClient, setTargetClient]   = useState('');
  const [sessionName, setSessionName]     = useState('');
  const [libraryData, setLibraryData]     = useState([]);
  const [inboxNotes, setInboxNotes]       = useState([]);
  const [newEx, setNewEx]                 = useState({name:'',category:'RESISTANCE',sets:'3',reps:'10',tempo:'',coachNote:''});
  const [libName, setLibName]             = useState('');
  const [libCat, setLibCat]               = useState('RESISTANCE');
  const [libGif, setLibGif]               = useState('');
  const [analyticsClient, setAnalyticsClient] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [profileClient, setProfileClient] = useState(null);
  const [editClient, setEditClient]       = useState(null);
  const [planClient, setPlanClient]       = useState(null);
  const [showAI, setShowAI]               = useState(false);
  const [expandedDate, setExpandedDate]   = useState(null);
  const [libFilter, setLibFilter]         = useState('ALL');
  const [libSearch, setLibSearch]         = useState('');
  const [showTemplate, setShowTemplate]   = useState(false);

  // Expose tab switcher to parent
  useEffect(() => {
    if (onNavigateToPlan?.phone) {
      setTargetClient(onNavigateToPlan.phone);
      setActiveTab('plan');
    }
  }, [onNavigateToPlan]);

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'artifacts',appId,'public','data','library'),s=>
      setLibraryData(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||'')))
    );
    const u2=onSnapshot(query(collection(db,'artifacts',appId,'public','data','user_notes'),orderBy('timestamp','desc')),s=>
      setInboxNotes(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    return()=>{u1();u2();};
  },[db,appId]);

  const handleCSV=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=async ev=>{
      const lines=ev.target.result.split('\n').map(l=>l.trim()).filter(Boolean);
      for(const line of lines){const[name,category='RESISTANCE']=line.split(',');if(name)await addDoc(collection(db,'artifacts',appId,'public','data','library'),{name:name.trim(),category:category.trim()});}
      alert(`Imported ${lines.length} exercises ✅`);
    };
    reader.readAsText(file);e.target.value='';
  };

  const radarData=useMemo(()=>{
    const reg=Object.keys(clientNames);
    const logP=[...new Set(logs.map(l=>l.clientName))].filter(p=>!reg.includes(p));
    const all=[...reg,...logP].filter(p=>/^[\d\+]{7,15}$/.test(p)||!!clientNames[p]?.name);
    return[...new Set(all)].map(p=>{
      const uLogs=logs.filter(l=>l.clientName===p).sort((a,b)=>b.completedAt?.toDate()-a.completedAt?.toDate());
      const diff=uLogs[0]?Math.floor((new Date()-uLogs[0].completedAt.toDate())/86400000):999;
      const todayLogs=logs.filter(l=>l.clientName===p&&l.completedAt?.toDate().toDateString()===new Date().toDateString());
      const total=workouts.filter(w=>w.assignedTo===p).length;
      const pct=total>0?Math.round((todayLogs.length/total)*100):0;
      const obj=clientNames[p];
      const name=typeof obj==='object'?obj?.name||p:obj||p;
      return{phone:p,name,diff,pct};
    }).sort((a,b)=>a.diff-b.diff);
  },[logs,clientNames,workouts]);

  const archiveGroups=useMemo(()=>{
    const groups={};
    logs.filter(l=>l.clientName===targetClient).forEach(log=>{
      const d=log.completedAt?.toDate().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})||'Pending';
      if(!groups[d])groups[d]=[];
      groups[d].push(log);
    });
    return Object.entries(groups).sort((a,b)=>new Date(b[0])-new Date(a[0]));
  },[logs,targetClient]);

  // Analytics: muscle group progression
  const muscleChartData = useMemo(()=>{
    const clientLogs = logs.filter(l=>l.clientName===analyticsClient);
    const muscleMap  = {};
    clientLogs.forEach(log=>{
      const muscle = getMuscleGroup(log.exerciseName||'');
      if(!muscle) return;
      const maxW = Math.max(...(log.setsData?.map(s=>parseFloat(s.weight)||0)||[0]));
      if(!muscleMap[muscle]) muscleMap[muscle]=[];
      muscleMap[muscle].push({
        date: log.completedAt?.toDate().toLocaleDateString('en-US',{month:'short',day:'numeric'}),
        weight: maxW,
        ts: log.completedAt?.toDate().getTime()||0
      });
    });
    // Get all unique dates sorted
    const allDates=[...new Set(Object.values(muscleMap).flatMap(arr=>arr.map(e=>e.date)))].sort((a,b)=>{
      const aTs=Object.values(muscleMap).flatMap(arr=>arr).find(e=>e.date===a)?.ts||0;
      const bTs=Object.values(muscleMap).flatMap(arr=>arr).find(e=>e.date===b)?.ts||0;
      return aTs-bTs;
    });
    // Top muscles by session count
    const topMuscles=Object.entries(muscleMap).sort((a,b)=>b[1].length-a[1].length).slice(0,5).map(([k])=>k);
    // For each date, get max weight per muscle
    const data=allDates.map(date=>{
      const point={date};
      topMuscles.forEach(m=>{
        const entries=muscleMap[m]?.filter(e=>e.date===date);
        if(entries?.length) point[m]=Math.max(...entries.map(e=>e.weight));
      });
      return point;
    });
    return{data,muscles:topMuscles};
  },[logs,analyticsClient]);

  const filteredLibrary=useMemo(()=>
    libraryData.filter(ex=>{
      const matchCat=libFilter==='ALL'||ex.category===libFilter;
      const matchQ=!libSearch||ex.name.toLowerCase().includes(libSearch.toLowerCase());
      return matchCat&&matchQ;
    }),[libraryData,libFilter,libSearch]);

  // Client days for Plan tab
  const clientDays=useMemo(()=>[...new Set(workouts.filter(w=>w.assignedTo===targetClient).map(w=>w.day))].filter(Boolean).sort(),[workouts,targetClient]);

  const bg   ='bg-white border-slate-200';
  const tx   ='text-slate-900';
  const sub  ='text-slate-500';
  const inp  ='bg-slate-50 border-slate-200 text-slate-900';
  const rowbg='bg-slate-50 border-slate-100';

  const tabs=[
    {id:'clients',label:'Clients 👥'},
    {id:'plan',   label:'Plan 🛠'},
    {id:'library',label:'Library 📚'},
    {id:'analytics',label:'Analytics 📊'},
    {id:'inbox',  label:'Inbox 📩'},
  ];

  return(
    <div className="space-y-5 font-black">
      {showAddClient&&<AddClientModal onClose={()=>setShowAddClient(false)} db={db} appId={appId}/>}
      {profileClient&&!editClient&&!planClient&&(
        <ClientProfileModal
          client={profileClient}
          onClose={()=>setProfileClient(null)}
          onEdit={()=>setEditClient(profileClient)}
          onViewPlan={()=>{setPlanClient(profileClient);setProfileClient(null);}}
        />
      )}
      {editClient&&<EditClientModal client={editClient} onClose={()=>{setEditClient(null);setProfileClient(null);}} db={db} appId={appId}/>}
      {planClient&&<ClientPlanModal client={planClient} workouts={workouts} onClose={()=>setPlanClient(null)}/>}
      {showAI&&<AIAssistant onClose={()=>setShowAI(false)} clientData={radarData}/>}
      {showTemplate&&(
        <DayTemplateModal onClose={()=>setShowTemplate(false)} db={db} appId={appId}
          libraryData={libraryData} targetClient={targetClient} sessionName={sessionName}/>
      )}

      {/* Tab Bar */}
      <div className={`flex flex-wrap gap-2 justify-center sticky top-0 z-40 backdrop-blur-md p-3 rounded-2xl border shadow-lg bg-white/95 border-slate-200`}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wide transition-all ${activeTab===t.id?'bg-slate-900 text-emerald-400':'text-slate-500 hover:bg-slate-100'}`}>
            {t.label}
          </button>
        ))}
        <button onClick={()=>setShowAI(true)} className="px-4 py-2 rounded-xl font-black text-[11px] uppercase bg-emerald-500 text-white hover:bg-emerald-600 transition-all">🤖 AI</button>
      </div>

      {/* ── CLIENTS ── */}
      {activeTab==='clients'&&(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div onClick={()=>setShowAddClient(true)} className={`${bg} border-2 border-dashed p-5 rounded-[2.5rem] flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-all group min-h-[100px]`}>
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl font-black text-slate-300 group-hover:scale-110 transition-all">+</span>
              <span className="text-[10px] font-black uppercase text-slate-500">Add Client</span>
            </div>
          </div>
          {radarData.map(c=>(
            <div key={c.phone}
              onClick={()=>{const full=clientNames[c.phone];setProfileClient(typeof full==='object'?{...full,phone:c.phone}:{name:c.name,phone:c.phone});}}
              className={`${bg} border-2 p-5 rounded-[2.5rem] shadow-sm cursor-pointer hover:border-emerald-500 transition-all`}>
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.diff<=2?'bg-emerald-500 shadow-[0_0_8px_#10b981]':'bg-red-500'}`}/>
                    <h4 className={`text-sm font-black ${tx}`}>{titleCase(c.name)}</h4>
                  </div>
                  <p className={`text-[10px] ${sub} pl-4`}>{c.phone}</p>
                  <div className="pl-4 mt-2 w-32">
                    <div className="h-1.5 rounded-full w-full bg-slate-100">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${c.pct}%`}}/>
                    </div>
                    <span className={`text-[9px] font-black ${sub}`}>today {c.pct}%</span>
                  </div>
                </div>
                <span className={`text-[10px] uppercase font-black ${sub} shrink-0`}>{c.diff===0?'Today':c.diff===999?'Never':`${c.diff}d ago`}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PLAN ── */}
      {activeTab==='plan'&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl space-y-3`}>
            <h4 className={`font-black text-base border-b pb-3 ${tx} border-slate-200`}>Assign Session</h4>

            {/* Client Selector — dropdown by name */}
            <ClientSelector clientNames={clientNames} value={targetClient} onChange={phone=>{setTargetClient(phone);setSessionName('');}} placeholder="Select Client..." />

            {/* Show client info if selected */}
            {targetClient&&clientNames[targetClient]&&(
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black text-sm">
                  {titleCase(clientNames[targetClient]?.name||'')[0]}
                </div>
                <div className="text-left">
                  <p className="font-black text-sm text-slate-900">{titleCase(clientNames[targetClient]?.name||targetClient)}</p>
                  <p className="text-[10px] text-slate-500">{targetClient}</p>
                </div>
                {clientDays.length>0&&(
                  <div className="ml-auto flex gap-1 flex-wrap justify-end">
                    {clientDays.map((d,i)=>(
                      <button key={d} onClick={()=>setSessionName(d)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${sessionName===d?'bg-slate-900 text-emerald-400':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        Day {i+1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <input type="text" placeholder="Day (e.g. Day 1)" value={sessionName} onChange={e=>setSessionName(e.target.value)}
              className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}/>
            <SearchableDropdown options={libraryData} value={newEx.name} onChange={v=>setNewEx({...newEx,name:v})}/>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Sets" value={newEx.sets} onChange={e=>setNewEx({...newEx,sets:e.target.value})} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none text-center focus:border-emerald-500 ${inp}`}/>
              <input type="text" placeholder="Reps" value={newEx.reps} onChange={e=>setNewEx({...newEx,reps:e.target.value})} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none text-center focus:border-emerald-500 ${inp}`}/>
            </div>
            <input type="text" placeholder="Tempo (e.g. 2-0-2-0)" value={newEx.tempo} onChange={e=>setNewEx({...newEx,tempo:e.target.value})} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}/>
            <input type="text" placeholder="Coach Note (optional)" value={newEx.coachNote} onChange={e=>setNewEx({...newEx,coachNote:e.target.value})} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}/>
            <button onClick={async()=>{
              if(!targetClient||!newEx.name)return;
              const libEx=libraryData.find(l=>l.name===newEx.name);
              await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{...newEx,gifUrl:libEx?.gifUrl||'',assignedTo:targetClient,day:sessionName,orderIndex:Date.now()});
              setNewEx({name:'',category:'RESISTANCE',sets:'3',reps:'10',tempo:'',coachNote:''});
              alert('Assigned ✅');
            }} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">Assign Workout +</button>
            <button onClick={()=>setShowTemplate(true)} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-emerald-700 active:border-b-0">📋 Assign Full Day Template</button>
          </div>

          <div className="space-y-5">
            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl flex flex-col h-[380px]`}>
              <h3 className={`font-black text-base border-b pb-3 mb-3 text-left ${tx} border-slate-200`}>Plan View: <span className="text-emerald-500">{sessionName||'---'}</span></h3>
              <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                {workouts.filter(w=>w.assignedTo===targetClient&&w.day===sessionName).sort((a,b)=>a.orderIndex-b.orderIndex).map((ex,idx,arr)=>(
                  <div key={ex.id} className={`flex items-center p-3 rounded-2xl border-2 gap-3 ${rowbg}`}>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button disabled={idx===0} onClick={async()=>{const prev=arr[idx-1];const tmp=ex.orderIndex;await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',ex.id),{orderIndex:prev.orderIndex});await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',prev.id),{orderIndex:tmp});}}
                        className={`text-xs font-black px-2 py-1 rounded-lg transition-all ${idx===0?'opacity-20 cursor-not-allowed':'bg-slate-200 hover:bg-emerald-500 hover:text-white'}`}>▲ Up</button>
                      <button disabled={idx===arr.length-1} onClick={async()=>{const next=arr[idx+1];const tmp=ex.orderIndex;await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',ex.id),{orderIndex:next.orderIndex});await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',next.id),{orderIndex:tmp});}}
                        className={`text-xs font-black px-2 py-1 rounded-lg transition-all ${idx===arr.length-1?'opacity-20 cursor-not-allowed':'bg-slate-200 hover:bg-emerald-500 hover:text-white'}`}>▼ Dn</button>
                    </div>
                    <div className="flex-1 text-left">
                      <span className={`font-black text-sm capitalize ${tx}`}>{formatName(ex.name)}</span>
                      <p className={`text-[10px] font-bold ${sub}`}>{ex.sets} sets × {ex.reps} reps{ex.tempo?` · ${ex.tempo}`:''}</p>
                      {ex.coachNote&&<p className="text-[10px] text-emerald-500 font-bold">💬 {ex.coachNote}</p>}
                    </div>
                    <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','workouts',ex.id))} className="text-red-400 font-black text-[10px] bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-500 hover:text-white transition-all shrink-0">Del</button>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl flex flex-col h-[350px]`}>
              <h3 className="font-black text-sm border-b pb-3 mb-3 text-left uppercase text-emerald-500 border-slate-200">Performance Archive</h3>
              {!targetClient
                ?<p className={`text-xs font-black ${sub} text-center mt-8`}>Select a client above to view history</p>
                :<div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                  {archiveGroups.length===0
                    ?<p className={`text-xs font-black ${sub} text-center mt-8`}>No records yet</p>
                    :archiveGroups.map(([date,entries])=>(
                      <div key={date}>
                        <button onClick={()=>setExpandedDate(expandedDate===date?null:date)} className={`w-full flex justify-between items-center p-3 rounded-xl font-black text-xs hover:bg-emerald-50 transition-all ${rowbg}`}>
                          <span className="font-black text-xs text-slate-600">{entries.length} exercises</span>
                          <span className="font-black text-xs text-emerald-600">{date}</span>
                        </button>
                        {expandedDate===date&&(
                          <div className="mt-2 space-y-2 pl-3 border-l-4 border-emerald-200">
                            {entries.map(e=>(
                              <div key={e.id} className="p-3 rounded-xl text-left bg-white border border-slate-100">
                                <div className="flex justify-between items-center">
                                  <span className="font-black text-xs capitalize text-slate-900">{formatName(e.exerciseName)} {e.isPR?'⭐':''}</span>
                                  <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','logs',e.id))} className="text-red-400 text-[9px] font-black hover:text-red-600">✕</button>
                                </div>
                                {e.setsData&&<div className="flex flex-wrap gap-1 mt-1">{e.setsData.map((s,i)=><span key={i} className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">S{i+1}: {s.weight}kg × {s.reps}</span>)}</div>}
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

      {/* ── LIBRARY ── */}
      {activeTab==='library'&&(
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl space-y-3`}>
            <h4 className={`font-black text-base border-b pb-3 ${tx} border-slate-200`}>New Master Exercise</h4>
            <input type="text" placeholder="Exercise Name" value={libName} onChange={e=>setLibName(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}/>
            <select value={libCat} onChange={e=>setLibCat(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm ${inp}`}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
            <input type="text" placeholder="GIF / Image URL (optional)" value={libGif} onChange={e=>setLibGif(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}/>
            <button onClick={async()=>{if(!libName)return;await addDoc(collection(db,'artifacts',appId,'public','data','library'),{name:libName,category:libCat,gifUrl:libGif});setLibName('');setLibGif('');alert('Added ✅');}}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">Add To Library</button>
            <div className="border-2 border-dashed rounded-2xl p-4 text-center border-slate-200">
              <p className="text-[10px] font-black mb-2 text-slate-500">Import CSV (name, category)</p>
              <label className="bg-slate-900 text-emerald-400 px-5 py-2.5 rounded-xl font-black text-xs uppercase cursor-pointer hover:bg-slate-700 transition-all inline-block">
                📂 Upload CSV<input type="file" accept=".csv" onChange={handleCSV} className="hidden"/>
              </label>
            </div>
          </div>
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl h-[500px] flex flex-col`}>
            <h4 className={`font-black text-sm border-b pb-3 mb-3 uppercase ${tx} border-slate-200`}>Inventory ({filteredLibrary.length})</h4>
            <div className="space-y-2 mb-3">
              <input type="text" placeholder="Search exercise..." value={libSearch} onChange={e=>setLibSearch(e.target.value)} className={`w-full p-2 border-2 rounded-xl font-black text-xs outline-none focus:border-emerald-500 ${inp}`}/>
              <div className="flex flex-wrap gap-1">
                {['ALL',...CATEGORIES].map(cat=>(
                  <button key={cat} onClick={()=>setLibFilter(cat)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${libFilter===cat?'bg-emerald-500 text-white':'bg-slate-100 text-slate-500'}`}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {filteredLibrary.map(ex=>(
                <div key={ex.id} className={`flex items-center justify-between p-3 rounded-2xl border-2 group transition-all ${rowbg}`}>
                  <div className="text-left">
                    <span className={`font-black text-sm capitalize ${tx}`}>{formatName(ex.name)}</span>
                    <p className="text-[10px] font-black text-emerald-500 uppercase">{ex.category}</p>
                  </div>
                  <button onClick={async()=>{if(window.confirm(`Delete ${ex.name}?`))await deleteDoc(doc(db,'artifacts',appId,'public','data','library',ex.id));}}
                    className="text-red-400 opacity-0 group-hover:opacity-100 font-black text-[10px] uppercase transition-all bg-red-50 px-2 py-1 rounded-lg">Del</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS — Muscle Group Progression ── */}
      {activeTab==='analytics'&&(
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:'Sessions',val:logs.filter(l=>l.clientName===analyticsClient).length,c:tx},
              {label:'PRs 🏆',val:logs.filter(l=>l.clientName===analyticsClient&&l.isPR).length,c:'text-emerald-500'},
              {label:'Avg Sets',val:logs.filter(l=>l.clientName===analyticsClient).length>0?Math.round(logs.filter(l=>l.clientName===analyticsClient).reduce((a,l)=>a+(l.setsData?.length||0),0)/logs.filter(l=>l.clientName===analyticsClient).length):0,c:'text-blue-500'}
            ].map((s,i)=>(
              <div key={i} className={`${bg} border-2 p-4 rounded-[2rem] shadow-lg text-center`}>
                <span className={`text-[10px] font-black block mb-1 ${sub}`}>{s.label}</span>
                <span className={`text-3xl font-black ${s.c}`}>{s.val}</span>
              </div>
            ))}
          </div>
          <div className={`${bg} border-2 p-5 rounded-[2.5rem] shadow-xl`}>
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className={`font-black text-base ${tx}`}>Muscle Group Progression</h4>
                <p className={`text-[10px] font-black ${sub}`}>Max weight per muscle over time</p>
              </div>
              <ClientSelector clientNames={clientNames} value={analyticsClient} onChange={setAnalyticsClient} placeholder="Select Client"/>
            </div>
            {/* Muscle legend */}
            {analyticsClient&&muscleChartData.muscles.length>0&&(
              <div className="flex flex-wrap gap-2 mb-4">
                {muscleChartData.muscles.map(m=>(
                  <span key={m} className="px-3 py-1 rounded-xl text-[10px] font-black text-white" style={{background:MUSCLE_COLORS[m]||'#94a3b8'}}>
                    {m}
                  </span>
                ))}
              </div>
            )}
            {analyticsClient&&muscleChartData.muscles.length>0?(
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={muscleChartData.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="kg"/>
                    <Tooltip contentStyle={{borderRadius:'16px',border:'none',boxShadow:'0 10px 25px -5px rgba(0,0,0,0.1)',background:'#fff'}} formatter={(v,n)=>[`${v}kg`,n]}/>
                    {muscleChartData.muscles.map(m=>(
                      <Line key={m} type="monotone" dataKey={m} stroke={MUSCLE_COLORS[m]||'#94a3b8'} strokeWidth={3}
                        dot={{r:5,fill:MUSCLE_COLORS[m]||'#94a3b8',strokeWidth:2,stroke:'#fff'}}
                        connectNulls activeDot={{r:7}}/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ):(
              <div className="h-40 flex items-center justify-center">
                <p className={`text-sm font-black ${sub} text-center`}>
                  {analyticsClient?'No workout data yet for this client':'Select a client to view muscle progression'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INBOX ── */}
      {activeTab==='inbox'&&(
        <div className="space-y-4 max-w-lg mx-auto">
          {inboxNotes.length===0
            ?<div className={`text-center py-32 text-3xl font-black uppercase opacity-30 tracking-[0.5em] ${tx}`}>Empty</div>
            :inboxNotes.map(note=>(
              <div key={note.id} className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl space-y-4 relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-r-full"/>
                <div className="flex justify-between items-center pl-3">
                  <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','user_notes',note.id))} className="text-red-400 font-black text-xs uppercase">Archive</button>
                  <span className="bg-slate-900 text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
                    {titleCase(clientNames[note.clientName]?.name||clientNames[note.clientName]||note.clientName)}
                  </span>
                </div>
                <p className="font-bold text-sm p-4 rounded-2xl border-2 border-dashed leading-relaxed italic pl-5 text-slate-700 bg-slate-50">"{note.note}"</p>
                <button onClick={()=>window.open(`https://wa.me/${note.clientName}`,'_blank')} className="w-full bg-slate-900 text-emerald-400 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-slate-800 transition-all">Reply via WhatsApp ✅</button>
              </div>
            ))
          }
        </div>
      )}
    </div>
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
  const days = useMemo(()=>[...new Set(workouts.map(w=>w.day))].filter(Boolean),[workouts]);
  useEffect(()=>{ if(days.length>0&&!selectedDay) setSelectedDay(days[0]); },[days,selectedDay]);
  useBackButton(showSummary,()=>setShowSummary(false));
  const filtered = workouts.filter(w=>w.day===selectedDay).sort((a,b)=>a.orderIndex-b.orderIndex);
  const summaryData = useMemo(()=>{
    const today=new Date().toLocaleDateString('ar-EG');
    const tl=allLogs.filter(l=>l.clientName===identifier&&l.completedAt?.toDate().toLocaleDateString('ar-EG')===today);
    return{count:tl.length,totalSets:tl.reduce((a,l)=>a+(l.setsData?.length||0),0),prs:tl.filter(l=>l.isPR)};
  },[allLogs,identifier]);

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
      <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
        {days.map((d,i)=>(
          <button key={d} onClick={()=>setSelectedDay(d)}
            className={`px-7 py-4 rounded-[2rem] font-black text-sm transition-all shrink-0 shadow-lg border-2 ${selectedDay===d?'bg-slate-900 text-emerald-400 border-slate-900 scale-105':'bg-white border-slate-200 text-slate-400'}`}>
            Day {i+1}
          </button>
        ))}
      </div>
      <div>
        {filtered.length>0
          ?filtered.map(ex=><ExerciseRow key={ex.id} exercise={ex} db={db} appId={appId} identifier={identifier} allLogs={allLogs} sessionFinished={sessionFinished}/>)
          :<div className="py-32 text-center text-2xl font-black uppercase opacity-20 tracking-widest text-slate-900">No Workouts</div>
        }
      </div>
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
  const [navigateToPlan, setNavigateToPlan] = useState(null);
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
      <main className="max-w-5xl mx-auto p-4 pt-20 animate-fade-in">
        {role==='trainer'
          ?<TrainerDashboard workouts={workouts} logs={allLogs} db={db} appId={APP_ID} clientNames={clientRegistry} onNavigateToPlan={navigateToPlan}/>
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