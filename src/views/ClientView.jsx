// ClientView
// ══════════════════════════════════════════════════════════════════════════════
function ClientView({ workouts, db, appId, identifier, allLogs }) {
  const [selectedDay, setSelectedDay]         = useState('');
  const [sessionFinished, setSessionFinished] = useState(false);
  const [showSummary, setShowSummary]         = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [coolDownLibrary, setCoolDownLibrary] = useState([]);

  const days = useMemo(()=>{
    return [...new Set(workouts.map(w=>w.day))].filter(Boolean).sort((a,b)=>{
      const aNum = parseInt(a.split(' ')[1]) || 999;
      const bNum = parseInt(b.split(' ')[1]) || 999;
      return aNum - bNum;
    });
  },[workouts]);

  useEffect(()=>{ if(days.length>0&&!selectedDay) setSelectedDay(days[0]); },[days,selectedDay]);
  useEffect(()=>{
    const u = onSnapshot(collection(db,'artifacts',appId,'public','data','library'), s=>{
      setCoolDownLibrary(
        s.docs
          .map(d=>({id:`cooldown-library-${d.id}`, libraryId:d.id, ...d.data()}))
          .filter(ex => ex.category === 'COOL-DOWN')
          .sort((a,b)=>(a.name||'').localeCompare(b.name||''))
          .slice(0,10)
      );
    });
    return()=>u();
  },[db,appId]);
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
    const cooldownByName = new Map();
    [...coolDownLibrary, ...grouped['COOL-DOWN']].forEach(ex => {
      const key = (ex.name || '').trim().toLowerCase();
      if(key && !cooldownByName.has(key)) cooldownByName.set(key, ex);
    });
    grouped['COOL-DOWN'] = [...cooldownByName.values()].slice(0,10);
    return grouped;
  },[filtered,coolDownLibrary]);

  const summaryData = useMemo(()=>{
    const today=new Date().toLocaleDateString('en-US');
    const tl=allLogs.filter(l=>l.clientName===identifier&&l.completedAt?.toDate().toLocaleDateString('en-US')===today);
    return{
      count:tl.length,
      totalSets:tl.reduce((a,l)=>a+(l.setsData?.length||0),0),
      prs:tl.filter(l=>l.isPR),
    };
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
            <h2 className="font-black text-2xl text-slate-900">Session Complete!</h2>
            <div className="grid grid-cols-3 gap-2">
              {[{l:'Exercises',v:summaryData.count},{l:'Sets',v:summaryData.totalSets},{l:'PRs',v:summaryData.prs.length}].map((s,i)=>(
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
          const isCoolDown = cat === 'COOL-DOWN';

          return(
            <div key={cat}>
              {/* Category Tab Button */}
              <button
                onClick={()=>toggleCategory(cat)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-sm transition-all border-2 ${isCoolDown?'bg-gradient-to-r from-emerald-500 to-blue-500 text-white border-emerald-300 shadow-lg shadow-emerald-100':'bg-slate-900 text-emerald-400 hover:bg-slate-800 border-slate-800'}`}>
                <div className="flex items-center gap-2">
                  <span>{isExpanded?'▼':'▶'}</span>
                  <span className="uppercase">{isCoolDown?'Static Stretches':cat}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isCoolDown?'bg-white/25':'bg-emerald-500/20'}`}>{exercises.length}</span>
                </div>
              </button>

              {/* Expanded Exercises */}
              {isExpanded&&(
                isCoolDown ? (
                  <div className="mt-2 ml-2 border-l-2 border-emerald-100 pl-4">
                    <div className="rounded-[2rem] border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-3 shadow-md space-y-2">
                      <div className="flex flex-wrap gap-1.5 px-1 pb-1 border-b border-emerald-100 mb-1">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black">Hold 30-60s</span>
                        <span className="bg-blue-100 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-black">Static</span>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black">10 mins</span>
                      </div>
                      {exercises.map(ex=>(
                        <CoolDownStretchCard
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
                  </div>
                ) : (
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
                )
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
          }} className="absolute bottom-4 left-4 bg-slate-900 text-emerald-400 px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl">Send</button>
        </div>
      </div>
    </div>
  );
}
