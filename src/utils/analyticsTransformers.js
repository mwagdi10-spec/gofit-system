import { startOfDay, dateFromLog, formatDateShort, formatName } from './formatters';

const SKIP_TRACK_EXCLUDE = new Set(['WARM-UP', 'COOL-DOWN']);
const ADHERENCE_DROP_THRESHOLD_PCT = 15;
const PLATEAU_MIN_LOGS = 3;
const PHASE_IMBALANCE_HIGH_PCT = 70;
const PHASE_IMBALANCE_LOW_PCT = 5;
const PLATEAU_CATEGORIES = new Set(['RESISTANCE']);

function getMaxWeight(log) {
  return Number(log?.maxWeight) || Math.max(...(log?.setsData?.map(s => Number(s.weight) || 0) || [0]));
}

function getMaxReps(log) {
  return Math.max(...(log?.setsData?.map(s => Number(s.reps) || 0) || [0]));
}

function getVolume(log) {
  return Number(log?.volume) || (log?.setsData || []).reduce((sum, set) => (
    sum + ((Number(set.weight) || 0) * (Number(set.reps) || 0))
  ), 0);
}

function getSessionKey(log) {
  const d = dateFromLog(log);
  return d ? startOfDay(d).toISOString().slice(0, 10) : null;
}

function getCurrentWeekWindow(now = new Date()) {
  const end = new Date(now);
  const start = startOfDay(new Date(now));
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return { start, end };
}

function groupLogsByExercise(logs) {
  return logs.reduce((groups, log) => {
    if (!log.exerciseName || !log.setsData?.length) return groups;
    (groups[log.exerciseName] ||= []).push(log);
    return groups;
  }, {});
}

// Adherence %: active logged days vs expected days for the period
export function buildAdherence(clientInfo, periodLogs, periodDays) {
  const activeDays = new Set(
    periodLogs.map(dateFromLog).filter(Boolean).map(d => startOfDay(d).toISOString().slice(0, 10))
  ).size;
  const daysPerWeek = clientInfo?.daysPerWeek || 4;
  const expectedDays = Math.max(1, Math.round((periodDays / 7) * daysPerWeek));
  const adherencePct = Math.min(100, Math.round((activeDays / expectedDays) * 100));
  return { activeDays, expectedDays, adherencePct };
}

// Last workout date + inactivity flag (lastLog = most recent log, any range)
export function buildInactivity(lastLog) {
  const lastDate = lastLog ? dateFromLog(lastLog) : null;
  if (!lastDate) return { lastWorkoutDate: null, daysSinceLast: null, isInactive: true };
  const daysSinceLast = Math.floor((startOfDay(new Date()) - startOfDay(lastDate)) / 86400000);
  return { lastWorkoutDate: lastDate, daysSinceLast, isInactive: daysSinceLast >= 7 };
}

// Most skipped exercises: assigned count vs logged count within period
export function buildSkippedExercises(workouts, periodLogs, limit = 5) {
  const assignedCounts = {};
  workouts.forEach(w => {
    if (SKIP_TRACK_EXCLUDE.has(w.category)) return;
    if (!w.name) return;
    assignedCounts[w.name] = (assignedCounts[w.name] || 0) + 1;
  });
  const loggedCounts = {};
  periodLogs.forEach(l => {
    if (!l.exerciseName) return;
    loggedCounts[l.exerciseName] = (loggedCounts[l.exerciseName] || 0) + 1;
  });
  return Object.entries(assignedCounts)
    .map(([name, assignedCount]) => {
      const loggedCount = loggedCounts[name] || 0;
      const skipPct = Math.round((1 - Math.min(loggedCount, assignedCount) / assignedCount) * 100);
      return { name, assignedCount, loggedCount, skipPct };
    })
    .filter(e => e.skipPct > 0)
    .sort((a, b) => b.skipPct - a.skipPct || b.assignedCount - a.assignedCount)
    .slice(0, limit);
}

// PR progression: chronological list of isPR logs within period
export function buildPrTimeline(periodLogs, limit = 10) {
  return periodLogs
    .filter(l => l.isPR)
    .sort((a, b) => (dateFromLog(b) || 0) - (dateFromLog(a) || 0))
    .slice(0, limit)
    .map(l => ({
      date:   formatDateShort(dateFromLog(l)),
      name:   l.exerciseName,
      weight: l.maxWeight || Math.max(...(l.setsData?.map(s => parseFloat(s.weight) || 0) || [0])),
      reps:   Math.max(...(l.setsData?.map(s => parseFloat(s.reps) || 0) || [0])),
    }));
}

