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
import { db, auth, APP_ID, TRAINER_MAIL, CATEGORIES, MUSCLE_GROUPS, EQUIPMENT_TYPES } from './services/firebase/config';
import { migrateMuscleAndEquipment } from './scripts/migrateMuscleEquipment';
import { deleteLogsByDate, deleteLogsByExerciseAndDate } from './services/firebase/logs';
import { titleCase, formatName, getMuscleGroup, getExerciseMuscle, getExerciseEquipment, dateFromLog, startOfDay } from './utils/formatters';
import { buildExpandedTemplateItems } from './utils/helpers';
import { makeDefaultAlternatives, normalizeAlternatives, getFilledAlternatives, applySuggestedAlternatives, getAlternativeOptions, suggestAlternatives } from './utils/validators';
import { getClientMetrics } from './engines/nasm';
import { buildWeeklyCoachReport } from './utils/analyticsTransformers';
import { useBackButton } from './hooks/useBackButton';
import InstallPrompt from './components/shared/InstallPrompt';
import { GifPopup } from './components/ui/GifPopup';
import { SearchableDropdown } from './components/ui/SearchableDropdown';
import { LinkifiedText } from './components/shared/LinkifiedText';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { ClientSelector, AddNewClientModal } from './features/ClientSelector';
import { ClientProfileViewModal } from './features/ClientProfileModal';
import { EditExerciseModal, AddExerciseModal } from './features/ExerciseLibrary';
import { ExerciseEditRow } from './features/DayBuilder';
import { AddProgramBuilder } from './features/AddProgramBuilder';
import { ClientAnalyticsDashboard } from './features/ClientAnalyticsDashboard';
import { ExerciseRow, CoolDownStretchCard } from './features/ExerciseRow';
import WeeklySidebar from './features/WeeklySidebar'
import { useWeeklyPlan } from './hooks/useWeeklyPlan'

