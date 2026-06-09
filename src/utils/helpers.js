import { MUSCLE_COLORS } from './constants-colors';
import { startOfDay, dateFromLog } from './utils-formatters';

// ─── Muscle Group Detection ───────────────────────────────────────────────────
export const getMuscleGroup = (exerciseName = '') => {
  const n = exerciseName.toLowerCase();
  
  if (/bike|run|treadmill|elliptical|rower|interval|cardio|climber|jumping jack|burpee/i.test(n))
    return 'Cardio';
  
  if (/bench|chest|fly|pec|push.?up|dip/i.test(n))
    return 'Chest';
  
  if (/row|pull|lat|deadlift|back|chin/i.test(n))
    return 'Back';
  
  if (/squat|leg press|lunge|quad|extension/i.test(n))
    return 'Quads';
  
  if (/hamstring|curl|romanian|rdl|nordic/i.test(n))
    return 'Hamstrings';
  
  if (/plank|crunch|ab|core|sit.?up|cable crunch|wheel/i.test(n))
    return 'Core';
  
  if (/shoulder|overhead|press|lateral raise|front raise|face pull/i.test(n))
    return 'Shoulders';
  
  if (/bicep|tricep|curl|arm|pushdown|extension/i.test(n))
    return 'Arms';
  
  if (/glute|hip thrust|bridge|kickback/i.test(n))
    return 'Glutes';
  
  return null;
};

export const getExerciseMuscle = (exercise = {}) => {
  return exercise.muscleGroup || getMuscleGroup(exercise.name) || 'Other';
};

export const getMuscleColor = (muscleGroup = '') => {
  return MUSCLE_COLORS[muscleGroup] || MUSCLE_COLORS['Other'];
};

// ─── Client Metrics ───────────────────────────────────────────────────────────
export const getClientMetrics = (phone, workouts, logs) => {
  const clientWorkouts = workouts.filter(w => w.assignedTo === phone);
  const clientLogs = logs.filter(l => l.clientName === phone);
  const datedLogs = clientLogs
    .map(l => ({ ...l, _date: dateFromLog(l) }))
    .filter(l => l._date);

  const lastLog = datedLogs.sort((a, b) => b._date - a._date)[0];
  
  const now = new Date();
  const twentyDaysAgo = new Date(now);
  twentyDaysAgo.setDate(now.getDate() - 20);
  
  const recentLogs = datedLogs.filter(l => l._date >= twentyDaysAgo);
  const activeDays = new Set(
    recentLogs.map(l => startOfDay(l._date).toISOString().slice(0, 10))
  ).size;

  const expectedDays = Math.max(
    1,
    Math.min(28, Number(clientWorkouts.length ? 12 : 4))
  );
  
  const adherence = Math.min(100, Math.round((activeDays / expectedDays) * 100));

  // Muscle counts
  const muscleCounts = {};
  clientLogs.forEach(l => {
    const muscle = getMuscleGroup(l.exerciseName);
    if (muscle) muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
  });

  const topMuscle = Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  // Average RPE
  const avgRpeLogs = clientLogs.filter(l => Number(l.rpe));
  const avgRpe = avgRpeLogs.length
    ? (avgRpeLogs.reduce((a, l) => a + Number(l.rpe), 0) / avgRpeLogs.length).toFixed(1)
    : '—';

  return {
    assigned: clientWorkouts.length,
    logs: clientLogs.length,
    completed: clientLogs.length,
    prs: clientLogs.filter(l => l.isPR).length,
    avgRpe,
    topMuscle,
    adherence,
    lastDate: lastLog?._date || null,
    daysSinceLast: lastLog?._date
      ? Math.floor((startOfDay(now) - startOfDay(lastLog._date)) / (1000 * 60 * 60 * 24))
      : 999,
    muscleCounts,
  };
};

// ─── Coach Recommendations ────────────────────────────────────────────────────
export const getCoachRecommendations = (client, metrics) => {
  const recs = [];

  if (metrics.daysSinceLast >= 7) {
    recs.push('Follow up: no workout logged this week.');
  }

  if (metrics.adherence < 50) {
    recs.push('Reduce plan complexity or add a lighter check-in session.');
  }

  if (Number(metrics.avgRpe) >= 8.5) {
    recs.push('High average RPE: consider deload or lower volume.');
  }

  if (metrics.assigned > 0 && metrics.completed / metrics.assigned < 0.35) {
    recs.push('Client may need fewer exercises per day.');
  }

  if (client.injuries) {
    recs.push('Review exercise selection against injury notes before progressing load.');
  }

  return recs.length ? recs : ['Plan looks stable. Progress load gradually where form is clean.'];
};