// ─── NASM Diagnostic Insights ──────────────────────────────────────────────

// Rule 1: Adherence Trend Drop (GAS: Alarm→Resistance→Exhaustion)
function detectAdherenceDrop(currentPct, previousPct) {
  if (previousPct === null) return null;
  const drop = previousPct - currentPct;
  if (drop < ADHERENCE_DROP_THRESHOLD_PCT) return null;
  return {
    type: 'adherence_drop',
    severity: 'high',
    icon: '🔴',
    title: 'Adherence Alert',
    message: `Adherence dropped from ${previousPct}%→${currentPct}% vs previous period`,
  };
}

// Rule 2: True Plateau (Law of Diminishing Returns) - same max weight+reps across N+ logs, RESISTANCE only
function detectPlateaus(periodLogs) {
  const byExercise = {};
  periodLogs.forEach(l => {
    if (!l.exerciseName || !l.setsData?.length) return;
    if (!PLATEAU_CATEGORIES.has(l.category)) return;
    const maxWeight = l.maxWeight ?? Math.max(...l.setsData.map(s => parseFloat(s.weight) || 0));
    const maxReps   = Math.max(...l.setsData.map(s => parseFloat(s.reps) || 0));
    (byExercise[l.exerciseName] ||= []).push({ weight: maxWeight, reps: maxReps, date: dateFromLog(l) });
  });
  const flags = [];
  Object.entries(byExercise).forEach(([name, logs]) => {
    if (logs.length < PLATEAU_MIN_LOGS) return;
    const sorted = logs.sort((a, b) => (a.date || 0) - (b.date || 0)).slice(-PLATEAU_MIN_LOGS);
    const [first, ...rest] = sorted;
    const stuck = rest.every(l => l.weight === first.weight && l.reps === first.reps);
    if (!stuck || first.weight === 0) return;
    flags.push({
      type: 'plateau',
      severity: 'medium',
      icon: '🟡',
      title: 'Plateau Warning',
      message: `${formatName(name)} stuck at ${first.weight}kg × ${first.reps} reps for ${sorted.length} sessions`,
    });
  });
  return flags;
}

// Rule 3: Phase/Category Imbalance (OPT progression rules)
function detectPhaseImbalance(periodLogs) {
  const total = periodLogs.length;
  if (total === 0) return [];
  const byCategory = {};
  periodLogs.forEach(l => {
    const cat = l.category || 'UNKNOWN';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });
  const flags = [];
  Object.entries(byCategory).forEach(([cat, count]) => {
    const pct = Math.round((count / total) * 100);
    if (pct >= PHASE_IMBALANCE_HIGH_PCT) {
      flags.push({
        type: 'phase_imbalance',
        severity: 'low',
        icon: '🔵',
        title: 'Phase Imbalance',
        message: `${cat} makes up ${pct}% of the program — unbalanced`,
      });
    } else if (pct <= PHASE_IMBALANCE_LOW_PCT) {
      flags.push({
        type: 'phase_imbalance',
        severity: 'low',
        icon: '🔵',
        title: 'Phase Imbalance',
        message: `${cat} makes up only ${pct}% of the program — unbalanced`,
      });
    }
  });
  return flags;
}

