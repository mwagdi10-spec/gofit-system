import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID } from '../../services/firebase/config';

// صندوق إرسال ملاحظة من العميل للمدرب — بيتسجل في Firestore (notes)
// theme: 'dark' (شاشات التطبيق السودة) أو 'light' (المودالات البيضاء زي History)
export function SendNoteBox({ identifier, context = '', theme = 'dark' }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!text.trim() || !identifier) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notes'), {
        clientName: identifier,
        message: text.trim(),
        context,
        read: false,
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setText('');
      setTimeout(() => { setSent(false); setOpen(false); }, 1500);
    } catch (e) { console.error('note send failed:', e); }
    setSending(false);
  }

  const isLight = theme === 'light';
  const boxCls   = isLight ? 'bg-slate-50 border-slate-200'          : 'bg-[#1C1C38] border-[#2A2A50]';
  const btnCls   = isLight ? 'text-slate-500 hover:bg-slate-100'     : 'text-slate-300 hover:bg-[#252545]';
  const areaCls  = isLight ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                            : 'bg-[#14142B] border-[#2A2A50] text-white placeholder-slate-500';
  const cancelCls= isLight ? 'bg-slate-200 text-slate-600'           : 'bg-slate-700/40 text-slate-300';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-center gap-2 border text-xs font-black py-3 rounded-2xl transition-colors ${boxCls} ${btnCls}`}
      >
        ✉️ Send Note to Coach
      </button>
    );
  }

  return (
    <div className={`border rounded-2xl p-3 ${boxCls}`}>
      {sent ? (
        <p className="text-emerald-500 text-xs font-black text-center py-3">✓ Sent to your coach</p>
      ) : (
        <>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write a note for your coach..."
            rows={3}
            className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none mb-2 ${areaCls}`}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setOpen(false); setText(''); }}
              className={`flex-1 text-xs font-black py-2.5 rounded-xl ${cancelCls}`}
            >
              Cancel
            </button>
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="flex-1 bg-blue-500 text-white text-xs font-black py-2.5 rounded-xl disabled:opacity-40"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
