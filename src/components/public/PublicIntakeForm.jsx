import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID } from '../../services/firebase/config';
import { QUESTIONNAIRE, QUESTIONNAIRE_EN } from '../../constants/questionnaire';

const UI = {
  ar: { select: 'اختر...', yes: 'نعم', no: 'لا', back: 'السابق', next: 'التالي', submit: 'إرسال', saving: 'جاري الإرسال...', screenOf: (i, n) => `شاشة ${i} من ${n}`, doneTitle: 'تم الإرسال بنجاح', doneBody: 'شكراً لك، هيتم التواصل معك قريباً.' },
  en: { select: 'Select...', yes: 'Yes', no: 'No', back: 'Back', next: 'Next', submit: 'Submit', saving: 'Sending...', screenOf: (i, n) => `Screen ${i} of ${n}`, doneTitle: 'Submitted Successfully', doneBody: "Thank you, we'll be in touch soon." },
};

const inputCls = 'w-full bg-[#14142B] border border-[#2A2A50] rounded-xl px-3 py-2.5 text-white text-sm font-semibold outline-none focus:border-blue-500';

function Field({ field, value, onChange, t }) {
  switch (field.type) {
    case 'text':
      return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className={inputCls} />;
    case 'number':
      return <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputCls} />;
    case 'date':
      return <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} className={inputCls} />;
    case 'textarea':
      return <textarea rows={3} value={value || ''} onChange={e => onChange(e.target.value)} className={inputCls} />;
    case 'select':
      return (
        <select value={value || ''} onChange={e => onChange(e.target.value)} className={inputCls}>
          <option value="">{t.select}</option>
          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div className="flex gap-2 flex-wrap">
          {field.options.map(o => (
            <button
              key={o} type="button" onClick={() => onChange(o)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors
                ${value === o ? 'bg-blue-500 border-blue-500 text-white' : 'bg-[#14142B] border-[#2A2A50] text-slate-300'}`}
            >
              {o}
            </button>
          ))}
        </div>
      );
    case 'boolean':
      return (
        <div className="flex gap-2">
          {[{ l: t.yes, v: true }, { l: t.no, v: false }].map(o => (
            <button
              key={o.l} type="button" onClick={() => onChange(o.v)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors
                ${value === o.v ? 'bg-blue-500 border-blue-500 text-white' : 'bg-[#14142B] border-[#2A2A50] text-slate-300'}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      );
    case 'slider':
      return (
        <div>
          <input
            type="range" min={field.min} max={field.max}
            value={value ?? field.min} onChange={e => onChange(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-blue-400 text-sm font-black text-center mt-1">{value ?? field.min}</p>
        </div>
      );
    default:
      return null;
  }
}

export default function PublicIntakeForm() {
  const [lang,      setLang]      = useState(null); // null = لسه ما اختارش
  const [screenIdx, setScreenIdx] = useState(0);
  const [answers,   setAnswers]   = useState({});
  const [saving,    setSaving]    = useState(false);
  const [done,      setDone]      = useState(false);

  // شاشة اختيار اللغة أول ما الصفحة تفتح
  if (!lang) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center p-4">
        <div className="bg-[#1C1C38] border-2 border-[#2A2A50] rounded-[2rem] w-full max-w-md shadow-2xl p-6 text-center">
          <p className="text-blue-400 font-black text-2xl mb-1">GoFit Pro</p>
          <p className="text-white font-black text-base mb-5">اختر لغة الاستبيان / Choose Language</p>
          <div className="flex gap-3">
            <button onClick={() => setLang('ar')} className="flex-1 bg-blue-600 text-white font-black text-sm py-3.5 rounded-xl">العربية</button>
            <button onClick={() => setLang('en')} className="flex-1 bg-blue-600 text-white font-black text-sm py-3.5 rounded-xl">English</button>
          </div>
        </div>
      </div>
    );
  }

  const t   = UI[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (done) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center p-4" dir={dir}>
        <div className="bg-[#1C1C38] border-2 border-[#2A2A50] rounded-[2rem] w-full max-w-md shadow-2xl p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-white font-black text-lg mb-2">{t.doneTitle}</p>
          <p className="text-slate-400 text-sm font-semibold">{t.doneBody}</p>
        </div>
      </div>
    );
  }

  const QDoc    = lang === 'ar' ? QUESTIONNAIRE : QUESTIONNAIRE_EN;
  const screen  = QDoc.screens[screenIdx];
  const isLast  = screenIdx === QDoc.screens.length - 1;
  const isFirst = screenIdx === 0;

  const setAnswer = (id, v) => setAnswers(p => ({ ...p, [id]: v }));

  async function submit() {
    setSaving(true);
    try {
      await addDoc(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'leads'),
        { answers, lang, submittedAt: serverTimestamp() }
      );
      setDone(true);
    } catch (e) {
      console.error('submit lead failed:', e);
      alert('Failed to submit, please try again.');
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex items-stretch md:items-center justify-center p-0 md:p-4" dir={dir}>
      <div className="bg-[#1C1C38] border-0 md:border-2 border-[#2A2A50] rounded-none md:rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden min-h-screen md:min-h-0 md:h-auto max-h-full md:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2A2A50] flex items-center justify-between shrink-0">
          <div>
            <p className="text-slate-400 text-[10px]">{t.screenOf(screenIdx + 1, QDoc.screens.length)}</p>
            <p className="text-white font-black text-sm">{screen.screenTitle}</p>
          </div>
          <p className="text-blue-400 font-black text-sm">GoFit</p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#2A2A50] shrink-0">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((screenIdx + 1) / QDoc.screens.length) * 100}%` }}
          />
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {screen.fields.map(field => (
            <div key={field.id}>
              <p className="text-slate-300 text-xs font-bold mb-1.5 leading-snug">{field.label}</p>
              <Field field={field} value={answers[field.id]} onChange={v => setAnswer(field.id, v)} t={t} />
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="px-5 py-4 border-t border-[#2A2A50] flex gap-2 shrink-0">
          {!isFirst && (
            <button
              onClick={() => setScreenIdx(i => i - 1)}
              className="flex-1 bg-[#14142B] border border-[#2A2A50] text-slate-300 font-black text-sm py-3 rounded-xl"
            >
              {t.back}
            </button>
          )}
          {isLast ? (
            <button
              onClick={submit}
              disabled={saving}
              className="flex-1 bg-blue-600 disabled:opacity-50 text-white font-black text-sm py-3 rounded-xl"
            >
              {saving ? t.saving : t.submit}
            </button>
          ) : (
            <button
              onClick={() => setScreenIdx(i => i + 1)}
              className="flex-1 bg-blue-600 text-white font-black text-sm py-3 rounded-xl"
            >
              {t.next}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