// ─── Overload Suggestion ──────────────────────────────────────────────────────
export const getOverloadSuggestion = (exercise, allLogs, identifier) => {
  const history = allLogs
    .filter(l => l.exerciseId === exercise.id && l.clientName === identifier)
    .sort((a, b) => (dateFromLog(a) || 0) - (dateFromLog(b) || 0))
    .slice(-3);

  if (history.length < 2) {
    return 'Log 2 sessions to unlock overload guidance.';
  }

  const last = history[history.length - 1];
  const lastMax = Number(last.maxWeight) || Math.max(
    ...(last.setsData?.map(s => parseFloat(s.weight) || 0) || [0])
  );

  const avgRpe = history.reduce((a, l) => a + (Number(l.rpe) || 7), 0) / history.length;

  if (avgRpe <= 7 && lastMax > 0) {
    return `Next target: try ${Math.round((lastMax + 2.5) * 2) / 2}kg if form stays clean.`;
  }

  if (avgRpe >= 9) {
    return 'Hold load or reduce 5-10% next session.';
  }

  return 'Repeat current load and aim for cleaner reps.';
};

// ─── Alternatives Management ──────────────────────────────────────────────────
export const makeDefaultAlternatives = () => [
  { id: '1', name: '', reason: '' },
  { id: '2', name: '', reason: '' },
  { id: '3', name: '', reason: '' }
];

export const normalizeAlternatives = (alternatives = []) => {
  const clean = alternatives
    .slice(0, 3)
    .map((alt, idx) => ({
      id: alt.id || String(idx + 1),
      name: alt.name || '',
      reason: alt.reason || ''
    }));

  return [
    ...clean,
    ...makeDefaultAlternatives().slice(clean.length)
  ].slice(0, 3);
};

export const getFilledAlternatives = (alternatives = []) => {
  return normalizeAlternatives(alternatives).filter(alt => alt.name.trim());
};

// ─── Array Helpers ────────────────────────────────────────────────────────────
export const groupBy = (arr = [], key) => {
  return arr.reduce((acc, item) => {
    const groupKey = item[key];
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {});
};

export const sortBy = (arr = [], key, ascending = true) => {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (typeof aVal === 'string') {
      return ascending
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return ascending ? aVal - bVal : bVal - aVal;
  });
};

export const filterBy = (arr = [], predicate) => {
  return arr.filter(predicate);
};

export const unique = (arr = [], key) => {
  const seen = new Set();
  return arr.filter(item => {
    const val = key ? item[key] : item;
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
};

export const chunk = (arr = [], size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// ─── Object Helpers ───────────────────────────────────────────────────────────
export const pick = (obj = {}, keys = []) => {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {});
};

export const omit = (obj = {}, keys = []) => {
  return Object.keys(obj).reduce((acc, key) => {
    if (!keys.includes(key)) acc[key] = obj[key];
    return acc;
  }, {});
};

export const merge = (...objects) => {
  return Object.assign({}, ...objects);
};

// ─── String Helpers ───────────────────────────────────────────────────────────
export const capitalize = (str = '') => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str = '', length = 50) => {
  return str.length > length ? str.slice(0, length) + '...' : str;
};

export const slugify = (str = '') => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// ─── Math Helpers ──────────────────────────────────────────────────────────────
export const average = (arr = []) => {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

export const sum = (arr = []) => {
  return arr.reduce((a, b) => a + b, 0);
};

export const median = (arr = []) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const clamp = (num, min, max) => {
  return Math.max(min, Math.min(max, num));
};

export const percentage = (part, total) => {
  return total === 0 ? 0 : (part / total) * 100;
};

// ─── Async Helpers ────────────────────────────────────────────────────────────
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const retry = async (fn, maxAttempts = 3, delayMs = 1000) => {
  let lastError;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < maxAttempts - 1) await delay(delayMs);
    }
  }
  throw lastError;
};

// ─── LocalStorage Helpers ──────────────────────────────────────────────────────
export const getLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const removeLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
