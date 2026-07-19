import { useState, useEffect, useMemo } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID }          from '../services/firebase/config';
import { useClientData }       from '../hooks/useClientData';
import {
  buildUser, buildPlan, buildSessionPhases,
  buildMuscleProgress, buildWeeklyLoad, buildStreak, buildLevel, buildRecoveryMap,
} from '../utils/clientDataTransformers';

import HomeScreen           from '../screens/HomeScreen';
import PlanScreen           from '../screens/PlanScreen';
import ProfileScreen        from '../screens/ProfileScreen';
import ActiveWorkoutScreen  from '../screens/ActiveWorkoutScreen';
import WorkoutPreviewScreen from '../screens/WorkoutPreviewScreen';
import ProgressScreen       from '../screens/ProgressScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';

// آخر شاشة/باراميترز محفوظين محليًا — عشان الـ refresh يرجّع نفس مكان التمرين مش الـ Home
function loadSavedScreen() {
  try {
    const raw = sessionStorage.getItem('gofit_screen');
    if (!raw) return { screen: 'Home', params: {} };
    const p = JSON.parse(raw);
    return { screen: p.screen || 'Home', params: p.params || {} };
  } catch { return { screen: 'Home', params: {} }; }
}

export default function AppRouter() {
  const identifier = localStorage.getItem('gofit_user') || '';
  const [current, setCurrent] = useState(() => loadSavedScreen().screen);
  const [params,  setParams]  = useState(() => loadSavedScreen().params);

  // يحفظ كل تنقل عشان يفضل موجود بعد الـ refresh
  useEffect(() => {
    try { sessionStorage.setItem('gofit_screen', JSON.stringify({ screen: current, params })); } catch {}
  }, [current, params]);

  const { workouts, logs, sessions, clientInfo, library, checkIns, loading } = useClientData(identifier);

  /* ── transformed data ──────────────────────────────────────── */
  const user          = useMemo(() => buildUser(clientInfo, logs),        [clientInfo, logs]);
  const plan          = useMemo(() => buildPlan(workouts, sessions),      [workouts, sessions]);
  const muscleProgress= useMemo(() => buildMuscleProgress(logs),         [logs]);
  const weeklyLoad    = useMemo(() => buildWeeklyLoad(logs),              [logs]);
  const streak        = useMemo(() => buildStreak(sessions),              [sessions]);
  const level         = useMemo(() => buildLevel(sessions),                [sessions]);
  const recoveryMap   = useMemo(() => buildRecoveryMap(logs),               [logs]);

  // First non-completed day across all weeks → shown on Home
  const activeDay = useMemo(() => {
    for (const week of plan) {
      const day = week.days.find(d => d.isActive);
      if (day) return { day: day.title, type: day.type, weekId: week.week_id };
    }
    return null;
  }, [plan]);

  // Session phases built for the currently-selected day
  const sessionPhases = useMemo(() => {
    const day       = params.day    || activeDay?.day;
    const weekLabel = params.weekId || activeDay?.weekId || 'Week 1';
    if (!day || !workouts.length) return [];
    return buildSessionPhases(workouts, day, logs, identifier, library, weekLabel);
  }, [workouts, params.day, params.weekId, activeDay?.day, activeDay?.weekId, logs, identifier]);

  /* ── navigation (history-backed → mobile back-gesture goes to previous screen, not exit) ── */
  useEffect(() => {
    function handlePop(e) {
      const st = e.state;
      if (st?.goFitScreen) { setCurrent(st.goFitScreen); setParams(st.goFitParams || {}); }
      else if (!st)        { setCurrent('Home'); setParams({}); }
      // states without goFitScreen marker (e.g. GIF modal push) → ignored here
    }
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = (name, p = {}) => {
    if (name === current) { setParams(p); return; }
    window.history.pushState({ goFitScreen: name, goFitParams: p }, '');
    setCurrent(name); setParams(p);
  };
  const goBack = () => window.history.back();

  /* ── end workout → save session → go home ──────────────────── */
  async function handleEndWorkout(recap = {}) {
    const day    = params.day    || activeDay?.day;
    const weekId = params.weekId || activeDay?.weekId || 'Week 1';
    if (day && identifier) {
      try {
        await addDoc(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'sessions'),
          {
            clientName: identifier,
            day,
            week: weekId,
            completed: true,
            completedAt: serverTimestamp(),
            recap,
          }
        );
      } catch (e) { console.error('session save:', e); }
    }
    navigate('Home');
  }

  // reopen a completed day → delete its session doc(s)
  async function handleReopenDay(day, weekLabel) {
    const weekIdx = plan.findIndex(w => w.week_id === weekLabel) + 1;
    const matches = sessions.filter(s =>
      s.day === day &&
      (s.week === weekLabel || s.week === weekIdx) &&
      s.completed === true
    );
    try {
      await Promise.all(
        matches.map(s => deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'sessions', s.id)))
      );
    } catch (e) { console.error('reopen day failed:', e); }
  }

  /* ── loading screen ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-blue-400 font-black text-3xl">GoFit</p>
          <p className="text-slate-400 text-sm mt-2 animate-pulse">Loading your plan...</p>
        </div>
      </div>
    );
  }

  /* ── shared props ───────────────────────────────────────────── */
  const nav = { navigate, goBack, current };

  const views = {
    Home: (
      <HomeScreen
        {...nav}
        user={user}
        activeDay={activeDay}
        identifier={identifier}
        db={db}
        appId={APP_ID}
        checkIns={checkIns}
        streak={streak}
        level={level}
        logs={logs}
      />
    ),
    Plan: (
      <PlanScreen
        {...nav}
        plan={plan}
        workouts={workouts}
        user={user}
        identifier={identifier}
        onReopenDay={handleReopenDay}
        weeklyLoad={weeklyLoad}
      />
    ),
    Profile: (
      <ProfileScreen
        {...nav}
        user={user}
        identifier={identifier}
      />
    ),
    ActiveWorkout: (
      <ActiveWorkoutScreen
        {...nav}
        params={params}
        sessionPhases={sessionPhases}
        identifier={identifier}
        checkIns={checkIns}
        onEndWorkout={handleEndWorkout}
      />
    ),
    WorkoutPreview: (
      <WorkoutPreviewScreen
        {...nav}
        params={params}
        sessionPhases={sessionPhases}
      />
    ),
    Progress: (
      <ProgressScreen
        {...nav}
        initialTab={params.tab}
        user={user}
        muscleProgress={muscleProgress}
        weeklyLoad={weeklyLoad}
        identifier={identifier}
        recoveryMap={recoveryMap}
      />
    ),
    WorkoutHistory: (
      <WorkoutHistoryScreen
        {...nav}
        identifier={identifier}
        workouts={workouts}
      />
    ),
  };

  return views[current] ?? views.Home;
}
