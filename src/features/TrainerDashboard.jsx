// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TrainerDashboard
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function TrainerDashboard({ workouts, logs, db, appId, clientNames }) {
  const [activeTab, setActiveTab]             = useState('overview');
  const [targetClient, setTargetClient]       = useState('');
  const [sessionName, setSessionName]         = useState('');
  const [newEx, setNewEx]                     = useState({name:'',category:'RESISTANCE',muscleGroup:'Other',sets:'3',reps:'10',tempo:'',coachNote:'',alternatives:makeDefaultAlternatives()});
  const [libraryData, setLibraryData]         = useState([]);
  const [showTemplate, setShowTemplate]       = useState(false);
  const [expandedDate, setExpandedDate]       = useState(null);
  const [analyticsClient, setAnalyticsClient] = useState('');
  const [selectedProfileModal, setSelectedProfileModal] = useState(null);
  const [showAddClient, setShowAddClient]     = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [menuOpen, setMenuOpen]               = useState(false);
  const [showProgramBuilder, setShowProgramBuilder] = useState(false);
  const [planMeta, setPlanMeta]               = useState(null);
  const {plan, setPlan, selectedDayId, setSelectedDayId,
    selectedDay,
    addWeek, removeWeek, renameWeek,
    addDay,  removeDay,  renameDay,
  } = useWeeklyPlan(planMeta);
  const [clientSearch, setClientSearch]       = useState('');
  const [clientGoalFilter, setClientGoalFilter] = useState('ALL');
  const [clientLevelFilter, setClientLevelFilter] = useState('ALL');
  const [clientSort, setClientSort]           = useState('last');
  const [templateName, setTemplateName]       = useState('Push/Pull/Legs');
  const [copyFromClient, setCopyFromClient]   = useState('');
  const [libraryGroupBy, setLibraryGroupBy]   = useState('muscle');
  const [librarySearch, setLibrarySearch]     = useState('');

  const bg = 'bg-white border-slate-200';
  const tx = 'text-slate-900';
  const sub = 'text-slate-500';
  const inp = 'bg-slate-50 border-slate-200';
  const rowbg = 'bg-slate-50 border-slate-100';

  // Load planMeta per client from Firestore
  useEffect(()=>{
    if(!targetClient) return;
    const ref = doc(db,'artifacts',appId,'public','data','planMeta',targetClient);
    const unsub = onSnapshot(ref, snap=>{
      setPlanMeta(snap.exists() ? snap.data() : null);
    });
    return ()=>unsub();
  },[targetClient,db,appId]);

  // Sync selectedDay.title â†’ sessionName
  useEffect(()=>{
    if(selectedDay) setSessionName(selectedDay.title);
  },[selectedDay]);

  // Persist plan to Firestore on change
  useEffect(()=>{
    if(!targetClient || !plan?.weeks) return;
    const ref = doc(db,'artifacts',appId,'public','data','planMeta',targetClient);
    setDoc(ref, plan, {merge:true});
  },[plan,targetClient,db,appId]);

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
    const dayNames = workouts.filter(w=>w.assignedTo===targetClient).map(w=>w.day);
    if(sessionName) dayNames.push(sessionName);
    const days = [...new Set(dayNames)].filter(Boolean).sort((a,b)=>{
      const aNum = parseInt(a.split(' ')[1]) || 999;
      const bNum = parseInt(b.split(' ')[1]) || 999;
      return aNum - bNum;
    });
    return days;
  },[workouts,targetClient,sessionName]);

  const getNextDayName = () => {
    const maxDay = clientDays.reduce((max, day) => Math.max(max, parseInt(day.match(/\d+/)?.[0], 10) || 0), 0);
    return `Day ${maxDay + 1}`;
  };

  const addNextDay = () => {
    if(!targetClient) { alert('Select a client first'); return; }
    setSessionName(getNextDayName());
  };

  const deleteDay = async (day) => {
    const dayExercises = workouts.filter(w=>w.assignedTo===targetClient&&w.day===day);
    if(!window.confirm(`Delete ${day} and ${dayExercises.length} exercise(s)?`)) return;
    for (const ex of dayExercises) {
      await deleteDoc(doc(db,'artifacts',appId,'public','data','workouts',ex.id));
    }
    if(sessionName === day) setSessionName('');
  };

  // Archive grouped by date
  const archiveGroups = useMemo(()=>{
    if(!analyticsClient) return [];
    const filtered = logs.filter(l=>l.clientName===analyticsClient);
    const grouped = {};
    filtered.forEach(log=>{
      const d = log.completedAt?.toDate?.().toLocaleDateString('en-US')||'Unknown';
      if(!grouped[d]) grouped[d]=[];
      grouped[d].push(log);
    });
    return Object.entries(grouped).sort(([a],[b])=>new Date(b)-new Date(a)).slice(0,10);
  },[logs,analyticsClient]);

  // Muscle chart data
  const rpeChartData = useMemo(()=>{
    if(!analyticsClient) return [];
    return logs
      .filter(l=>l.clientName===analyticsClient&&Number(l.rpe))
      .sort((a,b)=>(a.completedAt?.toDate?.()||0)-(b.completedAt?.toDate?.()||0))
      .slice(-10)
      .map(l=>({
        date:l.completedAt?.toDate?.().toLocaleDateString('en-US',{month:'short',day:'numeric'})||'Log',
        rpe:Number(l.rpe),
        volume:Number(l.volume)||0,
      }));
  },[logs,analyticsClient]);

  const clientRows = useMemo(()=>{
    return Object.entries(clientNames).map(([phone,client])=>({
      phone,
      client,
      metrics:getClientMetrics(phone, workouts, logs)
    })).filter(row=>{
      const q = clientSearch.toLowerCase().trim();
      const matchQ = !q || row.client.name?.toLowerCase().includes(q) || row.phone.includes(q) || row.client.goal?.toLowerCase().includes(q);
      const matchGoal = clientGoalFilter === 'ALL' || (row.client.goal || '').toLowerCase().includes(clientGoalFilter.toLowerCase());
      const matchLevel = clientLevelFilter === 'ALL' || (row.client.level || '').toLowerCase().includes(clientLevelFilter.toLowerCase());
      return matchQ && matchGoal && matchLevel;
    }).sort((a,b)=>{
      if(clientSort === 'name') return (a.client.name||'').localeCompare(b.client.name||'');
      if(clientSort === 'goal') return (a.client.goal||'').localeCompare(b.client.goal||'');
      if(clientSort === 'level') return (a.client.level||'').localeCompare(b.client.level||'');
      if(clientSort === 'adherence') return b.metrics.adherence - a.metrics.adherence;
      return a.metrics.daysSinceLast - b.metrics.daysSinceLast;
    });
  },[clientNames, workouts, logs, clientSearch, clientGoalFilter, clientLevelFilter, clientSort]);

  const dashboardStats = useMemo(()=>{
    const rows = Object.entries(clientNames).map(([phone])=>getClientMetrics(phone, workouts, logs));
    const adherence = rows.length ? Math.round(rows.reduce((a,m)=>a+m.adherence,0)/rows.length) : 0;
    const topMuscles = {};
    logs.forEach(l => {
      const muscle = getMuscleGroup(l.exerciseName);
      if(muscle) topMuscles[muscle] = (topMuscles[muscle] || 0) + 1;
    });
    return {
      adherence,
      completed: logs.length,
      topMuscle:Object.entries(topMuscles).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'â€”',
      atRisk: rows.filter(m=>m.daysSinceLast>=7 || m.adherence<50).length,
    };
  },[clientNames, workouts, logs]);

  const libraryGroups = useMemo(()=>{
    const q = librarySearch.toLowerCase().trim();
    const filtered = libraryData.filter(ex => !q || ex.name?.toLowerCase().includes(q) || getExerciseMuscle(ex).toLowerCase().includes(q) || ex.category?.toLowerCase().includes(q));
    const groups = libraryGroupBy === 'muscle' ? MUSCLE_GROUPS : CATEGORIES;
    return groups.map(group => ({
      group,
      exercises: filtered.filter(ex => libraryGroupBy === 'muscle' ? getExerciseMuscle(ex) === group : ex.category === group).sort((a,b) => a.name.localeCompare(b.name))
    })).filter(item => item.exercises.length > 0);
  }, [libraryData, libraryGroupBy, librarySearch]);

  const applyTemplate = async () => {
    if(!targetClient) { alert('Select a client first'); return; }
    const items = buildExpandedTemplateItems(templateName, libraryData);
    const base = Date.now();
    for(let i=0;i<items.length;i++){
      const { orderIndex, ...item } = items[i];
      await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
        ...item,
        gifUrl:item.gifUrl||'',
        assignedTo:targetClient,
        orderIndex:base+i,
      });
    }
    alert(`Assigned ${items.length} exercises from ${templateName} âœ…`);
  };

  const applySmartProgram = async () => {
    if(!targetClient) { alert('Select a client first'); return; }
    const client = clientNames[targetClient] || {};
    const goal = (client.goal || '').toLowerCase();
    const injuries = (client.injuries || '').toLowerCase();
    let selectedTemplate = 'Push/Pull/Legs';
    if(goal.includes('loss') || goal.includes('fat') || goal.includes('weight')) selectedTemplate = 'Fat Loss';
    if(goal.includes('strength') || (client.nasm_phase || 1) >= 4) selectedTemplate = 'Strength';
    if(injuries || goal.includes('rehab')) selectedTemplate = 'Rehab';
    const items = buildExpandedTemplateItems(
      selectedTemplate,
      libraryData,
      [injuries ? `Injury note: ${client.injuries}` : '', `Auto-generated from ${selectedTemplate}`].filter(Boolean).join(' Â· ')
    );
    const base = Date.now();
    for(let i=0;i<items.length;i++){
      const { orderIndex, ...item } = items[i];
      await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
        ...item,
        gifUrl:item.gifUrl||'',
        assignedTo:targetClient,
        orderIndex:base+i,
      });
    }
    alert(`Smart program generated: ${selectedTemplate} (${items.length} exercises) âœ…`);
  };

  const copyProgram = async () => {
    if(!copyFromClient || !targetClient) { alert('Choose source and target clients'); return; }
    if(copyFromClient === targetClient) { alert('Choose two different clients'); return; }
    const source = workouts.filter(w=>w.assignedTo===copyFromClient).sort((a,b)=>a.orderIndex-b.orderIndex);
    if(!source.length) { alert('Source client has no program'); return; }
    const base = Date.now();
    for(let i=0;i<source.length;i++){
      const { id, assignedTo, ...rest } = source[i];
      await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
        ...rest,
        assignedTo:targetClient,
        orderIndex:base+i,
      });
    }
    alert(`Copied ${source.length} exercises âœ…`);
  };

  const tabButtons = [
    {id:'overview', label:'Overview'},
    {id:'clients', label:'Clients'},
    {id:'library', label:'Library'},
    {id:'plan', label:'Plan'},
    {id:'analytics', label:'Analytics'}
  ];

  return(
    <div className="space-y-5 font-black pb-20">
      {/* Tabs - Desktop */}
      <div className="hidden md:flex gap-2 border-b-2 border-slate-200 pb-3 overflow-x-auto hide-scrollbar">
        {tabButtons.map(tab=>(
          <button key={tab.id} onClick={()=>{setActiveTab(tab.id);setMenuOpen(false);}} className={`px-6 py-2 rounded-2xl text-sm font-black uppercase shrink-0 transition-all ${activeTab===tab.id?'bg-slate-900 text-emerald-400 scale-105':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden flex gap-2 items-center pb-2">
        <button onClick={()=>setMenuOpen(!menuOpen)} className="bg-slate-900 text-emerald-400 px-4 py-2 rounded-2xl font-black text-sm">Menu</button>
        {menuOpen && (
          <div className="absolute top-20 left-4 right-4 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-50">
            {tabButtons.map(tab=>(
              <button key={tab.id} onClick={()=>{setActiveTab(tab.id);setMenuOpen(false);}} className="w-full text-left px-6 py-3 font-black text-sm border-b border-slate-100 last:border-0 hover:bg-emerald-50">
                {tab.label}
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
              {clientRows.slice(0,8).map(({phone,client,metrics})=>{
                const clientPhase = client.nasm_phase || 1;
                return(
                  <div key={phone} onClick={()=>setSelectedProfileModal({...client,phone})} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 cursor-pointer transition-all hover:shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base shrink-0" style={{backgroundColor: PHASE_COLORS[clientPhase]}}>
                        {clientPhase}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-black text-sm ${tx}`}>{titleCase(client.name)}</p>
                        <p className={`text-[10px] ${sub}`}>{client.phone}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-black ${sub} shrink-0`}>{metrics.daysSinceLast===0?'Today':metrics.daysSinceLast===999?'Never':`${metrics.daysSinceLast}d ago`}</span>
                    </div>
                    <div className="h-1.5 rounded-full w-full bg-slate-100">
                      <div className="h-full rounded-full transition-all" style={{width:`${metrics.adherence}%`, backgroundColor: PHASE_COLORS[clientPhase]}}/>
                    </div>
                    <span className={`text-[9px] font-black ${sub}`}>4-week adherence {metrics.adherence}% Â· top {metrics.topMuscle}</span>
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
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <p className="font-black text-3xl text-emerald-500">{dashboardStats.adherence}%</p>
                <p className={`text-[10px] font-black ${sub} mt-1`}>Avg Adherence</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 text-center">
                <p className="font-black text-3xl text-emerald-500">{dashboardStats.atRisk}</p>
                <p className={`text-[10px] font-black ${sub} mt-1`}>At Risk</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-center">
              <p className="font-black text-xs uppercase text-slate-400">Most Trained Muscle</p>
              <p className="font-black text-2xl text-emerald-400">{dashboardStats.topMuscle}</p>
            </div>
            <button onClick={()=>setShowAddClient(true)} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">+ Add New Client</button>
          </div>
        </div>
      )}

      {/* CLIENTS */}
      {activeTab==='clients'&&(
        <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
            <div>
              <h3 className={`font-black text-base ${tx}`}>Client List</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase">{clientRows.length} visible clients</p>
            </div>
            <button onClick={()=>setShowAddClient(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase">+ Add</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Search name, phone, goal..." className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}/>
            <select value={clientGoalFilter} onChange={e=>setClientGoalFilter(e.target.value)} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}>
              <option value="ALL">All Goals</option>
              <option value="Weight Loss">Weight Loss</option>
              <option value="Muscle">Muscle</option>
              <option value="Strength">Strength</option>
              <option value="Fitness">Fitness</option>
            </select>
            <select value={clientLevelFilter} onChange={e=>setClientLevelFilter(e.target.value)} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}>
              <option value="ALL">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <select value={clientSort} onChange={e=>setClientSort(e.target.value)} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}>
              <option value="last">Sort: Last Workout</option>
              <option value="adherence">Sort: Adherence</option>
              <option value="name">Sort: Name</option>
              <option value="goal">Sort: Goal</option>
              <option value="level">Sort: Level</option>
            </select>
          </div>
          <div className="space-y-3">
            {clientRows.map(({phone,client,metrics})=>{
              const clientPhase = client.nasm_phase || 1;
              return (
                <div key={phone} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0" style={{backgroundColor: PHASE_COLORS[clientPhase]}}>{clientPhase}</div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-black text-sm text-slate-900">{titleCase(client.name)}</p>
                      <p className="text-xs text-slate-500 truncate">{client.goal || 'No goal'} Â· {client.level || NASM_OPT_PHASES[clientPhase]?.phase}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div className="text-center bg-white rounded-xl p-2 border border-slate-100">
                        <p className="text-sm font-black text-emerald-500">{metrics.adherence}%</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Adherence</p>
                      </div>
                      <div className="text-center bg-white rounded-xl p-2 border border-slate-100">
                        <p className="text-sm font-black text-emerald-500">{metrics.completed}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Done</p>
                      </div>
                      <div className="text-center bg-white rounded-xl p-2 border border-slate-100">
                        <p className="text-sm font-black text-emerald-500">{metrics.daysSinceLast===999?'â€”':`${metrics.daysSinceLast}d`}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Last</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>{setTargetClient(phone);setActiveTab('plan');}} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase hover:border-emerald-300 transition-all">Plan</button>
                      <button onClick={()=>setSelectedProfileModal({...client,phone})} className="bg-slate-900 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-800 transition-all">View</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedProfileModal&&(
        <ClientProfileViewModal client={selectedProfileModal} logs={logs} workouts={workouts} onClose={()=>setSelectedProfileModal(null)} db={db} appId={appId} onToPlan={()=>{setSelectedProfileModal(null);setTargetClient(selectedProfileModal.phone);setActiveTab('plan');}}/>
      )}

      {/* LIBRARY */}
      {activeTab==='library'&&(
        <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
            <div>
              <h3 className={`font-black text-base ${tx}`}>Exercise Library ({libraryData.length})</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase">Grouped by muscle or exercise type</p>
            </div>
            <button onClick={()=>setShowAddExercise(true)} className="bg-emerald-500 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase">+ Add Exercise</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 mb-4">
            <input value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)} placeholder="Search exercise, muscle, or type..." className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}/>
            <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
              <button onClick={()=>setLibraryGroupBy('muscle')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${libraryGroupBy==='muscle'?'bg-slate-900 text-emerald-400':'text-slate-500'}`}>By Muscle</button>
              <button onClick={()=>setLibraryGroupBy('type')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${libraryGroupBy==='type'?'bg-slate-900 text-emerald-400':'text-slate-500'}`}>By Type</button>
            </div>
          </div>
          {libraryData.length===0?(
            <div className="text-center py-12 text-slate-400 font-black">
              <p className="mb-4 text-2xl">📚</p>
              <p>Library is empty</p>
              <p className="text-sm mt-2">Add your first exercise to get started</p>
            </div>
          ):(
            <div className="space-y-3">
              {libraryGroups.length===0&&(
                <p className="text-center py-8 text-slate-400 font-black text-sm">No exercises match your search</p>
              )}
              {libraryGroups.map(({group, exercises})=>{
                return(
                  <div key={group}>
                    <details className="border-2 border-slate-200 rounded-2xl overflow-hidden">
                      <summary className="p-4 bg-slate-900 text-emerald-400 font-black cursor-pointer hover:bg-slate-800 transition-all flex justify-between items-center select-none">
                        <span className="uppercase">{group}</span>
                        <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full">{exercises.length}</span>
                      </summary>
                      <div className="p-4 space-y-2 bg-slate-50">
                        {exercises.map(ex=>(
                          <div key={ex.id} className="p-3 rounded-xl bg-white border-2 border-slate-100 hover:border-emerald-300 transition-all flex justify-between items-center group">
                            <div>
                              <p className="font-black text-sm text-slate-900">{formatName(ex.name)}</p>
                              <p className="text-[10px] text-slate-500 font-black uppercase">{getExerciseMuscle(ex)} Â· {ex.category || 'RESISTANCE'}</p>
                              {ex.gifUrl&&<p className="text-[10px] text-blue-600 font-black">âœ“ GIF</p>}
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
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl space-y-4`}>
            <div>
              <h4 className={`font-black text-base border-b pb-3 ${tx} border-slate-200`}>Plan Actions</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase mt-2 leading-relaxed">
                Batch tools only. The old manual assign form is gone.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-4 space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase">Current client</p>
              <p className="font-black text-sm text-slate-900">
                {targetClient && clientNames[targetClient] ? titleCase(clientNames[targetClient]?.name || targetClient) : 'No client selected'}
              </p>
              <p className="text-[10px] font-bold text-slate-500">
                {targetClient ? 'Chosen from the Clients tab' : 'Open a client from the Clients tab first'}
              </p>
            </div>
            <button
              onClick={()=> targetClient ? setShowTemplate(true) : alert('Select a client from the Clients tab first')}
              disabled={!targetClient}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40"
            >
              Full Day Template
            </button>
            <button
              onClick={()=> targetClient ? applySmartProgram() : alert('Select a client from the Clients tab first')}
              disabled={!targetClient}
              className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-40"
            >
              Smart Program
            </button>
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              <p className="font-black text-sm text-slate-900 mb-2">Need a new plan?</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select a client, then use a template or smart generation instead of adding exercises one by one.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className={`${bg} border-2 rounded-[2.5rem] shadow-xl overflow-hidden`}>
              <WeeklySidebar
                plan={plan}
                selectedDayId={selectedDayId}
                onSelectDay={setSelectedDayId}
                onAddWeek={addWeek}
                onAddDay={(weekId)=>{ addDay(weekId); }}
                onRemoveDay={(weekId,dayId)=>{ removeDay(weekId,dayId); }}
                onRenameDay={renameDay}
                onRemoveWeek={removeWeek}
                onRenameWeek={renameWeek}
              />
            </div>

            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-sm border-b pb-3 text-left uppercase text-emerald-500 border-slate-200 flex-1">Performance Archive</h3>
              </div>
              {!analyticsClient
                ?<p className={`text-xs font-black ${sub} text-center py-8`}>Select a client to view history</p>
                :<div className="space-y-2 max-h-64 overflow-y-auto">
                  {archiveGroups.length===0
                    ?<p className={`text-xs font-black ${sub} text-center py-8`}>No records yet</p>
                    :archiveGroups.map(([date,entries])=>(
                      <div key={date}>
                        <button onClick={()=>setExpandedDate(expandedDate===date?null:date)} className={`w-full grid grid-cols-[1fr_auto_auto] items-center gap-3 p-3 rounded-xl font-black text-xs hover:bg-emerald-50 transition-all ${rowbg}`}>
                          <span className="font-black text-xs text-slate-600 text-left">{entries.length} exercises</span>
                          <span className="font-black text-xs text-emerald-600 text-center">{date}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if(!window.confirm(`Delete ${entries.length} log(s) only for ${titleCase(clientNames[analyticsClient]?.name||analyticsClient)} on ${date}?`)) return;
                                deleteLogsByDate(new Date(date), db, appId, analyticsClient).then(count => {
                                  alert(`Deleted ${count} log(s) for ${titleCase(clientNames[analyticsClient]?.name||analyticsClient)} on ${date}`);
                                }).catch(err => alert(err.message));
                              }}
                              className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-lg text-[10px] font-black hover:bg-red-500 hover:text-white transition-all"
                              title="Ø­Ø°Ù Ø§Ù„ÙŠÙˆÙ… Ø¨Ø§Ù„ÙƒØ§Ù…Ù„"
                            >
                              ðŸ—‘ï¸
                            </button>
                            <span className="justify-self-end bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-black">EDIT</span>
                          </div>
                        </button>
                        {expandedDate===date&&(
                          <div className="p-2 space-y-1 bg-white">
                            {entries.map((e,i)=>(
                              <div key={i} className="text-xs font-bold p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between group">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <p className="font-black text-slate-900 truncate">{formatName(e.exerciseName)}</p>
                                    {e.isAlternative&&<span className="text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">ALT</span>}
                                  </div>
                                  {e.isAlternative&&e.originalExerciseName&&(
                                    <p className="text-[9px] text-slate-400 font-bold mb-1 truncate">Ø¨Ø¯ÙŠÙ„ Ù…Ù†: {formatName(e.originalExerciseName)}</p>
                                  )}
                                  <div className="flex justify-between items-center mt-1">
                                    <p className={`text-[9px] ${sub}`}>{e.setsData?.length||0} sets</p>
                                    {e.setsData&&e.setsData.length>0&&<p className="text-[9px] font-black text-emerald-600">{Math.max(...e.setsData.map(s=>parseFloat(s.weight)||0))}kg</p>}
                                    {e.rpe&&<p className="text-[9px] font-black text-amber-600">RPE {e.rpe}</p>}
                                    {e.isPR&&<span className="text-xs">ðŸ†</span>}
                                  </div>
                                </div>
                                <button
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    if(!window.confirm(`Delete ${formatName(e.exerciseName)} only for ${titleCase(clientNames[analyticsClient]?.name||analyticsClient)} on ${date}?`)) return;
                                    deleteLogsByExerciseAndDate(e.exerciseName, new Date(date), db, appId, analyticsClient).then(count => {
                                      alert(`Deleted ${count} log(s) for ${formatName(e.exerciseName)} on ${date}`);
                                    }).catch(err => alert(err.message));
                                  }}
                                  className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700"
                                  title="Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„ØªÙ…Ø±ÙŠÙ† Ù…Ù† Ø§Ù„ÙŠÙˆÙ…"
                                >
                                  ðŸ—‘ï¸
                                </button>
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
            <div>
              <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
                <h3 className={`font-black text-base border-b pb-3 mb-4 ${tx} border-slate-200`}>RPE & Volume Trend</h3>
                {rpeChartData.length>0?(
                  <div className="h-64 -mx-6 px-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rpeChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}/>
                        <YAxis yAxisId="rpe" domain={[1,10]} stroke="#f59e0b" fontSize={10} tickLine={false} axisLine={false}/>
                        <YAxis yAxisId="volume" orientation="right" stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false}/>
                        <Tooltip contentStyle={{borderRadius:'16px',border:'none',boxShadow:'0 10px 25px -5px rgba(0,0,0,0.1)',background:'#fff'}}/>
                        <Legend/>
                        <Line yAxisId="rpe" type="monotone" dataKey="rpe" name="RPE" stroke="#f59e0b" strokeWidth={3} dot={{r:5,fill:'#f59e0b',strokeWidth:2,stroke:'#fff'}}/>
                        <Line yAxisId="volume" type="monotone" dataKey="volume" name="Volume" stroke="#3b82f6" strokeWidth={3} dot={{r:5,fill:'#3b82f6',strokeWidth:2,stroke:'#fff'}}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ):(
                  <div className="h-40 flex items-center justify-center">
                    <p className={`text-sm font-black ${sub} text-center`}>No RPE records yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showAddClient&&<AddNewClientModal onClose={()=>setShowAddClient(false)} db={db} appId={appId}/>}
      {showAddExercise&&<AddExerciseModal onClose={()=>setShowAddExercise(false)} db={db} appId={appId}/>}
      {editingExercise&&<EditExerciseModal exercise={editingExercise} onClose={()=>setEditingExercise(null)} db={db} appId={appId} collectionName="library"/>}
      {showTemplate&&<DayTemplateModal onClose={()=>setShowTemplate(false)} db={db} appId={appId} libraryData={libraryData} targetClient={targetClient} sessionName={sessionName}/>}
    </div>
  );
}

