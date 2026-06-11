import React, { useState, useEffect, useRef } from 'react';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { NASM_OPT_PHASES } from '../constants/nasm';
import { titleCase } from '../utils/formatters';
import { useBackButton } from '../hooks/useBackButton';

export function ClientSelector({ clientNames, value, onChange, placeholder = 'Select Client...' }) {

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


export function AddNewClientModal({ onClose, db, appId }) {

  const [formData, setFormData] = useState({

    name: '',

    phone: '',

    age: '',

    gender: '',

    height: '',

    goal: '',

    level: '',

    nasm_phase: 1,

    daysPerWeek: '',

    injuries: '',

    weight: '',

    bodyFat: '',

    measurements: '',

    progressPhotos: '',

    coachNotes: ''

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

        nasm_phase: formData.nasm_phase || 1,

        daysPerWeek: formData.daysPerWeek ? parseInt(formData.daysPerWeek) : 0,

        injuries: formData.injuries || '',

        weight: formData.weight || '',

        bodyFat: formData.bodyFat || '',

        measurements: formData.measurements || '',

        progressPhotos: formData.progressPhotos || '',

        coachNotes: formData.coachNotes || '',

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

          

          {/* NASM Phase Selection for New Client */}

          <div className="border-l-4 border-emerald-500 pl-3">

            <label className="text-xs font-black text-emerald-600 uppercase mb-2 block">Initial NASM Phase</label>

            <select 

              value={formData.nasm_phase} 

              onChange={e=>setFormData({...formData,nasm_phase:parseInt(e.target.value)})} 

              className="w-full p-3 border-2 border-emerald-300 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-emerald-50"

            >

              {[1,2,3,4,5].map(p => (

                <option key={p} value={p}>

                  {p}. {NASM_OPT_PHASES[p].phase}

                </option>

              ))}

            </select>

          </div>



          <input type="number" value={formData.daysPerWeek} onChange={e=>setFormData({...formData,daysPerWeek:e.target.value})} placeholder="Days/Week" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>

          <input type="text" value={formData.injuries} onChange={e=>setFormData({...formData,injuries:e.target.value})} placeholder="Injuries/Notes" className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>

          <div className="grid grid-cols-2 gap-2">

            <input type="number" value={formData.weight} onChange={e=>setFormData({...formData,weight:e.target.value})} placeholder="Weight (kg)" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>

            <input type="number" value={formData.bodyFat} onChange={e=>setFormData({...formData,bodyFat:e.target.value})} placeholder="Body Fat %" className="p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50"/>

          </div>

          <textarea value={formData.measurements} onChange={e=>setFormData({...formData,measurements:e.target.value})} placeholder="Measurements" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>

          <textarea value={formData.coachNotes} onChange={e=>setFormData({...formData,coachNotes:e.target.value})} placeholder="Coach notes" rows={2} className="w-full p-3 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50 resize-none"/>

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