// Aggregates all NASM diagnostic rules into one insights list
export function buildInsights({ periodLogs, currentAdherencePct, previousAdherencePct }) {
  const flags = [
    detectAdherenceDrop(currentAdherencePct, previousAdherencePct),
    ...detectPlateaus(periodLogs),
    ...detectPhaseImbalance(periodLogs),
  ].filter(Boolean);

  const order = { high: 0, medium: 1, low: 2 };
  return flags.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function buildReadinessScore({ checkIn, lastWorkoutDate, recentLogs = [] }) {
  const sleep = Number(checkIn?.sleep) || 0;
  const energy = Number(checkIn?.energy) || 0;
  const soreness = Number(checkIn?.soreness) || 0;
  const stress = Number(checkIn?.stress) || 0;

  let score = 50;
  score += Math.round((sleep - 5) * 6);
  score += Math.round((energy - 5) * 4);
  score -= Math.round(soreness * 3);
  score -= Math.round(stress * 2);
  if (lastWorkoutDate) {
    const daysSinceLast = Math.floor((startOfDay(new Date()) - startOfDay(lastWorkoutDate)) / 86400000);
    if (daysSinceLast === 0) score += 2;
    if (daysSinceLast >= 3) score += 4;
  }
  if ((recentLogs.length || 0) >= 5) score += 2;
  return Math.max(0, Math.min(100, score));
}

export function buildClientCoachReport({ clientInfo, periodLogs = [], prevPeriodLogs = [], periodDays = 7 }) {
  const adherence = buildAdherence(clientInfo, periodLogs, periodDays);
  const currentVolume = periodLogs.reduce((sum, log) => sum + getVolume(log), 0);
  const previousVolume = prevPeriodLogs.reduce((sum, log) => sum + getVolume(log), 0);
  const volumePct = previousVolume > 0 ? Math.round((currentVolume / previousVolume) * 100) : (currentVolume > 0 ? 100 : 0);
  const currentBest = {};
  const previousBest = {};

  periodLogs.forEach(log => {
    const weight = getMaxWeight(log);
    if (!log.exerciseName || weight <= 0) return;
    currentBest[log.exerciseName] = Math.max(currentBest[log.exerciseName] || 0, weight);
  });
  prevPeriodLogs.forEach(log => {
    const weight = getMaxWeight(log);
    if (!log.exerciseName || weight <= 0) return;
    previousBest[log.exerciseName] = Math.max(previousBest[log.exerciseName] || 0, weight);
  });

  const liftGain = Object.entries(currentBest)
    .map(([name, weight]) => ({ name, gain: weight - (previousBest[name] || 0), weight }))
    .filter(item => item.gain > 0 && previousBest[item.name])
    .sort((a, b) => b.gain - a.gain)[0];

  const thisWeek = [
    liftGain
      ? `Increased ${formatName(liftGain.name)} by ${liftGain.gain}kg`
      : periodLogs.length ? `Logged ${periodLogs.length} exercise entries` : 'No training logs yet this week',
    `Completed ${volumePct}% of last period training volume`,
    `Committed to ${adherence.activeDays} of ${adherence.expectedDays} planned sessions`,
  ];

  const nextWeek = [];
  if (adherence.adherencePct >= 85 && volumePct >= 90) nextWeek.push('Apply a small progressive overload on strongest lifts');
  if (volumePct > 120) nextWeek.push('Keep volume steady before adding more sets');
  if (adherence.adherencePct < 70) nextWeek.push('Prioritize completing planned sessions before increasing load');
  nextWeek.push('Keep lower-body volume stable unless recovery is low');

  return {
    adherence,
    currentVolume,
    previousVolume,
    volumePct,
    thisWeek,
    nextWeek: [...new Set(nextWeek)].slice(0, 3),
  };
}

export function buildSmartDeloadSignal({ allLogs = [], recentLogs = [] }) {
  const last21Days = recentLogs;
  const avgRpe = last21Days.filter(l => Number(l.rpe)).reduce((sum, l, _i, arr) => sum + (Number(l.rpe) / arr.length), 0);
  const hasRecentPr = last21Days.some(l => l.isPR);
  const byExercise = groupLogsByExercise(allLogs);
  let fallingRepSignals = 0;

  Object.values(byExercise).forEach(logs => {
    const sorted = logs.sort((a, b) => (dateFromLog(a) || 0) - (dateFromLog(b) || 0)).slice(-3);
    if (sorted.length < 3) return;
    const reps = sorted.map(getMaxReps);
    if (reps[2] < reps[0] && getMaxWeight(sorted[2]) <= getMaxWeight(sorted[0])) fallingRepSignals += 1;
  });

  const shouldDeload = !hasRecentPr && avgRpe >= 8 && fallingRepSignals > 0;
  return {
    shouldDeload,
    avgRpe: Number(avgRpe.toFixed(1)) || 0,
    hasRecentPr,
    fallingRepSignals,
    message: shouldDeload
      ? 'Fatigue pattern detected. Consider a deload week next week.'
      : 'No deload needed right now.',
  };
}

export function buildWeightRecommendations(allLogs = [], limit = 5) {
  return Object.entries(groupLogsByExercise(allLogs))
    .map(([name, logs]) => {
      const sorted = logs.sort((a, b) => (dateFromLog(a) || 0) - (dateFromLog(b) || 0));
      const last = sorted.at(-1);
      const maxWeight = getMaxWeight(last);
      const topReps = getMaxReps(last);
      const sets = last?.setsData?.length || 0;
      if (!last || maxWeight <= 0 || topReps < 8) return null;
      const step = maxWeight >= 40 ? 2.5 : 1;
      return {
        name,
        last: `${maxWeight}kg x ${topReps}`,
        recommendation: `${Number((maxWeight + step).toFixed(1))}kg next time`,
        reason: `${sets} set(s), top set reached ${topReps} reps`,
      };
    })
    .filter(Boolean)
    .slice(-limit)
    .reverse();
}

export function buildPlateauActionPlan(allLogs = [], minLogs = 3) {
  return Object.entries(groupLogsByExercise(allLogs))
    .map(([name, logs]) => {
      const sorted = logs.sort((a, b) => (dateFromLog(a) || 0) - (dateFromLog(b) || 0)).slice(-minLogs);
      if (sorted.length < minLogs) return null;
      const first = sorted[0];
      const sameWeight = sorted.every(log => getMaxWeight(log) === getMaxWeight(first));
      const sameReps = sorted.every(log => getMaxReps(log) === getMaxReps(first));
      if (!sameWeight || !sameReps || getMaxWeight(first) <= 0) return null;
      return {
        name,
        metric: `${getMaxWeight(first)}kg x ${getMaxReps(first)}`,
        sessions: sorted.length,
        actions: ['Deload 1 week', 'Change rep range', 'Add one quality set'],
      };
    })
    .filter(Boolean);
}

export function buildPerformanceBars(periodLogs = [], prevPeriodLogs = []) {
  const currentByDay = {};
  const previousByDay = {};
  periodLogs.forEach(log => {
    const key = getSessionKey(log);
    if (key) currentByDay[key] = (currentByDay[key] || 0) + getVolume(log);
  });
  prevPeriodLogs.forEach(log => {
    const key = getSessionKey(log);
    if (key) previousByDay[key] = (previousByDay[key] || 0) + getVolume(log);
  });
  return Object.entries(currentByDay).map(([date, volume]) => ({
    date: formatDateShort(new Date(date)),
    volume,
    previousAvg: Math.round(Object.values(previousByDay).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(previousByDay).length)),
  }));
}

