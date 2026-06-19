import { useState, useMemo } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID }          from '../services/firebase/config';
import { useClientData }       from '../hooks/useClientData';
import {
  buildUser, buildPlan, buildSessionPhases,
  buildMuscleProgress, buildWeeklyLoad,
} from '../utils/clientDataTransformers';

import HomeScreen          from '../screens/HomeScreen';
import PlanScreen          from '../screens/PlanScreen';
import ProfileScreen       from '../screens/ProfileScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import ProgressScreen      from '../screens/ProgressScreen';

export default function AppRouter() {
  const identifier = localStorage.getItem('gofit_user') || '';
  const [current, setCurrent] = useState('Home');
  const [params,  setParams]  = useState({});

  const { workouts, logs, sessions, clientInfo, library, loading } = useClientData(identifier);

  /* ── transformed data ──────────────────────────────────────── */
  const user          = useMemo(() => buildUser(clientInfo, logs),        [clientInfo, logs]);
  const plan          = useMemo(() => buildPlan(workouts, sessions),      [workouts, sessions]);
  const muscleProgress= useMemo(() => buildMuscleProgress(logs),         [logs]);
  const weeklyLoad    = useMemo(() => buildWeeklyLoad(logs),              [logs]);

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

  /* ── navigation ────────────────────────────────────────────── */
  const navigate = (name, p = {}) => { setCurrent(name); setParams(p); };
  const goBack   = ()              => navigate('Home');

  /* ── end workout → save session → go home ──────────────────── */
  async function handleEndWorkout() {
    const day    = params.day    || activeDay?.day;
    const weekId = params.weekId || activeDay?.weekId || 'Week 1';
    if (day && identifier) {
      try {
        await addDoc(
          collection(db, 'artifacts', APP_ID, 'public', 'data', 'sessions'),
          { clientName: identifier, day, week: weekId, completed: true, completedAt: serverTimestamp() }
        );
      } catch (e) { console.error('session save:', e); }
    }
    navigate('Home');
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
      />
    ),
    Plan: (
      <PlanScreen
        {...nav}
        plan={plan}
        workouts={workouts}
        user={user}
        identifier={identifier}
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
        onEndWorkout={handleEndWorkout}
      />
    ),
    Progress: (
      <ProgressScreen
        {...nav}
        user={user}
        muscleProgress={muscleProgress}
        weeklyLoad={weeklyLoad}
      />
    ),
  };

  return views[current] ?? views.Home;
}