function TrainerDashboard({ workouts, logs, checkIns, notes, db, appId, clientNames }) {
  const [activeTab, setActiveTab]             = useState('overview');
  const [targetClient, setTargetClient]       = useState('');
  const [sessionName, setSessionName]         = useState('');
  const [newEx, setNewEx]                     = useState({name:'',category:'RESISTANCE',muscleGroup:'Other',sets:'3',reps:'10',tempo:'',coachNote:'',alternatives:makeDefaultAlternatives()});
  const [libraryData, setLibraryData]         = useState([]);
  const [expandedDate, setExpandedDate]       = useState(null);
  const [analyticsClient, setAnalyticsClient] = useState('');
  const [selectedProfileModal, setSelectedProfileModal] = useState(null);
  const [showAddClient, setShowAddClient]     = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [menuOpen, setMenuOpen]               = useState(false);
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
  const [openLibraryGroup, setOpenLibraryGroup] = useState(null);
  const [notesFilter, setNotesFilter]         = useState('unread'); // 'unread' | 'all'
  const [clientGoals, setClientGoals]         = useState([]);
  const [goalForm, setGoalForm] = useState({ type: 'exercise_weight', label: '', exerciseName: '', targetValue: '', unit: 'kg' });
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

  // Load goals for selected analytics client
  useEffect(()=>{
    if(!analyticsClient){ setClientGoals([]); return; }
    const u = onSnapshot(
      query(collection(db,'artifacts',appId,'public','data','goals'), where('clientName','==',analyticsClient), orderBy('createdAt','desc')),
      s=>setClientGoals(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    return()=>u();
  },[db,appId,analyticsClient]);

  async function handleAddGoal(){
    if(!analyticsClient || !goalForm.label.trim() || !goalForm.targetValue) return;
    if(goalForm.type==='exercise_weight' && !goalForm.exerciseName.trim()) return;
    try{
      await addDoc(collection(db,'artifacts',appId,'public','data','goals'),{
        clientName:   analyticsClient,
        type:         goalForm.type,
        label:        goalForm.label.trim(),
        exerciseName: goalForm.type==='exercise_weight' ? goalForm.exerciseName.trim() : null,
        targetValue:  Number(goalForm.targetValue),
        currentValue: goalForm.type==='custom' ? 0 : null,
        unit:         goalForm.unit.trim() || 'kg',
        createdAt:    serverTimestamp(),
      });
      setGoalForm({ type:'exercise_weight', label:'', exerciseName:'', targetValue:'', unit:'kg' });
    }catch(e){ console.error('add goal failed:',e); }
  }

  async function handleDeleteGoal(id){
    try{ await deleteDoc(doc(db,'artifacts',appId,'public','data','goals',id)); }
    catch(e){ console.error('delete goal failed:',e); }
  }

  async function handleUpdateGoalValue(id,newVal){
    try{ await updateDoc(doc(db,'artifacts',appId,'public','data','goals',id),{ currentValue: Number(newVal) }); }
    catch(e){ console.error('update goal failed:',e); }
  }

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
      topMuscle:Object.entries(topMuscles).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-',
      atRisk: rows.filter(m=>m.daysSinceLast>=7 || m.adherence<50).length,
    };
  },[clientNames, workouts, logs]);

  const weeklyReport = useMemo(()=>{
    const clients = Object.entries(clientNames).map(([id, info]) => ({ id, ...info }));
    return buildWeeklyCoachReport({ workouts, logs, checkIns, clients });
  },[clientNames, workouts, logs, checkIns]);

  const reminderCards = useMemo(() => {
    return clientRows
      .filter(row => row.metrics.daysSinceLast >= 5 || row.metrics.adherence < 45)
      .slice(0, 5)
      .map(row => {
        const readiness = checkIns.find(ci => ci.clientName === row.phone)?.readiness ?? null;
        return {
          name: row.client.name || row.phone,
          daysSinceLast: row.metrics.daysSinceLast,
          adherence: row.metrics.adherence,
          readiness,
          reason:
            row.metrics.daysSinceLast >= 7 ? 'No session this week' :
            row.metrics.adherence < 45 ? 'Low adherence' :
            'Needs follow-up',
        };
      });
  }, [clientRows, checkIns]);

  // Unified attention list — merges injury notes + adherence/inactivity reminders (Overview redesign)
  const attentionItems = useMemo(() => {
    const injuryItems = Object.values(clientNames)
      .filter(c => String(c.injuries || '').trim())
      .map(c => ({
        key: `injury-${c.phone || c.name}`,
        name: c.name || 'Client',
        severity: 'injury',
        icon: '🔴',
        detail: c.injuries,
      }));
    const reminderItems = reminderCards.map(r => ({
      key: `reminder-${r.name}`,
      name: r.name,
      severity: r.reason === 'No session this week' ? 'inactive' : r.reason === 'Low adherence' ? 'adherence' : 'followup',
      icon: r.reason === 'No session this week' ? '🟠' : r.reason === 'Low adherence' ? '🟠' : '🟡',
      detail: `${r.reason} · ${r.daysSinceLast===999?'—':`${r.daysSinceLast}d`} since last`,
    }));
    const order = { injury: 0, inactive: 1, adherence: 1, followup: 2 };
    return [...injuryItems, ...reminderItems]
      .sort((a, b) => order[a.severity] - order[b.severity])
      .slice(0, 6);
  }, [clientNames, reminderCards]);

  // Phase distribution across clients (Overview widget)
  const phaseDistribution = useMemo(() => {
    const counts = {1:0,2:0,3:0,4:0,5:0};
    Object.values(clientNames).forEach(c => {
      const p = c.nasm_phase || 1;
      counts[p] = (counts[p]||0)+1;
    });
    return counts;
  }, [clientNames]);

  // Clients with zero assigned workouts (Overview widget)
  const needsPlanClients = useMemo(() => {
    return Object.entries(clientNames)
      .filter(([phone]) => !workouts.some(w => w.assignedTo === phone))
      .map(([phone, c]) => ({ phone, name: c.name || phone }));
  }, [clientNames, workouts]);

  // Library totals independent of librarySearch filter (Overview widget)
  const librarySnapshot = useMemo(() => {
    const byCategory = {};
    libraryData.forEach(ex => {
      const cat = ex.category || 'RESISTANCE';
      byCategory[cat] = (byCategory[cat]||0)+1;
    });
    const topCategory = Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
    return { total: libraryData.length, topCategory };
  }, [libraryData]);

  const libraryGroups = useMemo(()=>{
    const q = librarySearch.toLowerCase().trim();
    const filtered = libraryData.filter(ex => !q || ex.name?.toLowerCase().includes(q) || getExerciseMuscle(ex).toLowerCase().includes(q) || getExerciseEquipment(ex).toLowerCase().includes(q) || ex.category?.toLowerCase().includes(q));
    const groups = libraryGroupBy === 'muscle' ? MUSCLE_GROUPS : libraryGroupBy === 'equipment' ? EQUIPMENT_TYPES : CATEGORIES;
    return groups.map(group => ({
      group,
      exercises: filtered.filter(ex => libraryGroupBy === 'muscle' ? getExerciseMuscle(ex) === group : libraryGroupBy === 'equipment' ? getExerciseEquipment(ex) === group : ex.category === group).sort((a,b) => a.name.localeCompare(b.name))
    })).filter(item => item.exercises.length > 0);
  }, [libraryData, libraryGroupBy, librarySearch]);

  const libraryStats = useMemo(() => {
    const filtered = libraryData.filter(ex => {
      const q = librarySearch.toLowerCase().trim();
      return !q || ex.name?.toLowerCase().includes(q) || getExerciseMuscle(ex).toLowerCase().includes(q) || getExerciseEquipment(ex).toLowerCase().includes(q) || ex.category?.toLowerCase().includes(q);
    });
    const byCategory = {};
    const byMuscle = {};
    filtered.forEach(ex => {
      const cat = ex.category || 'RESISTANCE';
      const mus = getExerciseMuscle(ex);
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      byMuscle[mus] = (byMuscle[mus] || 0) + 1;
    });
    const topMuscle = Object.entries(byMuscle).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
    const topCategory = Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
    return {
      filteredCount: filtered.length,
      topMuscle,
      topCategory,
      categories: byCategory,
    };
  }, [libraryData, librarySearch]);

  // ملاحظات العملاء (Send Note) — غير مقروءة أولاً، الأحدث أولاً
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a,b) => {
      if (!!a.read !== !!b.read) return a.read ? 1 : -1;
      return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0);
    });
  }, [notes]);
  const unreadNotesCount = useMemo(() => notes.filter(n => !n.read).length, [notes]);
  const visibleNotes = useMemo(() => notesFilter === 'unread' ? sortedNotes.filter(n => !n.read) : sortedNotes, [sortedNotes, notesFilter]);

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
    {id:'addProgram', label:'Add Program'},
    {id:'analytics', label:'Analytics'},
    {id:'notes', label:'Notes', badge: unreadNotesCount},
  ];

  return(
    <div className="font-black pb-20">
      {/* Mobile Menu */}
      <div className="md:hidden flex gap-2 items-center pb-2">
        <button onClick={()=>setMenuOpen(!menuOpen)} className="relative bg-slate-900 text-emerald-400 px-4 py-4 rounded-2xl font-black text-sm">
          {tabButtons.find(t=>t.id===activeTab)?.label || 'Menu'}
          {unreadNotesCount>0 && activeTab!=='notes' && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{unreadNotesCount}</span>
          )}
        </button>
        {menuOpen && (
          <div className="absolute top-20 left-4 right-4 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-50">
            {tabButtons.map(tab=>(
              <button key={tab.id} onClick={()=>{setActiveTab(tab.id);setMenuOpen(false);}} className="w-full flex items-center justify-between text-left px-6 py-3 font-black text-sm border-b border-slate-100 last:border-0 hover:bg-emerald-50">
                <span>{tab.label}</span>
                {!!tab.badge && <span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{tab.badge}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="md:flex md:gap-6 md:items-start">
        {/* Tabs - Desktop Sidebar */}
        <div className="hidden md:flex md:flex-col gap-2 w-48 shrink-0 sticky top-4">
          {tabButtons.map(tab=>(
            <button key={tab.id} onClick={()=>{setActiveTab(tab.id);setMenuOpen(false);}} className={`relative px-5 py-3 rounded-2xl text-sm font-black uppercase text-left transition-all ${activeTab===tab.id?'bg-slate-900 text-emerald-400 scale-105':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {tab.label}
              {!!tab.badge && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0 space-y-5">
      {/* OVERVIEW */}
      {activeTab==='overview'&&(
        <div className="space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4">
            {[
              { v: Object.keys(clientNames).length, l: 'Clients',     accent: 'border-l-blue-500',    tone: 'text-blue-600' },
              { v: `${dashboardStats.adherence}%`,   l: 'Adherence',   accent: 'border-l-emerald-500', tone: 'text-emerald-600' },
              { v: dashboardStats.atRisk,            l: 'At Risk',     accent: 'border-l-red-500',     tone: 'text-red-600' },
              { v: logs.filter(l=>l.isPR).length,    l: 'PRs',         accent: 'border-l-amber-500',    tone: 'text-amber-600' },
            ].map((s, i) => (
              <div key={i} className={`${bg} border-2 ${s.accent} border-l-[6px] p-4 rounded-[1.75rem] shadow-lg`}>
                <p className="text-[10px] font-black text-slate-400 uppercase">{s.l}</p>
                <p className={`text-2xl font-black mt-1 ${s.tone} text-center`}>{s.v}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] font-black text-slate-400 uppercase">
            <span>{weeklyReport.activeClients} active this week</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"/>
            <span>{weeklyReport.checkInCount} check-ins</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"/>
            <span>Top muscle: <span className="text-emerald-500">{dashboardStats.topMuscle}</span></span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5">
            <div className={`${bg} border-3 p-6 rounded-[2.5rem] shadow-xl min-w-0`}>
              <div className="flex items-center justify-between gap-3 border-b pb-3 mb-3 border-slate-200">
                <h3 className={`font-black text-base ${tx}`}>Active Clients</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase">{Object.keys(clientNames).length} total</span>
              </div>
              <div className="space-y-2">
                {clientRows.slice(0,8).map(({phone,client,metrics})=>{
                  const clientPhase = client.nasm_phase || 1;
                  return(
                    <button key={phone} onClick={()=>setSelectedProfileModal({...client,phone})} className="w-full flex items-center gap-3 text-left p-3 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-emerald-300 transition-all hover:shadow-lg">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0" style={{backgroundColor: PHASE_COLORS[clientPhase]}}>{clientPhase}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-black text-sm ${tx} truncate`}>{titleCase(client.name)}</p>
                          <span className={`text-[9px] uppercase font-black ${sub} shrink-0`}>{metrics.daysSinceLast===0?'Today':metrics.daysSinceLast===999?'Never':`${metrics.daysSinceLast}d ago`}</span>
                        </div>
                        <p className={`text-[11px] ${sub} truncate`}>{client.phone}</p>
                        <div className="h-1.5 rounded-full w-full bg-slate-100 mt-1.5">
                          <div className="h-full rounded-full transition-all" style={{width:`${metrics.adherence}%`, backgroundColor: PHASE_COLORS[clientPhase]}}/>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black ${sub} shrink-0`}>{metrics.adherence}%</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={()=>setShowAddClient(true)} className="w-full mt-3 bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-md active:scale-95 transition-all">+ Add New Client</button>
            </div>

            <div className={`${bg} border-3 p-5 rounded-[2.5rem] shadow-xl space-y-3 min-w-0`}>
              <h3 className={`font-black text-base border-b pb-3 ${tx} border-slate-200`}>Attention Required</h3>
              {attentionItems.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {attentionItems.map(item => (
                    <div key={item.key} className={`rounded-2xl border px-3 py-2.5 flex items-start gap-2.5 ${item.severity==='injury'?'bg-red-50 border-red-100':'bg-amber-50 border-amber-100'}`}>
                      <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-slate-900 truncate">{titleCase(item.name)}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase truncate">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] font-black text-slate-400 text-center py-6">All clients on track 🎉</p>
              )}

              <h3 className={`font-black text-base border-b pb-3 pt-2 ${tx} border-slate-200`}>Latest Check-ins</h3>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {checkIns.slice(0, 4).map(ci => {
                  const client = clientNames[ci.clientName] || {};
                  return (
                    <div key={ci.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 border border-slate-100">
                      <div className="min-w-0">
                        <p className="font-black text-xs text-slate-900 truncate">{titleCase(client.name || ci.clientName)}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Sleep {ci.sleep}/10 - Energy {ci.energy}/10</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${Number(ci.readiness) >= 70 ? 'bg-emerald-100 text-emerald-700' : Number(ci.readiness) >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {ci.readiness || 0}/100
                      </span>
                    </div>
                  );
                })}
                {checkIns.length === 0 && (
                  <p className="text-[11px] font-black text-slate-400 text-center py-4">No check-ins yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`${bg} border-2 p-4 rounded-[1.75rem] shadow-lg`}>
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">Phase Distribution</h4>
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map(p => (
                  <div key={p} className="flex-1 text-center rounded-xl py-2" style={{backgroundColor: `${PHASE_COLORS[p]}1A`}}>
                    <p className="text-sm font-black" style={{color: PHASE_COLORS[p]}}>{phaseDistribution[p]||0}</p>
                    <p className="text-[8px] font-black text-slate-400">P{p}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${bg} border-2 p-4 rounded-[1.75rem] shadow-lg`}>
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">Library Snapshot</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-slate-900">{librarySnapshot.total}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Exercises</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-500 truncate max-w-[90px]">{librarySnapshot.topCategory}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Top Category</p>
                </div>
              </div>
            </div>

            <div className={`${bg} border-2 p-4 rounded-[1.75rem] shadow-lg`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase">Needs a Plan</h4>
                <span className="text-sm font-black text-amber-500">{needsPlanClients.length}</span>
              </div>
              {needsPlanClients.length>0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {needsPlanClients.slice(0,4).map(c=>(
                    <button key={c.phone} onClick={()=>{setTargetClient(c.phone);setActiveTab('plan');}} className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-500 hover:text-white transition-all truncate max-w-[100px]">
                      {titleCase(c.name)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-black text-slate-400">All clients have plans 🎉</p>
              )}
            </div>
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
                <div key={phone} className="p-4 rounded-2xl bg-slate-50 border-2 border-l-[6px] border-slate-100 hover:border-emerald-300 transition-all" style={{borderLeftColor: PHASE_COLORS[clientPhase]}}>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
                    <div className="flex items-center gap-3 md:contents">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0" style={{backgroundColor: PHASE_COLORS[clientPhase]}}>{clientPhase}</div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-black text-sm text-slate-900">{titleCase(client.name)}</p>
                        <p className="text-xs text-slate-500 truncate">{client.goal || 'No goal'} - {client.level || NASM_OPT_PHASES[clientPhase]?.phase}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full md:flex-1">
                      <div className="text-center bg-white rounded-xl p-2 border border-slate-100">
                        <p className="text-sm font-black text-emerald-500">{metrics.adherence}%</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Adherence</p>
                      </div>
                      <div className="text-center bg-white rounded-xl p-2 border border-slate-100">
                        <p className="text-sm font-black text-emerald-500">{metrics.completed}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Done</p>
                      </div>
                      <div className="text-center bg-white rounded-xl p-2 border border-slate-100">
                        <p className="text-sm font-black text-emerald-500">{metrics.daysSinceLast===999?'-':`${metrics.daysSinceLast}d`}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Last</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:flex md:justify-end gap-2 w-full md:w-auto">
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
        <ClientProfileViewModal client={selectedProfileModal} logs={logs} workouts={workouts} checkIns={checkIns} onClose={()=>setSelectedProfileModal(null)} db={db} appId={appId} onToPlan={()=>{setSelectedProfileModal(null);setTargetClient(selectedProfileModal.phone);setActiveTab('plan');}}/>
      )}

      {/* LIBRARY */}
      {activeTab==='library'&&(
        <div className="grid grid-cols-1 gap-4 px-4">
          <aside className={`${bg} border-2 p-5 rounded-[2.5rem] shadow-xl h-fit space-y-4`}>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Catalog</p>
              <h3 className={`font-black text-2xl ${tx}`}>Exercise Library</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">Search across the exercise catalog and collapse sections by muscle or type.</p>
            </div>
            <div className="space-y-3">
              <input value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)} placeholder="Search exercises..." className={`w-full p-4 border-2 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 ${inp}`}/>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={()=>setLibraryGroupBy('muscle')} className={`px-3 py-3 rounded-2xl text-[11px] font-black uppercase transition-all border ${libraryGroupBy==='muscle'?'bg-slate-900 text-emerald-400 border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>By Muscle</button>
                <button onClick={()=>setLibraryGroupBy('equipment')} className={`px-3 py-3 rounded-2xl text-[11px] font-black uppercase transition-all border ${libraryGroupBy==='equipment'?'bg-slate-900 text-emerald-400 border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>By Equipment</button>
                <button onClick={()=>setLibraryGroupBy('type')} className={`px-3 py-3 rounded-2xl text-[11px] font-black uppercase transition-all border ${libraryGroupBy==='type'?'bg-slate-900 text-emerald-400 border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>By Type</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-blue-50 border-2 border-l-blue-500 border-l-[6px] p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase">Exercises</p>
                <p className="text-2xl font-black text-blue-600 mt-1">{libraryStats.filteredCount}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 border-2 border-l-emerald-500 border-l-[6px] p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase">Top Muscle</p>
                <p className="text-sm font-black text-emerald-600 mt-1 truncate">{libraryStats.topMuscle}</p>
              </div>
            </div>
            <button onClick={()=>setShowAddExercise(true)} className="w-full bg-slate-900 text-emerald-400 px-4 py-3 rounded-2xl font-black text-xs uppercase shadow-xl">+ Add Exercise</button>
            <button onClick={async()=>{
              if(!window.confirm('Run one-time muscle/equipment migration on library + workouts?')) return;
              try{
                const res = await migrateMuscleAndEquipment();
                alert(`Migration done. Library: ${res.libraryCount}, Workouts: ${res.workoutsCount}`);
              }catch(e){console.error(e);alert('Migration failed: '+e.message);}
            }} className="w-full bg-blue-50 text-blue-600 border-2 border-blue-100 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-500 hover:text-white transition-all">⚙️ Run Muscle/Equipment Migration</button>
          </aside>

          <section className={`${bg} border-2 p-5 rounded-[2.5rem] shadow-xl min-h-[70vh]`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h4 className={`font-black text-base ${tx}`}>Catalog Sections</h4>
                <p className="text-[px] font-black text-slate-400 uppercase">Expand what you need and keep the rest folded</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500"/>Live
              </div>
            </div>

            {libraryData.length===0?(
              <div className="text-center py-20 text-slate-400 font-black">
                <p className="mb-4 text-3xl">📚</p>
                <p>Library is empty</p>
                <p className="text-sm mt-2">Add your first exercise to get started</p>
              </div>
            ):(
              <div className="space-y-3">
                {libraryGroups.length===0&&<p className="text-center py-8 text-slate-400 font-black text-sm">No exercises match your search</p>}
                {libraryGroups.map(({group, exercises})=>{
                  const isOpen = openLibraryGroup === group;
                  return (
                    <div key={group} className="rounded-[1.5rem] border border-slate-200 overflow-hidden bg-white shadow-sm">
                      <button onClick={()=>setOpenLibraryGroup(isOpen ? null : group)} className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-all">
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase text-slate-400">Section</p>
                          <h5 className="font-black text-lg text-slate-900 uppercase">{group}</h5>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-emerald-500/10 text-emerald-700 px-2.5 py-1 rounded-full font-black">{exercises.length}</span>
                          <span className="text-slate-400 font-black">{isOpen ? '-' : '-'}</span>
                        </div>
                      </button>
                      {isOpen&&(
                        <div className="p-2 bg-slate-50 border-t border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {exercises.map(ex=>(
                              <div key={ex.id} className="rounded-[1.25rem] bg-white border border-slate-100 p-4 shadow-sm hover:border-emerald-300 transition-all group">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-black text-slate-900 truncate">{formatName(ex.name)}</p>
                                      {ex.gifUrl&&<span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">GIF</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase">{getExerciseMuscle(ex)} · {getExerciseEquipment(ex)} · {ex.category || 'RESISTANCE'}</p>
                                    <div className="flex flex-wrap gap-1 mt-3">
                                      {ex.sets&&<span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600">{ex.sets} sets</span>}
                                      {ex.reps&&<span className="text-[10px] font-black px-3 py-1 rounded-full bg-slate-100 text-slate-600">{ex.reps} reps</span>}
                                      {ex.tempo&&<span className="text-[10px] font-black px-3 py-1 rounded-full bg-slate-100 text-slate-600">{ex.tempo}</span>}
                                    </div>
                                    {ex.description&&<p className="text-xs text-slate-500 mt-3 leading-relaxed">{ex.description}</p>}
                                    <div className="flex gap-2 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                      <button onClick={()=>setEditingExercise(ex)} className="text-blue-400 font-black text-[10px] bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-500 hover:text-white transition-all">Edit</button>
                                      <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','library',ex.id))} className="text-red-400 font-black text-[10px] bg-red-50 px-3 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all">Del</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
      {/* PLAN */}
      {activeTab==='plan'&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Assign Form */}
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl space-y-3`}>
            <h4 className={`font-black text-base border-b pb-3 ${tx} border-slate-200`}>Assign Session</h4>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={addWeek} disabled={!targetClient} className="bg-white border-2 border-slate-200 text-slate-700 px-3 py-2 rounded-2xl font-black text-xs uppercase disabled:opacity-40">+ New Week</button>
              <button onClick={()=>addNextDay(selectedWeek)} disabled={!selectedWeek} className="bg-white border-2 border-slate-200 text-slate-700 px-3 py-2 rounded-2xl font-black text-xs uppercase disabled:opacity-40">+ New Day</button>
            </div>
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
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Current Scope</p>
              <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-700">
                <span className="truncate">{selectedWeek || 'No week selected'}</span>
                <span className="truncate">{sessionName || 'No day selected'}</span>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-violet-100 bg-violet-50 p-4 space-y-3">
              <div className="flex justify-between items-center gap-2">
                <h4 className="font-black text-sm text-slate-900">Workout Templates</h4>
                <button onClick={applyTemplate} className="bg-violet-500 text-white px-2 py-1 rounded-xl text-sm font-black">Apply</button>
              </div>
              <select value={templateName} onChange={e=>setTemplateName(e.target.value)} className="w-full p-2 bg-white border-2 border-violet-100 rounded-xl font-black text-sm outline-none focus:border-violet-500">
                {Object.keys(WORKOUT_TEMPLATES).map(name=><option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 space-y-3">
              <div className="flex justify-between items-center gap-2">
                <h4 className="font-black text-sm text-slate-900">Copy Program</h4>
                <button onClick={copyProgram} className="bg-amber-500 text-white px-2 py-1 rounded-xl text-sm font-black">Copy</button>
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
                const nextEx = {...newEx, category:e.target.value, muscleGroup:e.target.value==='CARDIO'&&!MUSCLE_GROUPS.includes(newEx.muscleGroup)?'Other':newEx.muscleGroup};
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
                      alternatives[i] = {...alternatives[i], name:e.target.value, reason:selected?.reason||alternatives[i].reason, gifUrl:selected?.gifUrl||'', videoUrl:selected?.videoUrl||''};
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
                videoUrl:libEx?.videoUrl||'',
                assignedTo:targetClient,
                week:selectedWeek,
                day:sessionName,
                orderIndex:Date.now()
              });
              setNewEx({name:'',category:'RESISTANCE',muscleGroup:'Other',sets:'3',reps:'10',tempo:'',coachNote:'',alternatives:makeDefaultAlternatives()});
              alert('Assigned \u2705');
            }} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">Assign Workout +</button>
            <button onClick={()=>setNewEx({name:'',category:'RESISTANCE',muscleGroup:'Other',sets:'3',reps:'10',tempo:'',coachNote:'**NEW**',alternatives:makeDefaultAlternatives()})} className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all">- New Exercise</button>
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
                          <span>{expandedWeeks[week.id] ? '-' : '+'}</span>
                          <span>{week.title}</span>
                          <span className="text-[10px] text-emerald-300/60">({week.days.length} days)</span>
                        </button>
                        <button onClick={()=>addNextDay(week.id)} className="w-6 h-6 rounded-lg bg-emerald-500 text-white font-black text-xs hover:bg-emerald-400 transition-all" title={`Add day to ${week.title}`}>+</button>
                      </div>
                      {expandedWeeks[week.id]&&(
                        <div className="p-2 space-y-1 bg-slate-50">
                          {week.days.length===0 ? (
                            <p className="text-[10px] font-black text-slate-400 text-center py-2">No days yet - click + to add</p>
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
                            <button onClick={e=>{e.stopPropagation();if(!window.confirm(`Delete ${entries.length} log(s) only for ${titleCase(clientNames[analyticsClient]?.name||analyticsClient)} on ${date}?`))return;deleteLogsByDate(new Date(date),db,appId,analyticsClient).then(c=>alert(`Deleted ${c} log(s) for ${titleCase(clientNames[analyticsClient]?.name||analyticsClient)} on ${date}`)).catch(err=>alert(err.message));}} className="bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-lg text-[10px] font-black hover:bg-red-500 hover:text-white transition-all">Delete day</button>
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
                                {e.isPR&&<span className="text-xs">-</span>}
                              </div>
                            </div>
                                <button onClick={ev=>{ev.stopPropagation();if(!window.confirm(`Delete ${formatName(e.exerciseName)} only for ${titleCase(clientNames[analyticsClient]?.name||analyticsClient)} on ${date}?`))return;deleteLogsByExerciseAndDate(e.exerciseName,new Date(date),db,appId,analyticsClient).then(c=>alert(`Deleted ${c} log(s) for ${formatName(e.exerciseName)} on ${date}`)).catch(err=>alert(err.message));}} className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700">Delete</button>
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

      {/* ADD PROGRAM */}
      {activeTab==='addProgram'&&(
        <AddProgramBuilder workouts={workouts} db={db} appId={appId} clientNames={clientNames} libraryData={libraryData}/>
      )}

      {/* ANALYTICS */}
      {activeTab==='analytics'&&(
        <div className="space-y-5">
          <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
            <h3 className={`font-black text-base border-b pb-3 mb-3 ${tx} border-slate-200`}>Select Client for Analysis</h3>
            <ClientSelector clientNames={clientNames} value={analyticsClient} onChange={setAnalyticsClient} placeholder="Select Client..."/>
          </div>
          {analyticsClient&&(
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { v: clientNames[analyticsClient]?.name || titleCase(analyticsClient), l: 'Selected Client' },
                { v: weeklyReport.activeClients, l: 'Active Clients' },
                { v: weeklyReport.checkInCount, l: 'Check-ins' },
                { v: logs.filter(l=>l.clientName===analyticsClient).length, l: 'Log Entries' },
              ].map((s, i) => (
                <div key={i} className={`${bg} border-2 p-4 rounded-[1.75rem] shadow-lg`}>
                  <p className="text-[10px] font-black text-slate-400 uppercase">{s.l}</p>
                  <p className={`text-lg font-black ${tx} mt-1 truncate`}>{s.v}</p>
                </div>
              ))}
            </div>
          )}

          {/* GOALS */}
          {analyticsClient&&(
            <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
              <h3 className={`font-black text-base border-b pb-3 mb-4 ${tx} border-slate-200`}>Goals</h3>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <select value={goalForm.type} onChange={e=>setGoalForm({...goalForm,type:e.target.value})} className={`${inp} border-2 rounded-xl px-3 py-2 text-sm font-bold ${tx}`}>
                  <option value="exercise_weight">Exercise Weight</option>
                  <option value="custom">Custom (manual)</option>
                </select>
                <input value={goalForm.label} onChange={e=>setGoalForm({...goalForm,label:e.target.value})} placeholder="Goal label" className={`${inp} border-2 rounded-xl px-3 py-2 text-sm font-bold ${tx}`}/>
                {goalForm.type==='exercise_weight' ? (
                  <input value={goalForm.exerciseName} onChange={e=>setGoalForm({...goalForm,exerciseName:e.target.value})} placeholder="Exercise name (exact)" className={`${inp} border-2 rounded-xl px-3 py-2 text-sm font-bold ${tx}`}/>
                ) : (
                  <input value={goalForm.unit} onChange={e=>setGoalForm({...goalForm,unit:e.target.value})} placeholder="Unit (kg, %, steps...)" className={`${inp} border-2 rounded-xl px-3 py-2 text-sm font-bold ${tx}`}/>
                )}
                <input type="number" value={goalForm.targetValue} onChange={e=>setGoalForm({...goalForm,targetValue:e.target.value})} placeholder="Target value" className={`${inp} border-2 rounded-xl px-3 py-2 text-sm font-bold ${tx}`}/>
              </div>
              <button onClick={handleAddGoal} className="w-full bg-emerald-500 text-white font-black text-sm py-2.5 rounded-xl mb-4">Add Goal</button>

              <div className="space-y-2">
                {clientGoals.length===0 && <p className={`text-sm font-bold ${sub} text-center py-4`}>No goals yet</p>}
                {clientGoals.map(g=>{
                  const current = g.type==='exercise_weight'
                    ? Math.max(0, ...logs.filter(l=>l.clientName===analyticsClient && l.exerciseName===g.exerciseName).map(l=>l.maxWeight||0))
                    : (g.currentValue||0);
                  const pct = g.targetValue ? Math.min(100, Math.round((current/g.targetValue)*100)) : 0;
                  return (
                    <div key={g.id} className={`${rowbg} border-2 rounded-2xl p-3`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className={`text-sm font-black ${tx}`}>{g.label}</p>
                        <button onClick={()=>handleDeleteGoal(g.id)} className="text-red-500 text-xs font-black">✕</button>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full ${pct>=100?'bg-emerald-500':'bg-blue-500'}`} style={{width:`${pct}%`}}/>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-[11px] font-bold ${sub}`}>{current}/{g.targetValue} {g.unit} ({pct}%)</p>
                        {g.type==='custom' && (
                          <input
                            type="number"
                            defaultValue={g.currentValue||0}
                            onBlur={e=>handleUpdateGoalValue(g.id,e.target.value)}
                            className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-right"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {analyticsClient&&(
            <ClientAnalyticsDashboard identifier={analyticsClient} clientInfo={clientNames[analyticsClient]} workouts={workouts} db={db} appId={appId}/>
          )}
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

      {/* NOTES */}
      {activeTab==='notes'&&(
        <div className={`${bg} border-2 p-6 rounded-[2.5rem] shadow-xl`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className={`font-black text-base ${tx}`}>Client Notes</h3>
              <p className="text-[12px] font-black text-slate-400 uppercase">{unreadNotesCount} unread · {notes.length} total</p>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setNotesFilter('unread')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${notesFilter==='unread'?'bg-slate-900 text-emerald-400':'bg-slate-100 text-slate-500'}`}>Unread</button>
              <button onClick={()=>setNotesFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${notesFilter==='all'?'bg-slate-900 text-emerald-400':'bg-slate-100 text-slate-500'}`}>All</button>
            </div>
          </div>
          {visibleNotes.length===0 ? (
            <p className={`text-xs font-black ${sub} text-center py-10`}>{notesFilter==='unread' ? 'No unread notes 🎉' : 'No notes yet'}</p>
          ) : (
            <div className="space-y-2">
              {visibleNotes.map(n=>{
                const clientLabel = titleCase(clientNames[n.clientName]?.name || n.clientName);
                const dateLabel = n.createdAt?.toDate?.().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) || '';
                return (
                  <div key={n.id} className={`rounded-2xl border-2 p-4 ${n.read?'bg-slate-50 border-slate-100':'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm text-slate-900">{clientLabel}</p>
                          {n.context&&<span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 uppercase">{n.context}</span>}
                          {!n.read&&<span className="w-2 h-2 rounded-full bg-emerald-500"/>}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{dateLabel}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {!n.read&&(
                          <button onClick={()=>updateDoc(doc(db,'artifacts',appId,'public','data','notes',n.id),{read:true})} className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase hover:bg-emerald-600 transition-all">Mark Read</button>
                        )}
                        <button onClick={()=>{if(window.confirm('Delete this note?')) deleteDoc(doc(db,'artifacts',appId,'public','data','notes',n.id));}} className="bg-red-50 text-red-500 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase hover:bg-red-500 hover:text-white transition-all">Delete</button>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{n.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAddClient&&<AddNewClientModal onClose={()=>setShowAddClient(false)} db={db} appId={appId}/>}
      {showAddExercise&&<AddExerciseModal onClose={()=>setShowAddExercise(false)} db={db} appId={appId}/>}
      {editingExercise&&<EditExerciseModal exercise={editingExercise} onClose={()=>setEditingExercise(null)} db={db} appId={appId} collectionName="library"/>}
        </div>
      </div>
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
                  <span>{isExpanded?'▼':'▶'}</span>
                  <span className="uppercase">{isCoolDown?'Static Stretches':cat==='HIIT'?'HIIT (Optional)':cat}</span>
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
            ✅ Finish Session
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
            setNote('');alert('Sent ✅');
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
  const [checkIns, setCheckIns]     = useState([]);
  const [notes, setNotes]           = useState([]);
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
    const u4=onSnapshot(
      query(collection(db,'artifacts',APP_ID,'public','data','check_ins'),orderBy('createdAt','desc')),
      s=>setCheckIns(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    // ملاحظات العملاء (Send Note) — لوحة المدرب فقط، يستخدمها تاب Notes
    const u5=onSnapshot(
      query(collection(db,'artifacts',APP_ID,'public','data','notes'),orderBy('createdAt','desc')),
      s=>setNotes(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    return()=>{u1();u2();u3();u4();u5();};
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
      <InstallPrompt />
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
<InstallPrompt />
<nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900 px-5 py-3 shadow-2xl border-b-4 border-emerald-500/20">       
<div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-7 bg-emerald-500 rounded-full shadow-[0_0_12px_#10b981]"/>
            <span className="text-emerald-400 font-black text-2xl tracking-tight">GoFit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-black text-xs uppercase hidden md:block max-w-[120px] truncate">{titleCase(clientName)}</span>
            <button onClick={()=>{localStorage.clear();window.location.reload();}} className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase">Logout</button>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-0 pt-16">
        {role==='trainer'
          ?<TrainerDashboard workouts={workouts} logs={allLogs} checkIns={checkIns} notes={notes} db={db} appId={APP_ID} clientNames={clientRegistry}/>
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