export function buildCalendarHeatmap(allLogs = [], days = 35) {
  const active = allLogs.reduce((map, log) => {
    const key = getSessionKey(log);
    if (key) map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
  return Array.from({ length: days }, (_, index) => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - (days - 1 - index));
    const key = d.toISOString().slice(0, 10);
    return { date: key, label: formatDateShort(d), count: active[key] || 0 };
  });
}

export function buildPeriodComparison(periodLogs = [], prevPeriodLogs = []) {
  const currentVolume = periodLogs.reduce((sum, log) => sum + getVolume(log), 0);
  const previousVolume = prevPeriodLogs.reduce((sum, log) => sum + getVolume(log), 0);
  const currentDays = new Set(periodLogs.map(getSessionKey).filter(Boolean)).size;
  const previousDays = new Set(prevPeriodLogs.map(getSessionKey).filter(Boolean)).size;
  return {
    volumeDeltaPct: previousVolume ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100) : 0,
    sessionDelta: currentDays - previousDays,
    currentVolume,
    previousVolume,
  };
}

export function buildMesocycleProgress(clientWorkouts = [], periodLogs = []) {
  const weeks = new Set(clientWorkouts.map(w => w.week || 'Week 1')).size || 1;
  const trainedDays = new Set(periodLogs.map(getSessionKey).filter(Boolean)).size;
  const currentWeek = Math.min(weeks, Math.max(1, Math.ceil(trainedDays / 4)));
  const progressPct = Math.round((currentWeek / weeks) * 100);
  return {
    currentWeek,
    totalWeeks: weeks,
    progressPct,
    phase: progressPct >= 85 ? 'Peak / Deload soon' : progressPct >= 50 ? 'Build phase' : 'Base phase',
  };
}

export function buildWeeklyCoachReport({ workouts = [], logs = [], checkIns = [], clients = [] }) {
  const activeClients = new Set(logs.map(l => l.clientName).filter(Boolean)).size;
  const checkInCount = checkIns.length;
  const attention = clients
    .map(client => {
      const name = client.id || client.phone || client.name;
      const clientLogs = logs.filter(l => l.clientName === name);
      const last = clientLogs.at(-1);
      const daysSinceLast = last ? Math.floor((startOfDay(new Date()) - startOfDay(dateFromLog(last))) / 86400000) : 999;
      const missed = Math.max(0, (client.daysPerWeek || 4) - clientLogs.length);
      return { name: client.name || name, daysSinceLast, missed };
    })
    .sort((a, b) => b.daysSinceLast - a.daysSinceLast || b.missed - a.missed)
    .slice(0, 5);

  return {
    activeClients,
    checkInCount,
    totalWorkouts: workouts.length,
    totalLogs: logs.length,
    attention,
  };
}
