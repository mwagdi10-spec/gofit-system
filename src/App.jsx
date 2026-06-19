import React, { useState, useEffect, useMemo, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  collection, onSnapshot, addDoc, serverTimestamp, doc,
  query, orderBy, deleteDoc, updateDoc, setDoc,
  where, getDocs, Timestamp
} from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AppRouter from './navigation/AppRouter';
import { NASM_OPT_PHASES, PHASE_COLORS } from './constants/nasm';
import { WORKOUT_TEMPLATES } from './constants/templates';
import { db, auth, APP_ID, TRAINER_MAIL, CATEGORIES, MUSCLE_GROUPS } from './services/firebase/config';
import { deleteLogsByDate, deleteLogsByExerciseAndDate } from './services/firebase/logs';
import { titleCase, formatName, getMuscleGroup, getExerciseMuscle, dateFromLog, startOfDay } from './utils/formatters';
import { buildExpandedTemplateItems } from './utils/helpers';
import { makeDefaultAlternatives, normalizeAlternatives, getFilledAlternatives, applySuggestedAlternatives, getAlternativeOptions, suggestAlternatives } from './utils/validators';
import { getClientMetrics } from './engines/nasm';
import { useBackButton } from './hooks/useBackButton';
import { GifPopup } from './components/ui/GifPopup';
import { SearchableDropdown } from './components/ui/SearchableDropdown';
import { LinkifiedText } from './components/shared/LinkifiedText';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { ClientSelector, AddNewClientModal } from './features/ClientSelector';
import { ClientProfileViewModal } from './features/ClientProfileModal';
import { EditExerciseModal, AddExerciseModal } from './features/ExerciseLibrary';
import { DayTemplateModal, ExerciseEditRow, ProgramBuilder } from './features/DayBuilder';
import { ExerciseRow, CoolDownStretchCard } from './features/ExerciseRow';
import WeeklySidebar from './features/WeeklySidebar'
import { useWeeklyPlan } from './hooks/useWeeklyPlan'

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
  const [selectedWeek, setSelectedWeek]       = useState('Week 1');
  const [expandedWeeks, setExpandedWeeks]     = useState({'Week 1': true});
  const [clientSearch, setClientSearch]       = useState('');
  const [clientGoalFilter, setClientGoalFilter] = useState('ALL');
  const [clientLevelFilter, setClientLevelFilter] = useState('ALL');
  const [clientSort, setClientSort]           = useState('last');
  const [templateName, setTemplateName]       = useState('Push/Pull/Legs');
  const [copyFromClient, setCopyFromClient]   = useState('');
  const [libraryGroupBy, setLibraryGroupBy]   = useState('muscle');
  const [librarySearch, setLibrarySearch]     = useState('');
  const bg = 'bg-Blue border-slate-200';
  const tx = 'text-slate-900';
  const sub = 'text-slate-500';
  const inp = 'bg-slate-50 border-slate-200';
  const rowbg = 'bg-slate-50 border-slate-100';

  // Load library
  useEffect(()=>{
    const u = onSnapshot(collection(db,'artifacts',appId,'public','data','library'), s=>{
      setLibraryData(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    return()=>u();
  },[db,appId]);

  // Weeks+Days nested structure (flat days -> Week 1 migration)
  const weeksStructure = useMemo(()=>{
    if(!targetClient) return [];
    const grouped = {};
    workouts.filter(w=>w.assignedTo===targetClient).forEach(w=>{
      const wk = w.week || 'Week 1';
      const dy = w.day || 'Day 1';
      if(!grouped[wk]) grouped[wk]={};
      if(!grouped[wk][dy]) grouped[wk][dy]=0;
      grouped[wk][dy]++;
    });
    return Object.keys(grouped)
      .sort((a,b)=>(parseInt(a.match(/\d+/)?.[0])||0)-(parseInt(b.match(/\d+/)?.[0])||0))
      .map(wk=>({
        id:wk, title:wk,
        days:Object.keys(grouped[wk])
          .sort((a,b)=>(parseInt(a.match(/\d+/)?.[0])||0)-(parseInt(b.match(/\d+/)?.[0])||0))
          .map(dy=>({weekId:wk, title:dy, count:grouped[wk][dy]}))
      }));
  },[workouts,targetClient]);

  // Scoped to selectedWeek for form chips
  const clientDays = useMemo(()=>{
    if(!targetClient) return [];
    return [...new Set(
      workouts.filter(w=>w.assignedTo===targetClient&&(w.week||'Week 1')===selectedWeek).map(w=>w.day)
    )].filter(Boolean)
      .sort((a,b)=>(parseInt(a.match(/\d+/)?.[0])||999)-(parseInt(b.match(/\d+/)?.[0])||999));
  },[workouts,targetClient,selectedWeek]);

  const getNextDayName = (weekId=selectedWeek) => {
    const week = weeksStructure.find(w=>w.id===weekId);
    const max = week ? week.days.reduce((m,d)=>Math.max(m,parseInt(d.title.match(/\d+/)?.[0])||0),0) : 0;
    return `Day ${max+1}`;
  };
  const addNextDay = (weekId=selectedWeek) => {
    if(!targetClient){alert('Select a client first');return;}
    if(!weekId){alert('Select or create a week first');return;}
    setSelectedWeek(weekId);
    setSessionName(getNextDayName(weekId));
  };
  const addWeek = () => {
    if(!targetClient){alert('Select a client first');return;}
    const max = weeksStructure.reduce((m,w)=>Math.max(m,parseInt(w.id.match(/\d+/)?.[0])||0),0);
    const newWk = `Week ${max+1}`;
    setSelectedWeek(newWk);
    setExpandedWeeks(prev=>({...prev,[newWk]:true}));
    setSessionName('');
  };
  const deleteDay = async (day, weekId=selectedWeek) => {
    const dayExercises = workouts.filter(w=>w.assignedTo===targetClient&&w.day===day&&(w.week||'Week 1')===weekId);
    if(!window.confirm(`Delete ${day} (${weekId}) and ${dayExercises.length} exercise(s)?`)) return;
    for (const ex of dayExercises) {
      await deleteDoc(doc(db,'artifacts',appId,'public','data','workouts',ex.id));
    }
    if(sessionName===day&&selectedWeek===weekId) setSessionName('');
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
      topMuscle:Object.entries(topMuscles).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—',
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
        ...item, gifUrl:item.gifUrl||'', assignedTo:targetClient, week:selectedWeek, orderIndex:base+i,
      });
    }
    alert(`Assigned ${items.length} exercises from ${templateName} \u2705`);
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
    const items = buildExpandedTemplateItems(selectedTemplate, libraryData,
      [injuries ? `Injury note: ${client.injuries}` : '', `Auto-generated from ${selectedTemplate}`].filter(Boolean).join(' \u00b7 '));
    const base = Date.now();
    for(let i=0;i<items.length;i++){
      const { orderIndex, ...item } = items[i];
      await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
        ...item, gifUrl:item.gifUrl||'', assignedTo:targetClient, week:selectedWeek, orderIndex:base+i,
      });
    }
    alert(`Smart program generated: ${selectedTemplate} (${items.length} exercises) \u2705`);
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
        ...rest, assignedTo:targetClient, orderIndex:base+i,
      });
    }
    alert(`Copied ${source.length} exercises \u2705`);
  };

  const tabButtons = [
    {id:'overview', label:'Overview'},
    {id:'clients', label:'Clients'},
    {id:'library', label:'Library'},
    {id:'plan', label:'Plan'},
    {id:'analytics', label:'Analytics'},
    {id:'inbox', label:'Inbox'}
  ];

  return(
    <div className="space-y-5 font-black pb-20">
      {/* Tabs - Desktop */}
      <div className="hidden md:flex gap-10 border-b-4 border-slate-200 pb-4 overflow-x-">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className={`${bg} border-3 p-8 rounded-[2.5rem] shadow-xl`}>
            <h3 className={`font-black text-base border-b pb-3 mb-3 ${tx} border-slate-200`}>Clients ({Object.keys(clientNames).length})</h3>
            <div className="space-y-2 max-h-85 overflow-y-auto">
              {clientRows.slice(0,8).map(({phone,client,metrics})=>{
                const clientPhase = client.nasm_phase || 1;
                return(
                  <div key={phone} onClick={()=>setSelectedProfileModal({...client,phone})} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 cursor-pointer transition-all hover:shadow-lg">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base shrink-0" style={{backgroundColor: PHASE_COLORS[clientPhase]}}>{clientPhase}</div>
                      <div className="flex-1 text-left">
                        <p className={`font-black text-sm ${tx}`}>{titleCase(client.name)}</p>
                        <p className={`text-[12px] ${sub}`}>{client.phone}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-black ${sub} shrink-0`}>{metrics.daysSinceLast===0?'Today':metrics.daysSinceLast===999?'Never':`${metrics.daysSinceLast}d ago`}</span>
                    </div>
                    <div className="h-1.5 rounded-full w-full bg-slate-100">
                      <div className="h-full rounded-full transition-all" style={{width:`${metrics.adherence}%`, backgroundColor: PHASE_COLORS[clientPhase]}}/>
                    </div>
                    <span className={`text-[12px] font-black ${sub}`}>4-week adherence {metrics.adherence}% · top {metrics.topMuscle}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`${bg} border-3 p-5 rounded-[2.5rem] shadow-xl space-y-3`}>
            <h3 className={`font-black text-base border-b pb-3 ${tx} border-slate-200`}>Quick Stats</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                {v:Object.keys(clientNames).length, l:'Total Clients'},
                {v:workouts.length, l:'Total Exercises'},
                {v:logs.length, l:'Logs Recorded'},
                {v:logs.filter(l=>l.isPR).length, l:'PRs Achieved'},
                {v:`${dashboardStats.adherence}%`, l:'Avg Adherence'},
                {v:dashboardStats.atRisk, l:'At Risk'},
              ].map((s,i)=>(
                <div key={i} className="p-4 rounded-2xl bg-slate-50 text-center">
                  <p className="font-black text-3xl text-emerald-500">{s.v}</p>
                  <p className={`text-[12px] font-black ${sub} mt-1`}>{s.l}</p>
                </div>
              ))}
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
              <p className="text-[12px] font-black text-slate-400 uppercase">{clientRows.length} clients</p>
            </div>
            <button onClick={()=>setShowAddClient(true)} className="bg-emerald-500 text-white px-6 py-2 rounded-2xl font-black text-xs">+ Add</button>
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
          <div className="space-y-1">
            {clientRows.map(({phone,client,metrics})=>{
              const clientPhase = client.nasm_phase || 1;
              return (
                <div key={phone} className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0" style={{backgroundColor: PHASE_COLORS[clientPhase]}}>{clientPhase}</div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-black text-sm text-slate-900">{titleCase(client.name)}</p>
                      <p className="text-xs text-slate-500 truncate">{client.goal || 'No goal'} · {client.level || NASM_OPT_PHASES[clientPhase]?.phase}</p>
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
                        <p className="text-sm font-black text-emerald-500">{metrics.daysSinceLast===999?'—':`${metrics.daysSinceLast}d`}</p>
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
              <p className="mb-4 text-2xl">📚</p><p>Library is empty</p>
              <p className="text-sm mt-2">Add your first exercise to get started</p>
            </div>
          ):(
            <div className="space-y-3">
              {libraryGroups.length===0&&<p className="text-center py-8 text-slate-400 font-black text-sm">No exercises match your search</p>}
              {libraryGroups.map(({group, exercises})=>(
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
                            <p className="text-[10px] text-slate-500 font-black uppercase">{getExerciseMuscle(ex)} · {ex.category || 'RESISTANCE'}</p>
                            {ex.gifUrl&&<p className="text-[10px] text-blue-600 font-black">✓ GIF</p>}
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLAN */}
      {activeTab==='plan'&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Assign Form */}
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl space-y-3`}>
            <h4 className={`font-black text-base border-b pb-3 ${tx} border-slate-200`}>Assign Session</h4>
            <ClientSelector clientNames={clientNames} value={targetClient} onChange={phone=>{setTargetClient(phone);setAnalyticsClient(phone);setSessionName('');setSelectedWeek('Week 1');}} placeholder="Select Client..."/>
            {targetClient&&clientNames[targetClient]&&(
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm" style={{backgroundColor: PHASE_COLORS[clientNames[targetClient]?.nasm_phase || 1]}}>{clientNames[targetClient]?.nasm_phase || 1}</div>
                <div className="text-left">
                  <p className="font-black text-sm text-slate-900">{titleCase(clientNames[targetClient]?.name||targetClient)}</p>
                  <p className="text-[10px] text-slate-500">{NASM_OPT_PHASES[clientNames[targetClient]?.nasm_phase || 1]?.phase}</p>
                </div>
                {clientDays.length>0&&(
                  <div className="ml-auto flex gap-1 flex-wrap justify-end">
                    {clientDays.map(d=>(
                      <button key={d} onClick={()=>setSessionName(d)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${sessionName===d?'bg-slate-900 text-emerald-400':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{d}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <input type="text" placeholder="Day Num" value={sessionName} onChange={e=>setSessionName(e.target.value)} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}/>
            <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 space-y-3">
              <div className="flex justify-between items-center gap-2">
                <h4 className="font-black text-sm text-slate-900">Workout Templates</h4>
                <button onClick={applyTemplate} className="bg-emerald-500 text-white px-2 py-1 rounded-xl text-sm font-black">Apply</button>
              </div>
              <select value={templateName} onChange={e=>setTemplateName(e.target.value)} className="w-full p-2 bg-white border-2 border-emerald-100 rounded-xl font-black text-sm outline-none focus:border-emerald-500">
                {Object.keys(WORKOUT_TEMPLATES).map(name=><option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 space-y-3">
              <div className="flex justify-between items-center gap-2">
                <h4 className="font-black text-sm text-slate-900">Copy Program</h4>
                <button onClick={copyProgram} className="bg-emerald-500 text-white px-2 py-1 rounded-xl text-sm font-black">Copy</button>
              </div>
              <ClientSelector clientNames={clientNames} value={copyFromClient} onChange={setCopyFromClient} placeholder="Source Client..."/>
            </div>

            <SearchableDropdown options={libraryData} value={newEx.name} onChange={v=>{
              const libEx = libraryData.find(l=>l.name===v);
              const nextEx = {...newEx, name:v, category:libEx?.category||newEx.category, muscleGroup:libEx?getExerciseMuscle(libEx):getMuscleGroup(v)||newEx.muscleGroup};
              setNewEx({...nextEx, alternatives: normalizeAlternatives(libEx?.alternatives?.length ? libEx.alternatives : applySuggestedAlternatives(nextEx, newEx.alternatives, libraryData))});
            }} placeholder="Search or add exercise..." allowNew={true}/>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Sets" value={newEx.sets} onChange={e=>setNewEx({...newEx,sets:e.target.value})} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none text-center focus:border-emerald-500 ${inp}`}/>
              <input type="text" placeholder="Reps" value={newEx.reps} onChange={e=>setNewEx({...newEx,reps:e.target.value})} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none text-center focus:border-emerald-500 ${inp}`}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={newEx.category} onChange={e=>{
                const nextEx = {...newEx, category:e.target.value, muscleGroup:e.target.value==='CARDIO'?'Cardio':newEx.muscleGroup};
                setNewEx({...nextEx, alternatives:getFilledAlternatives(newEx.alternatives).length?newEx.alternatives:applySuggestedAlternatives(nextEx,newEx.alternatives,libraryData)});
              }} className={`p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}>
                {CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select value={newEx.muscleGroup} onChange={e=>{
                const nextEx = {...newEx, muscleGroup:e.target.value};
                setNewEx({...nextEx, alternatives:getFilledAlternatives(newEx.alternatives).length?newEx.alternatives:applySuggestedAlternatives(nextEx,newEx.alternatives,libraryData)});
              }} className={`w-full p-3 border-2 rounded-xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}>
                {MUSCLE_GROUPS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Tempo" value={newEx.tempo} onChange={e=>setNewEx({...newEx,tempo:e.target.value})} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}/>
            <input type="text" placeholder="Coach Note (optional)" value={newEx.coachNote} onChange={e=>setNewEx({...newEx,coachNote:e.target.value})} className={`w-full p-3 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 text-center ${inp}`}/>
            <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black text-blue-600 uppercase">Client Alternatives</p>
                <button type="button" onClick={()=>setNewEx({...newEx, alternatives: applySuggestedAlternatives(newEx, newEx.alternatives, libraryData)})} className="bg-blue-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px] uppercase hover:bg-blue-700 transition-all">Suggest</button>
              </div>
              {normalizeAlternatives(newEx.alternatives).map((alt, i) => (
                <div key={alt.id} className="grid grid-cols-2 gap-2">
                  {i < 2 ? (
                    <select value={alt.name} onChange={e=>{
                      const selected = getAlternativeOptions(newEx, alt.name, libraryData).find(o=>o.name===e.target.value);
                      const alternatives = normalizeAlternatives(newEx.alternatives);
                      alternatives[i] = {...alternatives[i], name:e.target.value, reason:selected?.reason||alternatives[i].reason};
                      setNewEx({...newEx, alternatives});
                    }} className={`p-2 border rounded-xl font-black text-xs outline-none focus:border-blue-500 ${inp}`}>
                      <option value="">{`Suggestion ${i + 1}`}</option>
                      {getAlternativeOptions(newEx, alt.name, libraryData).map(o=>(
                        <option key={`${i}-${o.name}`} value={o.name}>{o.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" placeholder="Manual alternative" value={alt.name} onChange={e=>{
                      const alternatives = normalizeAlternatives(newEx.alternatives);
                      alternatives[i] = {...alternatives[i], name:e.target.value};
                      setNewEx({...newEx, alternatives});
                    }} className={`p-2 border rounded-xl font-black text-xs outline-none focus:border-blue-500 ${inp}`}/>
                  )}
                  <input type="text" placeholder="Equipment / Reason" value={alt.reason} onChange={e=>{
                    const alternatives = normalizeAlternatives(newEx.alternatives);
                    alternatives[i] = {...alternatives[i], reason:e.target.value};
                    setNewEx({...newEx, alternatives});
                  }} className={`p-2 border rounded-xl font-black text-xs outline-none focus:border-blue-500 ${inp}`}/>
                </div>
              ))}
            </div>
            <button onClick={async()=>{
              if(!targetClient||!newEx.name) return;
              const libEx=libraryData.find(l=>l.name===newEx.name);
              await addDoc(collection(db,'artifacts',appId,'public','data','workouts'),{
                ...newEx,
                muscleGroup:libEx?getExerciseMuscle(libEx):newEx.muscleGroup||getMuscleGroup(newEx.name)||'Other',
                alternatives:getFilledAlternatives(newEx.alternatives),
                gifUrl:libEx?.gifUrl||'',
                assignedTo:targetClient,
                week:selectedWeek,
                day:sessionName,
                orderIndex:Date.now()
              });
              setNewEx({name:'',category:'RESISTANCE',muscleGroup:'Other',sets:'3',reps:'10',tempo:'',coachNote:'',alternatives:makeDefaultAlternatives()});
              alert('Assigned \u2705');
            }} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">Assign Workout +</button>
            <div className="flex gap-2">
              <button onClick={()=>setShowTemplate(true)} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">📋 Full Day Template</button>
              <button onClick={()=>setNewEx({name:'',category:'RESISTANCE',muscleGroup:'Other',sets:'3',reps:'10',tempo:'',coachNote:'**NEW**',alternatives:makeDefaultAlternatives()})} className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">➕ New Exercise</button>
            </div>
          </div>
              

          {/* RIGHT: Plan Structure + Plan View + Archive */}
          <div className="space-y-5">
            {/* Plan Structure: Weeks > Days accordion */}
            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
              <div className={`flex items-center justify-between gap-3 border-b pb-3 mb-3 ${tx} border-slate-200`}>
                <h3 className="font-black text-base text-left">Plan Structure</h3>
                <button onClick={addWeek} className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-black text-xs uppercase shadow-md active:scale-95 transition-all">+ Week</button>
              </div>
              {weeksStructure.length===0 ? (
                <p className={`text-xs font-black ${sub} text-center py-6`}>Select a client or apply a template to build the plan</p>
              ) : (
                <div className="space-y-2">
                  {weeksStructure.map(week=>(
                    <div key={week.id} className="border-2 border-slate-100 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between bg-slate-900 text-emerald-400 px-4 py-2.5">
                        <button onClick={()=>setExpandedWeeks(prev=>({...prev,[week.id]:!prev[week.id]}))} className="flex items-center gap-2 font-black text-sm flex-1 text-left">
                          <span>{expandedWeeks[week.id]?'\u25be':'\u25b8'}</span>
                          <span>{week.title}</span>
                          <span className="text-[10px] text-emerald-300/60">({week.days.length} days)</span>
                        </button>
                        <button onClick={()=>addNextDay(week.id)} className="w-6 h-6 rounded-lg bg-emerald-500 text-white font-black text-xs hover:bg-emerald-400 transition-all" title={`Add day to ${week.title}`}>+</button>
                      </div>
                      {expandedWeeks[week.id]&&(
                        <div className="p-2 space-y-1 bg-slate-50">
                          {week.days.length===0 ? (
                            <p className="text-[10px] font-black text-slate-400 text-center py-2">No days yet — click + to add</p>
                          ) : week.days.map(day=>{
                            const isSel = sessionName===day.title&&selectedWeek===week.id;
                            return (
                              <button key={`${week.id}||${day.title}`} onClick={()=>{setSelectedWeek(week.id);setSessionName(day.title);}} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left ${isSel?'bg-emerald-500 text-white':'bg-white border border-slate-100 text-slate-700 hover:border-emerald-300'}`}>
                                <span className="font-black text-xs">{day.title}</span>
                                <div className="flex items-center gap-10">
                                  <span className={`text-[10px] font-black ${isSel?'text-emerald-100':'text-slate-400'}`}>{day.count} Exercise</span>
                                  <span onClick={e=>{e.stopPropagation();deleteDay(day.title,week.id);}} className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-black cursor-pointer transition-all ${isSel?'bg-emerald-600 text-white hover:bg-red-500':'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white'}`}>Delete</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Plan View */}
            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
              <h3 className={`font-black text-base border-b pb-3 mb-3 text-left ${tx} border-slate-200`}>
                Plan View: <span className="text-emerald-500 break-words">{sessionName&&selectedWeek?`${selectedWeek} / ${sessionName}`:''}</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                {workouts
                  .filter(w=>w.assignedTo===targetClient&&w.day===sessionName&&(w.week||'Week 1')===selectedWeek)
                  .sort((a,b)=>a.orderIndex-b.orderIndex)
                  .map((ex,idx,arr)=>(
                    <ExerciseEditRow key={ex.id} exercise={ex} idx={idx} arr={arr} db={db} appId={appId} libraryData={libraryData}/>
                  ))
                }
                {workouts.filter(w=>w.assignedTo===targetClient&&w.day===sessionName&&(w.week||'Week 1')===selectedWeek).length===0&&(
                  <p className={`text-xs font-black ${sub} text-center py-8`}>No exercises assigned</p>
                )}
              </div>
            </div>

            {/* Performance Archive */}
            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-sm border-b pb-3 text-left text-emerald-500 border-slate-200 flex-1">Performance Archive</h3>
                {analyticsClient && archiveGroups.length > 0 && (
                  <button onClick={async()=>{
                    if(!window.confirm(`Delete ${archiveGroups[0][0]} Delete`)) return;
                    const deleted = await deleteLogsByDate(new Date(archiveGroups[0][0]), db, appId);
                    alert(`Delete ${deleted} Delete`);
                  }} className="ml-2 text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-black hover:bg-red-600 transition-all">
                    🗑️ Delete
                  </button>
                )}
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
                            <button onClick={e=>{e.stopPropagation();deleteLogsByDate(new Date(date),db,appId).then(c=>alert(`Delete ${c} Delete`));}} className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-lg text-[10px] font-black hover:bg-red-500 hover:text-white transition-all">🗑️</button>
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
                                    <p className="text-[9px] text-slate-400 font-bold mb-1 truncate">\delete: {formatName(e.originalExerciseName)}</p>
                                  )}
                                  <div className="flex justify-between items-center mt-1">
                                    <p className={`text-[9px] ${sub}`}>{e.setsData?.length||0} sets</p>
                                    {e.setsData&&e.setsData.length>0&&<p className="text-[9px] font-black text-emerald-600">{Math.max(...e.setsData.map(s=>parseFloat(s.weight)||0))}kg</p>}
                                    {e.rpe&&<p className="text-[9px] font-black text-amber-600">RPE {e.rpe}</p>}
                                    {e.isPR&&<span className="text-xs">🏆</span>}
                                  </div>
                                </div>
                                <button onClick={ev=>{ev.stopPropagation();deleteLogsByExerciseAndDate(e.exerciseName,new Date(date),db,appId).then(c=>alert(`Delete ${c} Delete`));}} className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700">🗑️</button>
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
          )}
        </div>
      )}

      {/* INBOX */}
      {activeTab==='inbox'&&(
        <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
          <h3 className={`font-black text-base border-b pb-3 mb-4 ${tx} border-slate-200`}>Client Messages</h3>
          <div className="text-center py-20 text-slate-400 font-black">
            <p className="text-3xl mb-3">📮</p>
            <p>No messages yet</p>
            <p className="text-sm mt-2">Messages from clients will appear here</p>
          </div>
        </div>
      )}

      {showAddClient&&<AddNewClientModal onClose={()=>setShowAddClient(false)} db={db} appId={appId}/>}
      {showAddExercise&&<AddExerciseModal onClose={()=>setShowAddExercise(false)} db={db} appId={appId}/>}
      {editingExercise&&<EditExerciseModal exercise={editingExercise} onClose={()=>setEditingExercise(null)} db={db} appId={appId} collectionName="library"/>}
      {showTemplate&&<DayTemplateModal onClose={()=>setShowTemplate(false)} db={db} appId={appId} libraryData={libraryData} targetClient={targetClient} sessionName={sessionName} selectedWeek={selectedWeek}/>}
    </div>
  );
}

function ClientView({ workouts, db, appId, identifier, allLogs }) {
  const [selectedDay, setSelectedDay]         = useState('');
  const [note, setNote]                       = useState('');
  const [sessionFinished, setSessionFinished] = useState(false);
  const [showSummary, setShowSummary]         = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [coolDownLibrary, setCoolDownLibrary] = useState([]);
  const sub = 'text-slate-500';

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
        s.docs.map(d=>({id:`cooldown-library-${d.id}`, libraryId:d.id, ...d.data()}))
          .filter(ex=>ex.category==='COOL-DOWN')
          .sort((a,b)=>(a.name||'').localeCompare(b.name||''))
          .slice(0,10)
      );
    });
    return()=>u();
  },[db,appId]);

  useBackButton(showSummary,()=>setShowSummary(false));

  const filtered = workouts.filter(w=>w.day===selectedDay).sort((a,b)=>a.orderIndex-b.orderIndex);

  const exercisesByCategory = useMemo(()=>{
    const grouped = {};
    CATEGORIES.forEach(cat=>grouped[cat]=[]);
    filtered.forEach(ex=>{
      const cat = ex.category || 'RESISTANCE';
      if(!grouped[cat]) grouped[cat]=[];
      grouped[cat].push(ex);
    });
    const cooldownByName = new Map();
    [...coolDownLibrary, ...grouped['COOL-DOWN']].forEach(ex=>{
      const key = (ex.name||'').trim().toLowerCase();
      if(key && !cooldownByName.has(key)) cooldownByName.set(key, ex);
    });
    grouped['COOL-DOWN'] = [...cooldownByName.values()].slice(0,10);
    return grouped;
  },[filtered,coolDownLibrary]);

  const summaryData = useMemo(()=>{
    const today=new Date().toLocaleDateString('en-US');
    const tl=allLogs.filter(l=>l.clientName===identifier&&l.completedAt?.toDate().toLocaleDateString('en-US')===today);
    return{count:tl.length, totalSets:tl.reduce((a,l)=>a+(l.setsData?.length||0),0), prs:tl.filter(l=>l.isPR)};
  },[allLogs,identifier]);

  const toggleCategory = (cat) => setExpandedCategories(p=>({...p,[cat]:!p[cat]}));

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

      <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
        {days.map(d=>(
          <button key={d} onClick={()=>{setSelectedDay(d);setExpandedCategories({});}} className={`px-7 py-4 rounded-[2rem] font-black text-sm transition-all shrink-0 shadow-lg border-2 ${selectedDay===d?'bg-slate-900 text-emerald-400 border-slate-900 scale-105':'bg-white border-slate-200 text-slate-400'}`}>
            {d}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {CATEGORIES.map(cat=>{
          const exercises = exercisesByCategory[cat];
          const isExpanded = expandedCategories[cat];
          if(exercises.length===0) return null;
          const isCoolDown = cat === 'COOL-DOWN';
          return(
            <div key={cat}>
              <button onClick={()=>toggleCategory(cat)} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-sm transition-all border-2 ${isCoolDown?'bg-gradient-to-r from-emerald-500 to-blue-500 text-white border-emerald-300 shadow-lg shadow-emerald-100':'bg-slate-900 text-emerald-400 hover:bg-slate-800 border-slate-800'}`}>
                <div className="flex items-center gap-2">
                  <span>{isExpanded?'\u25bc':'\u25b6'}</span>
                  <span className="uppercase">{isCoolDown?'Static Stretches':cat}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isCoolDown?'bg-white/25':'bg-emerald-500/20'}`}>{exercises.length}</span>
                </div>
              </button>
              {isExpanded&&(
                isCoolDown ? (
                  <div className="mt-2 ml-2 border-l-2 border-emerald-100 pl-4">
                    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-1 shadow-sm">
                      <div className="flex gap-2 py-2 mb-1 border-b border-slate-100">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black">Hold 30-60s</span>
                        <span className="bg-blue-100 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-black">Static</span>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black">10 mins</span>
                      </div>
                      {exercises.map(ex=><CoolDownStretchCard key={ex.id} exercise={ex} sessionFinished={sessionFinished}/>)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 mt-2 ml-2 border-l-2 border-slate-200 pl-4">
                    {exercises.map(ex=>(
                      <ExerciseRow key={ex.id} exercise={ex} db={db} appId={appId} identifier={identifier} allLogs={allLogs} sessionFinished={sessionFinished}/>
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

      <div className="pt-4 pb-20 space-y-4">
        <div className="flex gap-3">
          <button onClick={()=>{setSessionFinished(true);setShowSummary(true);}} className="flex-[2] bg-emerald-500 text-slate-900 font-black py-6 rounded-[2rem] shadow-2xl text-lg border-b-[8px] border-emerald-800 active:border-b-0 active:scale-95 transition-all uppercase flex items-center justify-center gap-2">
            \u2705 Finish Session
          </button>
          <button onClick={()=>window.open('https://wa.me/201500807824','_blank')} className="flex-1 bg-slate-800 text-emerald-400 font-black py-6 rounded-[2rem] shadow-xl text-sm flex flex-col items-center justify-center gap-1 transition-all active:scale-95">
            <span className="text-2xl">💬</span>
            <span className="text-[9px] uppercase">WhatsApp</span>
          </button>
        </div>
        <div className="relative bg-white border-2 border-slate-200 rounded-[2.5rem] shadow-lg overflow-hidden">
          <textarea placeholder="Message Coach..." rows={3} className="w-full p-5 text-sm font-bold outline-none bg-transparent text-left resize-none text-slate-900" value={note} onChange={e=>setNote(e.target.value)}/>
          <button onClick={async()=>{
            if(!note) return;
            await addDoc(collection(db,'artifacts',appId,'public','data','user_notes'),{clientName:identifier,note,timestamp:serverTimestamp()});
            setNote('');alert('Sent \u2705');
          }} className="absolute bottom-4 left-4 bg-slate-900 text-emerald-400 px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-xl">Send</button>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutApp() {
  const [user, setUser]             = useState(null);
  const [authStep, setAuthStep]     = useState(localStorage.getItem('gofit_user')?'authenticated':'login');
  const [identifier, setIdentifier] = useState(localStorage.getItem('gofit_user')||'');
  const [role, setRole]             = useState(localStorage.getItem('gofit_role')||'client');
  const [workouts, setWorkouts]     = useState([]);
  const [allLogs, setAllLogs]       = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [clientRegistry, setClientRegistry] = useState({});

  useEffect(()=>{
    signInAnonymously(auth).catch(console.error);
    const u=onAuthStateChanged(auth,au=>{setUser(au);setIsLoading(false);});
    return()=>u();
  },[]);

  useEffect(()=>{
    if(!user||authStep!=='authenticated') return;
    const u1=onSnapshot(collection(db,'artifacts',APP_ID,'public','data','client_names'),s=>{
      const m={};s.forEach(d=>{m[d.id]=d.data();});setClientRegistry(m);
    });
    const u2=onSnapshot(query(collection(db,'artifacts',APP_ID,'public','data','workouts'),orderBy('orderIndex','asc')),s=>
      setWorkouts(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate()-20);
    const u3=onSnapshot(
      query(collection(db,'artifacts',APP_ID,'public','data','logs'),where('completedAt','>=',Timestamp.fromDate(twentyDaysAgo)),orderBy('completedAt','desc')),
      s=>setAllLogs(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    return()=>{u1();u2();u3();};
  },[user,authStep]);

  const clientName=clientRegistry[identifier]?.name||identifier;
  const doLogin=()=>{
    if(!identifier.trim()) return;
    const r=identifier.toLowerCase()===TRAINER_MAIL.toLowerCase()?'trainer':'client';
    localStorage.setItem('gofit_user',identifier);localStorage.setItem('gofit_role',r);setRole(r);setAuthStep('authenticated');
  };

  if(isLoading) return(
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <p className="text-emerald-500 font-black text-3xl uppercase ">GoFit Pro</p>
        <p className="text-emerald-600 font-black text-sm mt-1 animate-pulse">Loading...</p>
      </div>
    </div>
  );

  if(authStep==='login') return(
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-black">
      <div className="w-full max-w-[320px] rounded-[2.5rem] shadow-2xl overflow-hidden border-[5px] border-slate-800 bg-white">
        <div className="bg-slate-900 py-8 px-6 text-center">
          <span className="text-emerald-400 font-black text-4xl tracking-tight">GoFit Pro</span>
        </div>
        <div className="p-8 space-y-10">
          <input type="text" placeholder="Enter ID" value={identifier} onChange={e=>setIdentifier(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()}
            className="w-full p-4 border-2 rounded-2xl text-center font-black text-xl outline-none focus:border-emerald-500 transition-all bg-slate-50 border-slate-200 text-slate-900"/>
          <button onClick={doLogin} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all border-b-4 border-slate-800 active:border-b-0">Login</button>
        </div>
      </div>
    </div>
  );

  return(
<div className={`min-h-screen font-black text-slate-900 ${role==='trainer'?'bg-slate-50':'bg-[#1E293B]'}`}>
<nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900 px-5 py-3 shadow-2xl border-b-4 border-emerald-500/20">       
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
      <main className="max-w-5xl mx-auto p-0 pt-12">
        {role==='trainer'
          ?<TrainerDashboard workouts={workouts} logs={allLogs} db={db} appId={APP_ID} clientNames={clientRegistry}/>
          :<AppRouter />
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
