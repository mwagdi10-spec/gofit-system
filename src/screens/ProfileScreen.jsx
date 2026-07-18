import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';
import BottomNav from '../components/BottomNav';
import { SendNoteBox } from '../components/shared/SendNoteBox';

const GOALS   = ['Muscle Gain', 'Fat Loss', 'Strength', 'Endurance'];
const METRICS = [
  { key: 'weight', label: 'Weight', suffix: 'kg'  },
  { key: 'height', label: 'Height', suffix: 'cm'  },
  { key: 'age',    label: 'Age',    suffix: 'yrs' },
];

export default function ProfileScreen({ navigate, current, user = {}, identifier = '' }) {
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({});
  const [goalOpen, setGoalOpen] = useState(false);
  const [saving,   setSaving]   = useState(false);

  function startEdit() {
    setForm({
      weight: user.weight || '',
      height: user.height || '',
      age:    user.age    || '',
      goal:   user.goal   || 'Fitness',
    });
    setEditing(true);
  }

  async function save() {
    if (!identifier) return;
    setSaving(true);
    try {
      await updateDoc(
        doc(db, 'artifacts', APP_ID, 'public', 'data', 'client_names', identifier),
        {
          weight: Number(form.weight) || 0,
          height: Number(form.height) || 0,
          age:    Number(form.age)    || 0,
          goal:   form.goal,
        }
      );
      setEditing(false);
      setGoalOpen(false);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-[#0D0D1A] max-w-sm mx-auto pb-24">
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#2A2A50]">
        <h1 className="text-white text-2xl font-black">Profile</h1>
        <button
          onClick={() => editing ? save() : startEdit()}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50
            ${editing
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-[#1C1C38] border-[#2A2A50] text-slate-400'}`}
        >
          {saving ? '...' : editing ? 'Save' : 'Edit Info'}
        </button>
      </div>

      <div className="px-4 pt-6 space-y-4">

        {/* Avatar */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-24 h-24 rounded-full bg-[#1C1C38] border-2 border-blue-500
                          flex items-center justify-center text-5xl mb-3">👤</div>
          <p className="text-white text-xl font-bold">{user.name || '—'}</p>
          <p className="text-[#00D4AA] text-sm mt-1">{user.currentPhase || '—'}</p>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-3">
          {METRICS.map(f => (
            <div key={f.key} className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-3 text-center">
              <p className="text-slate-400 text-[10px] mb-2">{f.label}</p>
              {editing ? (
                <input
                  type="number"
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  className="w-full bg-transparent text-blue-400 text-xl font-black text-center
                             border-b border-blue-500 focus:outline-none pb-0.5"
                />
              ) : (
                <p className="text-white text-2xl font-black">{user[f.key] || '—'}</p>
              )}
              <p className="text-slate-500 text-[10px] mt-1">{f.suffix}</p>
            </div>
          ))}
        </div>

        {/* Goal */}
        <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-4">
          <p className="text-slate-400 text-xs mb-3">Main Goal</p>
          {editing ? (
            <div>
              <button
                onClick={() => setGoalOpen(p => !p)}
                className="w-full flex justify-between items-center bg-[#14142B]
                           border border-[#2A2A50] rounded-xl px-4 py-3"
              >
                <span className="text-white font-semibold">{form.goal}</span>
                <span className="text-slate-400">{goalOpen ? '▲' : '▼'}</span>
              </button>
              {goalOpen && (
                <div className="mt-2 border border-[#2A2A50] rounded-xl overflow-hidden">
                  {GOALS.map((g, i) => (
                    <button
                      key={g}
                      onClick={() => { set('goal', g); setGoalOpen(false); }}
                      className={`w-full flex justify-between items-center px-4 py-3 text-sm transition-colors
                        ${i > 0 ? 'border-t border-[#2A2A50]' : ''}
                        ${form.goal === g
                          ? 'bg-blue-500/15 text-blue-400 font-bold'
                          : 'bg-[#14142B] text-slate-400 hover:bg-[#1C1C38]'}`}
                    >
                      {g}
                      {form.goal === g && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-white text-lg font-bold">{user.goal || '—'}</p>
          )}
        </div>

        {/* Send Note to Coach */}
        {!editing && <SendNoteBox identifier={identifier} context="profile" />}
      </div>
      <BottomNav navigate={navigate} current={current} />
    </div>
  );
}
