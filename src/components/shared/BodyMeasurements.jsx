import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID } from '../../services/firebase/config';

const FIELDS = [
  { key: 'weight',  label: 'Weight',   suffix: 'kg', required: true },
  { key: 'bodyFat', label: 'Body Fat', suffix: '%'  },
  { key: 'waist',   label: 'Waist',    suffix: 'cm' },
  { key: 'chest',   label: 'Chest',    suffix: 'cm' },
  { key: 'arm',     label: 'Arm',      suffix: 'cm' },
  { key: 'thigh',   label: 'Thigh',    suffix: 'cm' },
];

// normalize قيمة داخل viewBox ارتفاعه 80 (هامش 10 فوق وتحت)
function pointY(value, all) {
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (max === min) return 40;
  return 70 - ((value - min) / (max - min)) * 60;
}

function buildLinePoints(values) {
  if (values.length < 2) return [];
  return values.map((v, i) => ({
    x: (i / (values.length - 1)) * 280 + 10,
    y: pointY(v, values),
  }));
}

export default function BodyMeasurements({ identifier = '', measurements = [] }) {
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState({ weight: '', bodyFat: '', waist: '', chest: '', arm: '', thigh: '' });
  const [saving, setSaving] = useState(false);

  const sorted = [...measurements].sort(
    (a, b) => (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0)
  );
  const latest = sorted[sorted.length - 1] || null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function save() {
    if (!identifier || !form.weight) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'body_measurements'), {
        clientName: identifier,
        weight:  Number(form.weight) || 0,
        bodyFat: form.bodyFat ? Number(form.bodyFat) : null,
        waist:   form.waist   ? Number(form.waist)   : null,
        chest:   form.chest   ? Number(form.chest)   : null,
        arm:     form.arm     ? Number(form.arm)     : null,
        thigh:   form.thigh   ? Number(form.thigh)   : null,
        createdAt: serverTimestamp(),
      });
      setForm({ weight: '', bodyFat: '', waist: '', chest: '', arm: '', thigh: '' });
      setOpen(false);
    } catch (e) {
      console.error('save measurement failed:', e);
    }
    setSaving(false);
  }

  const weightPoints = sorted.filter(m => m.weight > 0).slice(-12);
  const linePoints    = buildLinePoints(weightPoints.map(m => m.weight));
  const polylineStr   = linePoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="bg-[#1C1C38] border border-[#2A2A50] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-xs">Body Measurements</p>
        <button
          onClick={() => setOpen(p => !p)}
          className="bg-blue-500/15 text-blue-400 text-[11px] font-black px-3 py-1.5 rounded-lg"
        >
          {open ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* آخر قياس مسجل */}
      {latest ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {FIELDS.filter(f => latest[f.key] !== null && latest[f.key] !== undefined && latest[f.key] !== '').map(f => (
            <div key={f.key} className="bg-[#14142B] rounded-xl p-2 text-center">
              <p className="text-slate-500 text-[9px] mb-1">{f.label}</p>
              <p className="text-white text-sm font-black">
                {latest[f.key]}<span className="text-slate-500 text-[9px] ml-0.5">{f.suffix}</span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        !open && <p className="text-slate-500 text-xs text-center py-3">No measurements logged yet</p>
      )}

      {/* جراف تطور الوزن - آخر 12 قياس */}
      {weightPoints.length >= 2 && (
        <div className="mb-3">
          <p className="text-slate-500 text-[10px] mb-1">Weight Trend ({weightPoints[0].weight}kg → {weightPoints[weightPoints.length - 1].weight}kg)</p>
          <svg viewBox="0 0 300 80" className="w-full h-20">
            <polyline points={polylineStr} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {linePoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
            ))}
          </svg>
        </div>
      )}

      {/* فورم إضافة قياس جديد */}
      {open && (
        <div className="space-y-2 border-t border-[#2A2A50] pt-3">
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map(f => (
              <input
                key={f.key}
                type="number"
                inputMode="decimal"
                placeholder={`${f.label}${f.required ? ' *' : ''} (${f.suffix})`}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                className="w-full bg-[#14142B] border border-[#2A2A50] rounded-xl px-3 py-2 text-white text-sm font-semibold outline-none focus:border-blue-500"
              />
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving || !form.weight}
            className="w-full bg-blue-500 disabled:opacity-40 text-white font-black text-sm py-2.5 rounded-xl"
          >
            {saving ? 'Saving...' : 'Save Measurement'}
          </button>
        </div>
      )}
    </div>
  );
}
