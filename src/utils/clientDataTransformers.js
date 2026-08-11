import { getMuscleGroup, dateFromLog, startOfDay } from '../utils/formatters';

// ─────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────
export function buildUser(clientInfo, logs = []) {
  const daysPerWeek = clientInfo?.daysPerWeek || 4;
  // active days this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const activeDays = new Set(
    logs
      .filter(l => {
        const d = l.completedAt?.toDate?.();
        return d && d >= weekStart;
      })
      .map(l => l.completedAt.toDate().toLocaleDateString('en-US'))
  ).size;

  return {
    name:              clientInfo?.name              || 'Client',
    currentPhase:      `Phase ${clientInfo?.nasm_phase || 1} – ${clientInfo?.goal || 'Training'}`,
    weeklyProgress:    activeDays,
    weeklyGoal:        daysPerWeek,
    nextWorkout:       buildNextWorkoutLabel(clientInfo),
    age:               clientInfo?.age               || 0,
    weight:            clientInfo?.weight            || 0,
    height:            clientInfo?.height            || 0,
    goal:              clientInfo?.goal               || 'Fitness',
    nasm_phase:        clientInfo?.nasm_phase         || 1,
    injuries:          clientInfo?.injuries           || '',
    measurements:      clientInfo?.measurements       || '',
    coachNotes:        clientInfo?.coachNotes         || '',
    weeklyCardioTarget: clientInfo?.weeklyCardioTarget || 0,
  };
}

function buildNextWorkoutLabel(clientInfo) {
  const phase = clientInfo?.nasm_phase || 1;
  const labels = { 1:'Stabilization', 2:'Strength Endurance', 3:'Hypertrophy', 4:'Strength', 5:'Power' };
  return `${labels[phase] || 'Training'} Session`;
}

