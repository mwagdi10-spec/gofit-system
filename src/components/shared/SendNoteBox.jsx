import { useState, useEffect } from 'react';
import { addDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../services/firebase/config';

// صندوق إرسال ملاحظة من العميل للمدرب — بيتسجل في Firestore (notes)
// theme: 'dark' (شاشات التطبيق السودة) أو 'light' (المودالات البيضاء زي History)
export function SendNoteBox({ identifier, context = '', theme = 'dark' }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [myNotes, setMyNotes] = useState([]);

  // ملاحظاتي مع رد الترينر — realtime
  useEffect(() => {
    if (!identifier) return;
    const unsub = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'notes'), where('clientName', '==', identifier), orderBy('createdAt', 'desc')),
      s => setMyNotes(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [identifier]);

  const repliedNotes = myNotes.filter(n => n.trainerReply);
  const hasUnreadReply = repliedNotes.some(n => n.replyRead === false);

  async function markRepliesRead() {
    const unread = repliedNotes.filter(n => n.replyRead === false);
    for (const n of unread) {
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notes', n.id), { replyRead: true });
    }
  }

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
  const replyBoxCls = isLight ? 'bg-white border-slate-200'          : 'bg-[#14142B] border-[#2A2A50]';

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); if (hasUnreadReply) markRepliesRead(); }}
        className={`relative w-full flex items-center justify-center gap-2 border text-xs font-black py-3 rounded-2xl transition-colors ${boxCls} ${btnCls}`}
      >
        ✉️ Send Note to Coach
        {hasUnreadReply && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 w-3 h-3 rounded-full border-2 border-white" />
        )}
      </button>
    );
  }

  return (
    <div className={`border rounded-2xl p-3 ${boxCls}`}>
      {repliedNotes.length > 0 && (
        <div className="space-y-2 mb-3">
          {repliedNotes.slice(0, 3).map(n => (
            <div key={n.id} className={`border rounded-xl p-2.5 ${replyBoxCls}`}>
              <p className={`text-[9px] font-black uppercase mb-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>You: {n.message}</p>
              <p className="text-[9px] font-black text-blue-400 uppercase mb-0.5">Coach Reply</p>
              <p className={`text-xs font-bold leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{n.trainerReply}</p>
            </div>
          ))}
        </div>
      )}
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
