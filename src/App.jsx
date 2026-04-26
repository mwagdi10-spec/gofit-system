import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, writeBatch, doc, query, where, getDocs, orderBy } from 'firebase/firestore';

// --- Firebase Initialization ---
// تنبيه: ضع بيانات مشروعك الحقيقية هنا بدلاً من هذه البيانات الوهمية
const firebaseConfig = {
  apiKey: "AIzaSyCcjp3dDhgt15x7ttHD3UplfP20e57CpFU",
  authDomain: "gofit-9ed5f.firebaseapp.com",
  projectId: "gofit-9ed5f",
  storageBucket: "gofit-9ed5f.firebasestorage.app",
  messagingSenderId: "30376573246",
  appId: "1:30376573246:web:cda9649cae1e8d020d546f",
  measurementId: "G-T362BLMFDH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "gofit-production";

const TRAINER_IDENTIFIER = "admin@gofit.com"; 
const CATEGORIES_ORDER = ['WARM-UP', 'ACTIVATION', 'SKILL', 'RESISTANCE', 'CARDIO', 'COOL-DOWN'];

export default function WorkoutApp() {
  const [user, setUser] = useState(null);
  const [authStep, setAuthStep] = useState('login'); 
  const [identifier, setIdentifier] = useState(''); 
  const [role, setRole] = useState('client'); 
  const [workouts, setWorkouts] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) { console.error("Auth Error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || authStep !== 'authenticated') return;

    const workoutsRef = collection(db, 'artifacts', appId, 'public', 'data', 'workouts');
    const qWorkouts = query(workoutsRef, orderBy('orderIndex', 'asc'));
    const unsubscribeWorkouts = onSnapshot(qWorkouts, (snapshot) => {
      const w = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkouts(w);
    });

    const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
    const unsubscribeLogs = onSnapshot(logsRef, (snapshot) => {
      const l = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      l.sort((a, b) => b.completedAt?.toMillis() - a.completedAt?.toMillis());
      setAllLogs(l);
    });

    const notesRef = collection(db, 'artifacts', appId, 'public', 'data', 'user_notes');
    const unsubscribeNotes = onSnapshot(notesRef, (snapshot) => {
      const n = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      n.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setAllNotes(n);
    });

    return () => { unsubscribeWorkouts(); unsubscribeLogs(); unsubscribeNotes(); };
  }, [user, authStep]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setRole(identifier.toLowerCase() === TRAINER_IDENTIFIER.toLowerCase() ? 'trainer' : 'client');
    setAuthStep('authenticated');
  };

  const clientWorkouts = workouts.filter(w => w.assignedTo === identifier);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-bold" dir="rtl">جاري التحميل...</div>;

  if (authStep === 'login') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 animate-fade-in">
          <div className="bg-slate-900 p-12 text-center relative">
            <div className="text-emerald-400 font-black text-6xl mb-1 tracking-tighter">GoFit</div>
            <div className="text-slate-500 font-bold tracking-tight text-[10px] uppercase">Professional Training</div>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-8">
            <div className="text-center">
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">تسجيل الدخول</h2>
               <p className="text-slate-400 text-sm mt-1">أدخل رقم الهاتف للمتابعة</p>
            </div>
            <input 
              type="text" required placeholder="رقم الهاتف" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 focus:bg-white rounded-2xl outline-none text-center font-black text-xl transition-all"
            />
            <button type="submit" className="w-full bg-slate-900 text-emerald-400 font-black py-5 rounded-2xl shadow-xl hover:bg-slate-800 transition-all text-xl active:scale-95 tracking-tight">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10" dir="rtl">
      <nav className="bg-slate-900 text-white p-4 shadow-xl sticky top-0 z-50 border-b border-emerald-500/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="font-black text-2xl tracking-tighter text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
            GoFit<span className="text-white font-light">Program</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">المستخدم</span>
                <span className="text-xs font-black text-emerald-400">{identifier}</span>
             </div>
             <button onClick={() => setAuthStep('login')} className="bg-slate-800 p-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white border border-slate-700 transition-all">خروج</button>
          </div>
        </div>
      </nav>
      <main className="max-w-[1600px] mx-auto p-2 md:p-4">
        {role === 'trainer' ? <TrainerDashboard workouts={workouts} logs={allLogs} notes={allNotes} db={db} appId={appId} /> : <ClientView workouts={clientWorkouts} db={db} appId={appId} identifier={identifier} />}
      </main>
    </div>
  );
}