// ─────────────────────────────────────────────────────────────
// PLAN  (4 identical weeks, completion via sessions collection)
// ─────────────────────────────────────────────────────────────
export function buildPlan(workouts, sessions = []) {
  // Group by actual `week` field → separate weeks with own days
  const weekMap = {};
  workouts.forEach(w => {
    const wk = w.week || 'Week 1';
    const dy = w.day;
    if (!dy) return;
    if (!weekMap[wk]) weekMap[wk] = {};
    if (!weekMap[wk][dy]) weekMap[wk][dy] = [];
    weekMap[wk][dy].push(w.muscleGroup || w.category || '');
  });

  const weekKeys = Object.keys(weekMap).sort((a, b) =>
    (parseInt(a.match(/\d+/)?.[0]) || 0) - (parseInt(b.match(/\d+/)?.[0]) || 0)
  );

  if (!weekKeys.length) return [];

  let foundActive = false;

  return weekKeys.map((weekLabel, idx) => {
    const weekNum = idx + 1;
    const days = Object.keys(weekMap[weekLabel]).sort((a, b) =>
      (parseInt(a.match(/\d+/)?.[0]) || 999) - (parseInt(b.match(/\d+/)?.[0]) || 999)
    );

    // dominant muscle per day within this week
    const dayType = day => {
      const cats = weekMap[weekLabel][day];
      const counts = {};
      cats.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Training';
    };

    return {
      week_id: weekLabel,
      title:   weekLabel,
      days: days.map(day => {
        const isCompleted = sessions.some(
          s => s.day === day &&
               (s.week === weekLabel || s.week === weekNum) &&
               s.completed === true
        );
        const isActive = !isCompleted && !foundActive
          ? (foundActive = true, true)
          : false;
        return {
          id:          `${weekLabel}-${day}`,
          title:       day,
          type:        dayType(day),
          isCompleted,
          isActive,
          weekLabel,
        };
      }),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// SESSION PHASES  (ActiveWorkout screen)
// ─────────────────────────────────────────────────────────────
const PHASE_ORDER   = ['WARM-UP','ACTIVATION','SKILL','RESISTANCE','CARDIO','HIIT','COOL-DOWN'];
const PHASE_LABELS  = { 'HIIT': 'HIIT (Optional)', 'COOL-DOWN': 'STATIC STRETCHES (10 mins)' };
const NO_LOG_PHASES = new Set(['WARM-UP','COOL-DOWN','CARDIO','HIIT']);

const DEFAULT_STRETCHES = [
  { id:'ds1',  name:'Quad Stretch',             gifUrl:'', link:'' },
  { id:'ds2',  name:'Hamstring Stretch',         gifUrl:'', link:'' },
  { id:'ds3',  name:'Hip Flexor Stretch',        gifUrl:'', link:'' },
  { id:'ds4',  name:'Chest Doorway Stretch',     gifUrl:'', link:'' },
  { id:'ds5',  name:'Seated Piriformis Stretch', gifUrl:'', link:'' },
  { id:'ds6',  name:"Child's Pose",              gifUrl:'', link:'' },
  { id:'ds7',  name:'Shoulder Cross Stretch',    gifUrl:'', link:'' },
  { id:'ds8',  name:'Spinal Twist',              gifUrl:'', link:'' },
  { id:'ds9',  name:'Calf Stretch',              gifUrl:'', link:'' },
  { id:'ds10', name:'Neck Side Stretch',         gifUrl:'', link:'' },
];

export function buildSessionPhases(workouts, day, logs = [], identifier = '', library = [], weekLabel = 'Week 1') {
  const dayExercises = workouts
    .filter(w => w.day === day && (w.week || 'Week 1') === weekLabel)
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  // COOL-DOWN: prefer library, fallback to defaults
  const libStretches  = library.filter(l => l.category === 'COOL-DOWN');
  const stretchPool   = libStretches.length >= 5
    ? libStretches.slice(0, 10)
    : [...libStretches, ...DEFAULT_STRETCHES].slice(0, 10);

  return PHASE_ORDER
    .map(cat => {
      const exercises = dayExercises.filter(w => (w.category || 'RESISTANCE') === cat);
      if (!exercises.length && cat !== 'COOL-DOWN') return null;

      const finalExercises = (cat === 'COOL-DOWN' && !exercises.length)
        ? stretchPool.map(s => ({
            id: s.id, name: s.name, category: 'COOL-DOWN',
            tempo: '', targetSets: 1, targetReps: '30', unit: 'sec',
            loggedWeight: null, loggedReps: '30', status: 'pending',
            gifUrl: s.gifUrl || '',
            link: s.link || s.videoUrl || s.gifUrl || '',
            videoUrl: s.videoUrl || s.link || '',
            alternatives: [], overloadMessage: '', coachNote: '',
          }))
        : exercises.map(w => exerciseToCard(w, logs, identifier, cat, library));

      return {
        id:         cat.toLowerCase().replace(/[\s-]+/g, '_'),
        title:      PHASE_LABELS[cat] || cat,
        isExpanded: false,
        exercises:  finalExercises,
      };
    })
    .filter(Boolean);
}

// completedAt نفس تاريخ اليوم الحالي
function isLoggedToday(ts) {
  const d = ts?.toDate?.();
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth()    === now.getMonth() &&
         d.getDate()      === now.getDate();
}

function exerciseToCard(w, logs, identifier, cat, library = []) {
  const noLog = NO_LOG_PHASES.has(cat);
  // PR badges: Resistance only
  const pr = cat === 'RESISTANCE' ? buildPersonalRecords(w, logs, identifier) : { bestReps: 0, bestWeight: 0 };
  // already logged today → survive History نافذة back/forward
  const loggedToday = logs.find(l =>
    l.exerciseId === w.id && l.clientName === identifier && isLoggedToday(l.completedAt)
  );
  // fallback لو الميديا اتضافت للمكتبة بعد ما التمرين اتحدد للعميل
  const libEx = library.find(l => l.name === w.name);
  return {
    id:              w.id,
    name:            w.name,
    category:        cat,
    tempo:           w.tempo       || '',
    targetSets:      parseInt(w.sets) || 3,
    targetReps:      w.reps         || '10',
    unit:            cat === 'CARDIO' ? 'min' : cat === 'COOL-DOWN' ? 'sec' : 'kg',
    loggedWeight:    null,
    loggedReps:      w.reps         || '10',
    status:          loggedToday ? 'saved' : 'pending',
    gifUrl:          w.gifUrl       || libEx?.gifUrl   || '',
    videoUrl:        w.videoUrl     || libEx?.videoUrl || '',
    workSeconds:     w.workSeconds  || 30,
    restSeconds:     w.restSeconds  || 15,
    rounds:          w.rounds       || 8,
    cardioMetric:    w.cardioMetric    || 'duration',
    targetDuration:  w.targetDuration  || 20,
    targetDistance:  w.targetDistance  || 0,
    targetCalories:  w.targetCalories  || 0,
    intervals:       Array.isArray(w.intervals) ? w.intervals : [],
    alternatives:    buildAlternatives(w),
    overloadMessage: noLog ? '' : buildOverloadMsg(w, logs, identifier),
    coachNote:       w.coachNote    || '',
    bestReps:        pr.bestReps,
    bestWeight:      pr.bestWeight,
  };
}

function buildAlternatives(w) {
  return (w.alternatives || [])
    .filter(a => a?.name)
    .map((a, i) => ({
      id:          `alt-${w.id}-${i}`,
      name:        a.name,
      gifUrl:      a.gifUrl  || '',
      videoUrl:    a.videoUrl || '',
      tempo:       w.tempo   || '',
      targetSets:  parseInt(w.sets) || 3,
      targetReps:  w.reps    || '10',
      unit:        'kg',
    }));
}

function buildOverloadMsg(w, logs, identifier) {
  const history = logs
    .filter(l => l.exerciseId === w.id && l.clientName === identifier)
    .sort((a, b) => (a.completedAt?.toDate?.() || 0) - (b.completedAt?.toDate?.() || 0));

  if (history.length < 2)
    return 'Progressive overload: Log 2 sessions to unlock overload guidance.';

  const last    = history[history.length - 1];
  const lastMax = last.maxWeight || Math.max(...(last.setsData?.map(s => parseFloat(s.weight) || 0) || [0]));
  const avgRpe  = history.reduce((a, l) => a + (Number(l.rpe) || 7), 0) / history.length;

  if (avgRpe <= 7 && lastMax > 0)
    return `Next target: try ${Math.round((lastMax + 2.5) * 2) / 2}kg if form stays clean.`;
  if (avgRpe >= 9)
    return 'Hold load or reduce 5-10% next session.';
  return 'Repeat current load and aim for cleaner reps.';
}

// أعلى تكرار وأقصى وزن historically لكل تمرين (Resistance PR badges)
function buildPersonalRecords(w, logs, identifier) {
  const history = logs.filter(l => l.exerciseId === w.id && l.clientName === identifier);
  let bestReps = 0, bestWeight = 0;
  history.forEach(l => {
    (l.setsData || []).forEach(s => {
      const reps   = parseFloat(s.reps)   || 0;
      const weight = parseFloat(s.weight) || 0;
      if (reps   > bestReps)   bestReps   = reps;
      if (weight > bestWeight) bestWeight = weight;
    });
  });
  return { bestReps, bestWeight };
}

// ─────────────────────────────────────────────────────────────
// MUSCLE PROGRESS  (ProgressScreen)
// ─────────────────────────────────────────────────────────────

// أعلى Est. 1RM (Epley) بين كل الـ sets المسجلة في اللوج
function bestEst1RM(log) {
  return (log.setsData || []).reduce(
    (max, s) => Math.max(max, Math.round((parseFloat(s.weight) || 0) * (1 + (parseFloat(s.reps) || 0) / 30))),
    0
  );
}

export function buildMuscleProgress(logs) {
  const MUSCLES = ['Chest','Back','Upper Legs','Lower Legs','Biceps','Triceps'];

  // بداية أسبوع تقويمي ثابت (الإثنين) لأسبوع النهاردة
  const monday = startOfDay(new Date());
  const dow = monday.getDay();
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));

  return MUSCLES.map(muscle => {
    const muscleLogs = logs.filter(l => {
      const m = l.muscleGroup || getMuscleGroup(l.exerciseName || '');
      return m === muscle;
    });

    const weeks = ['W1','W2','W3','W4'];
    let runningBest = 0; // تراكمي: مايرجعش للخلف أبداً
    const monthlyData = weeks.map((week, i) => {
      const start = new Date(monday); start.setDate(monday.getDate() - (3 - i) * 7);
      const end   = new Date(start);  end.setDate(start.getDate() + 7);
      const weekLogs = muscleLogs.filter(l => {
        const d = dateFromLog(l);
        return d && d >= start && d < end;
      });
      const weekBest = weekLogs.length ? Math.max(...weekLogs.map(bestEst1RM)) : 0;
      runningBest = Math.max(runningBest, weekBest); // carry-forward
      return { week, load: runningBest };
    });

    const nonZero        = monthlyData.filter(d => d.load > 0);
    const start_weight   = nonZero[0]?.load || 0;
    const current_weight = monthlyData.at(-1).load;

    return { name: muscle, start_weight, current_weight, monthlyData };
  }).filter(m => m.current_weight > 0);
}

// ─────────────────────────────────────────────────────────────
// STREAK  (HomeScreen) — مبني على sessions.completed المكتملة فعلياً
// ─────────────────────────────────────────────────────────────
export function buildStreak(sessions = []) {
  const days = new Set(
    sessions
      .filter(s => s.completed && s.completedAt?.toDate)
      .map(s => s.completedAt.toDate().toDateString())
  );
  if (!days.size) return { current: 0, longest: 0 };

  // current streak: يرجع للخلف من النهاردة (أو أمبارح لو النهاردة لسه مفيهاش تمرين)
  let current = 0;
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // longest streak من كل الأيام المسجلة
  const sorted = [...days].map(d => new Date(d)).sort((a, b) => b - a);
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = Math.round((sorted[i - 1] - sorted[i]) / 86400000);
    run     = diffDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  return { current, longest: Math.max(longest, current) };
}

// ─────────────────────────────────────────────────────────────
// LEVEL / XP  (HomeScreen) — مشتق من عدد الـ sessions المكتملة، بدون حقل مخزن
// ─────────────────────────────────────────────────────────────
const XP_PER_SESSION = 50;
const LEVELS = [
  { name: 'Rookie',       min: 0    },
  { name: 'Amateur',      min: 200  },
  { name: 'Intermediate', min: 600  },
  { name: 'Advanced',     min: 1200 },
  { name: 'Elite',        min: 2000 },
];

export function buildLevel(sessions = []) {
  const xp = sessions.filter(s => s.completed).length * XP_PER_SESSION;

  let idx = 0;
  LEVELS.forEach((l, i) => { if (xp >= l.min) idx = i; });
  const cur  = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const progressPct = next
    ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100)
    : 100;

  return {
    xp,
    levelName:   cur.name,
    levelNumber: idx + 1,
    nextName:    next?.name || null,
    xpToNext:    next ? next.min - xp : 0,
    progressPct,
  };
}

// ─────────────────────────────────────────────────────────────
// MUSCLE RECOVERY MAP  (ProgressScreen) — مبني على آخر completedAt لكل عضلة
// ─────────────────────────────────────────────────────────────
const RECOVERY_HOURS = 48; // وقت التعافي الكامل الافتراضي

export function buildRecoveryMap(logs = []) {
  const MUSCLES = ['Chest', 'Back', 'Upper Legs', 'Lower Legs', 'Biceps', 'Triceps'];
  const now = new Date();

  return MUSCLES.map(muscle => {
    const lastLog = logs.reduce((latest, l) => {
      const m = l.muscleGroup || getMuscleGroup(l.exerciseName || '');
      if (m !== muscle) return latest;
      const d = l.completedAt?.toDate?.();
      if (!d) return latest;
      return (!latest || d > latest) ? d : latest;
    }, null);

    if (!lastLog) return { name: muscle, recoveryPct: 100, lastTrainedAt: null, status: 'green' };

    const hoursSince  = (now - lastLog) / 3600000;
    const recoveryPct = Math.min(100, Math.round((hoursSince / RECOVERY_HOURS) * 100));
    const status       = recoveryPct >= 80 ? 'green' : recoveryPct >= 40 ? 'yellow' : 'red';

    return { name: muscle, recoveryPct, lastTrainedAt: lastLog, status };
  });
}

// ─────────────────────────────────────────────────────────────
// WEEKLY LOAD  (ProgressScreen bar chart)
// ─────────────────────────────────────────────────────────────
export function buildWeeklyLoad(logs) {
  const now   = new Date();
  return ['W1','W2','W3','W4'].map((week, i) => {
    const start = new Date(now); start.setDate(now.getDate() - (3 - i) * 7 - 7);
    const end   = new Date(now); end.setDate(now.getDate()   - (3 - i) * 7);
    const load  = logs
      .filter(l => { const d = l.completedAt?.toDate?.(); return d && d >= start && d < end; })
      .reduce((sum, l) => sum + (Number(l.volume) || 0), 0);
    return { week, load };
  });
}