function TrainerDashboard({ workouts, logs, notes, db, appId }) {
  const [activeTab, setActiveTab] = useState('manage'); 
  const [targetClient, setTargetClient] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null);

  const clientWorkouts = workouts.filter(w => w.assignedTo === targetClient);
  const clientSessions = [...new Set(clientWorkouts.map(w => w.day))];

  const clientLogs = logs.filter(l => l.clientName === targetClient);
  const clientNotes = notes.filter(n => n.clientName === targetClient);

  const cleanText = (text) => {
    if (!text) return "";
    let cleaned = text
      .replace(/[^\x00-\x7F\u0600-\u06FF\s\-\(\)\/\.,]/g, "") 
      .replace(/[\uFFFD\u00A0]/g, " ") 
      .replace(/\s+/g, ' ')
      .trim();
    cleaned = cleaned.replace(/Dec-15/gi, "12-15");
    cleaned = cleaned.replace(/15-Dec/gi, "12-15");
    return cleaned;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !targetClient.trim() || !sessionName.trim()) { 
      alert("يرجى إدخال الهاتف واسم الجلسة"); 
      return; 
    }
    
    setIsProcessing(true);
    setStatus({ type: 'info', msg: 'جاري معالجة الملف...' });

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target.result;
        const rows = text.split(/\r?\n/);
        
        const batch = writeBatch(db);
        const oldDocsQuery = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'workouts'),
            where('assignedTo', '==', targetClient),
            where('day', '==', sessionName)
        );
        const oldDocs = await getDocs(oldDocsQuery);
        oldDocs.forEach(d => batch.delete(d.ref));

        let currentCategory = 'RESISTANCE';
        let orderCounter = (clientSessions.length + 1) * 1000; 

        rows.forEach((line) => {
            const cols = line.split(',');
            if (cols.length < 2) return;
            
            const col1 = cleanText(cols[0]);
            const col2 = cleanText(cols[1]);

            const isCategory = CATEGORIES_ORDER.some(cat => col1.toUpperCase().includes(cat) || col2.toUpperCase().includes(cat));
            if (isCategory) {
                currentCategory = CATEGORIES_ORDER.find(cat => col1.toUpperCase().includes(cat) || col2.toUpperCase().includes(cat)) || col1;
                return;
            }
            
            if (col2 && cols[2] && !isNaN(parseInt(cols[2]))) {
                const docRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'workouts'));
                batch.set(docRef, {
                    day: sessionName,
                    category: currentCategory,
                    name: col2,
                    targetSets: parseInt(cols[2]),
                    targetReps: cleanText(cols[3] || "-"),
                    tempo: cleanText(cols[4] || "-"),
                    restTime: cleanText(cols[5] || "-"),
                    assignedTo: targetClient,
                    orderIndex: orderCounter++,
                    createdAt: serverTimestamp()
                });
            }
        });

        try {
            await batch.commit();
            setStatus({ type: 'success', msg: `تم رفع ${sessionName} بنجاح ✅` });
            setSessionName(''); 
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', msg: 'خطأ في الرفع ❌' });
        } finally {
            setIsProcessing(false);
            e.target.value = null;
        }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const deleteSession = async (sName) => {
    if (!confirm(`حذف ${sName}؟`)) return;
    setIsProcessing(true);
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'workouts'), where('assignedTo', '==', targetClient), where('day', '==', sName));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('manage')} className={`flex-1 py-4 rounded-2xl font-black text-lg transition-all border-2 ${activeTab === 'manage' ? 'bg-slate-900 text-emerald-400 border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>إدارة الجلسات</button>
        <button onClick={() => setActiveTab('track')} className={`flex-1 py-4 rounded-2xl font-black text-lg transition-all border-2 ${activeTab === 'track' ? 'bg-slate-900 text-emerald-400 border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>متابعة أداء العملاء</button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
        <div className="mb-8">
           <label className="text-xs font-black text-slate-400 uppercase tracking-tight block mb-2">رقم هاتف العميل (للبحث أو الإضافة)</label>
           <input 
              type="text" placeholder="أدخل رقم الهاتف هنا" value={targetClient}
              onChange={(e) => setTargetClient(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-emerald-500 font-black text-xl text-center transition-all"
           />
        </div>

        {activeTab === 'manage' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                        {targetClient ? (
                            <>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-tight block">اسم الجلسة (مثال: S1)</label>
                                <input 
                                    type="text" placeholder="S1" value={sessionName}
                                    onChange={(e) => setSessionName(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-center"
                                />
                                <label className="text-xs font-black text-slate-400 uppercase tracking-tight block pt-2">اختر ملف الإكسيل (CSV)</label>
                                <input 
                                    type="file" accept=".csv" onChange={handleFileUpload} disabled={isProcessing}
                                    className="w-full p-4 bg-emerald-500 text-white rounded-xl font-bold cursor-pointer hover:bg-emerald-600 transition-all file:hidden text-center"
                                />
                            </>
                        ) : (
                            <p className="text-center text-slate-400 font-bold py-8">أدخل رقم العميل للبدء في رفع الملفات</p>
                        )}
                    </div>
                    {status && <div className={`p-4 rounded-xl text-xs font-black text-center ${status.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{status.msg}</div>}
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-tight mb-4">الجلسات المرفوعة</h3>
                    <div className="space-y-2">
                        {clientSessions.length === 0 ? <p className="text-center text-slate-400 text-sm font-bold py-8">لا توجد جلسات</p> : null}
                        {clientSessions.map(s => (
                            <div key={s} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <span className="font-black text-slate-800 text-sm">{s}</span>
                                <button onClick={() => deleteSession(s)} className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">حذف</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'track' && (
            <div className="space-y-8 animate-fade-in">
                {targetClient === '' ? (
                    <p className="text-center text-slate-400 font-bold py-12 text-lg">أدخل رقم العميل في الأعلى لعرض ملاحظاته وسجل تمارينه</p>
                ) : (
                    <>
                        <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100">
                            <h3 className="text-sm font-black text-amber-800 uppercase tracking-tight mb-4">صندوق الملاحظات</h3>
                            <div className="space-y-3">
                                {clientNotes.length === 0 ? <p className="text-amber-600/50 text-sm font-bold">لا توجد ملاحظات من العميل</p> : null}
                                {clientNotes.map(note => (
                                    <div key={note.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-1 rounded">{note.session}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">{note.timestamp?.toDate().toLocaleString('ar-EG')}</span>
                                        </div>
                                        <p className="text-slate-700 font-bold text-sm">{note.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">سجل التمارين المكتملة</h3>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {clientLogs.length === 0 ? <p className="text-slate-400 text-sm font-bold">لم يقم العميل بتسجيل أي تمارين بعد</p> : null}
                                {clientLogs.map(log => {
                                    const exerciseName = workouts.find(w => w.id === log.exerciseId)?.name || 'تمرين غير معروف';
                                    return (
                                        <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div>
                                                <div className="font-black text-slate-800 text-sm mb-1">{exerciseName}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">{log.completedAt?.toDate().toLocaleString('ar-EG')}</div>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {log.setsData.map((s, i) => (
                                                    <div key={i} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-700">
                                                        <span className="text-slate-400 mr-1">S{i+1}:</span>
                                                        {s.weight && s.weight !== '-' ? `${s.weight}kg` : 'وقت'} × {s.reps}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

function ClientView({ workouts, db, appId, identifier }) {
  const [selectedDay, setSelectedDay] = useState('');
  const [confetti, setConfetti] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  
  const days = [...new Set(workouts.map(w => w.day))];
  useEffect(() => { if (days.length > 0 && !days.includes(selectedDay)) setSelectedDay(days[0]); }, [days, selectedDay]);

  const todaysWorkouts = workouts.filter(w => w.day === selectedDay);
  const categoriesInDay = [...new Set(todaysWorkouts.map(w => w.category))].sort((a, b) => {
    return CATEGORIES_ORDER.indexOf(a.toUpperCase()) - CATEGORIES_ORDER.indexOf(b.toUpperCase());
  });

  const openWhatsApp = () => {
    window.open('https://wa.me/201500807824', '_blank');
  };

  const handleSaveNote = async () => {
      if(!noteText.trim()) return;
      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'user_notes'), {
              clientName: identifier,
              note: noteText,
              session: selectedDay,
              timestamp: serverTimestamp()
          });
          setShowNotes(false);
          setNoteText('');
          alert('تم إرسال ملاحظاتك للمدرب ✅');
      } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
      {confetti && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl animate-fade-in">
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center border-4 border-emerald-500">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">إنجاز رائع!</h2>
            <p className="text-slate-500 font-bold text-lg mt-4">تم تسجيل جميع بيانات الجلسة بنجاح ✅</p>
            <button onClick={()=>setConfetti(false)} className="mt-8 bg-slate-900 text-emerald-400 px-12 py-4 rounded-2xl font-black">إغلاق</button>
          </div>
        </div>
      )}

      {showNotes && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-[2rem] shadow-2xl animate-slide-up">
            <h3 className="text-xl font-black mb-4 tracking-tight">اكتب ملاحظاتك للمدرب</h3>
            <textarea 
               className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold"
               placeholder="كيف كان شعورك اليوم؟ هل واجهت أي تعب أو صعوبة؟"
               value={noteText}
               onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
                <button onClick={handleSaveNote} className="flex-1 bg-emerald-500 text-slate-900 font-black py-3 rounded-xl shadow-lg">إرسال الملاحظة</button>
                <button onClick={() => setShowNotes(false)} className="px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {days.map(d => (
          <button 
            key={d} 
            onClick={() => setSelectedDay(d)} 
            className={`px-8 py-3 rounded-xl font-black text-base transition-all shadow-md shrink-0 border-2 ${selectedDay === d ? 'bg-slate-900 text-emerald-400 border-slate-900' : 'bg-white border-slate-200 text-slate-400'}`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {categoriesInDay.map(cat => (
          <div key={cat} className="bg-white rounded-[1.5rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-8 py-2 text-[10px] font-black text-emerald-400 uppercase tracking-tight border-b border-emerald-500/20">
              {cat}
            </div>
            <div className="overflow-x-auto hide-scrollbar">
              <div className="min-w-[1100px] divide-y divide-slate-100">
                  {todaysWorkouts.filter(w => w.day === selectedDay && w.category === cat).map(ex => (
                      <ExerciseRow key={ex.id} exercise={ex} db={db} appId={appId} identifier={identifier} />
                  ))}
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex flex-col md:flex-row gap-3 mt-6 pb-12">
          <button onClick={()=>{setConfetti(true); window.scrollTo({top:0, behavior:'smooth'})}} className="flex-1 bg-emerald-500 text-slate-900 font-black py-4 rounded-2xl shadow-xl text-lg hover:bg-emerald-400 transition-all active:scale-95 border-b-4 border-emerald-700 tracking-tight">
            ✅ إنهاء وتأكيد الجلسة
          </button>
          <div className="flex flex-1 gap-3">
              <button onClick={() => setShowNotes(true)} className="flex-1 bg-slate-200 text-slate-700 font-black py-4 rounded-2xl shadow-md text-lg hover:bg-slate-300 transition-all active:scale-95 tracking-tight">
                اكتب ملاحظاتك
              </button>
              <button onClick={openWhatsApp} className="flex-1 bg-slate-800 text-emerald-400 font-black py-4 rounded-2xl shadow-xl text-lg hover:bg-slate-700 transition-all active:scale-95 border-b-4 border-slate-900 tracking-tight flex items-center justify-center gap-2">
                تواصل مع المدرب
              </button>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { scrollbar-width: none; }` }} />
    </div>
  );
}

function ExerciseRow({ exercise, db, appId, identifier }) {
  const targetReps = exercise?.targetReps || "";
  const isTime = targetReps.toLowerCase().includes('min') || targetReps.toLowerCase().includes('sec');
  
  const [sets, setSets] = useState(Array.from({ length: exercise.targetSets }).map(() => ({ weight: '', reps: targetReps })));
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const log = { exerciseId: exercise.id, clientName: identifier, setsData: sets, completedAt: serverTimestamp() };
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), log);
      setSaved(true);
    } catch(e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="flex items-center gap-6 p-2 md:p-3 hover:bg-slate-50 transition-all group">
      <div className="w-[280px] shrink-0 pr-2">
        <h3 className="font-bold text-[13px] text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors uppercase tracking-tight">
          {exercise.name}
        </h3>
      </div>
      
      <div className="w-[300px] shrink-0 flex items-center border border-slate-100 rounded-xl bg-white shadow-sm h-12 divide-x divide-x-reverse text-[10.5px] overflow-hidden">
        <div className="flex-1 flex flex-col justify-center text-center"><span className="text-slate-400 font-bold uppercase tracking-tight">الهدف</span><span className="font-black text-sm">{exercise.targetSets}×{exercise.targetReps}</span></div>
        <div className="flex-1 flex flex-col justify-center text-center bg-slate-50/30"><span className="text-slate-400 font-bold uppercase tracking-tight">الإيقاع</span><span className="font-black text-sm text-emerald-600" dir="ltr">{exercise.tempo}</span></div>
        <div className="flex-1 flex flex-col justify-center text-center"><span className="text-slate-400 font-bold uppercase tracking-tight">الراحة</span><span className="font-black text-sm text-orange-500">{exercise.restTime}</span></div>
      </div>

      <div className="flex-1 flex gap-3 overflow-x-auto hide-scrollbar py-1">
        {sets.map((s, i) => (
          <div key={i} className={`flex items-stretch border rounded-xl overflow-hidden shrink-0 h-14 transition-all ${saved ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 focus-within:border-emerald-400 shadow-sm'}`}>
            <div className={`w-10 flex flex-col items-center justify-center border-l text-[10.5px] font-black ${saved ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                {i + 1}
            </div>
            <div className="w-16 flex flex-col justify-center text-center px-1 bg-white">
                <span className="text-[9.5px] font-bold text-slate-300 uppercase leading-none mb-1">{isTime ? "وقت" : "وزن"}</span>
                <input type="text" value={s.weight} onChange={e=>{const d=[...sets]; d[i].weight=e.target.value; setSets(d); setSaved(false)}} className="w-full text-center text-sm font-black outline-none bg-transparent" placeholder="-" />
            </div>
            <div className="w-16 flex flex-col justify-center text-center px-1 border-r bg-white border-slate-50">
                <span className="text-[9.5px] font-bold text-slate-300 uppercase leading-none mb-1">تكرار</span>
                <input type="text" value={s.reps} onChange={e=>{const d=[...sets]; d[i].reps=e.target.value; setSets(d); setSaved(false)}} className="w-full text-center text-sm font-black outline-none bg-transparent" placeholder={exercise.targetReps} />
            </div>
          </div>
        ))}
      </div>

      <div className="w-[110px] shrink-0">
        <button onClick={handleSave} disabled={isSaving || saved} className={`w-full py-3.5 rounded-xl text-xs font-black shadow-lg transition-all ${saved ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-emerald-400 hover:bg-slate-800'}`}>
          {isSaving ? "..." : saved ? '✓ تم' : 'حفظ'}
        </button>
      </div>
    </div>
  );
}