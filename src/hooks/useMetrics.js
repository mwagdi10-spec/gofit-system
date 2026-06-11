import { useMemo } from 'react';
import { getClientMetrics } from '../engines/nasm';
import { getMuscleGroup } from '../utils/formatters';

export function useDashboardStats(clientNames, workouts, logs) {
  return useMemo(() => {
    const rows = Object.entries(clientNames).map(([phone]) =>
      getClientMetrics(phone, workouts, logs)
    );
    const adherence = rows.length
      ? Math.round(rows.reduce((a, m) => a + m.adherence, 0) / rows.length)
      : 0;
    const topMuscles = {};
    logs.forEach(l => {
      const muscle = getMuscleGroup(l.exerciseName);
      if (muscle) topMuscles[muscle] = (topMuscles[muscle] || 0) + 1;
    });
    return {
      adherence,
      completed: logs.length,
      topMuscle: Object.entries(topMuscles).sort((a, b) => b[1] - a[1])[0]?.[0] || '\u2014',
      atRisk: rows.filter(m => m.daysSinceLast >= 7 || m.adherence < 50).length
    };
  }, [clientNames, workouts, logs]);
}

export function useClientRows(clientNames, workouts, logs, { search='', goalFilter='ALL', levelFilter='ALL', sortBy='last' } = {}) {
  return useMemo(() => {
    return Object.entries(clientNames)
      .map(([phone, client]) => ({ phone, client, metrics: getClientMetrics(phone, workouts, logs) }))
      .filter(row => {
        const q = search.toLowerCase().trim();
        const matchQ    = !q || row.client.name?.toLowerCase().includes(q) || row.phone.includes(q);
        const matchGoal  = goalFilter  === 'ALL' || (row.client.goal  || '').toLowerCase().includes(goalFilter.toLowerCase());
        const matchLevel = levelFilter === 'ALL' || (row.client.level || '').toLowerCase().includes(levelFilter.toLowerCase());
        return matchQ && matchGoal && matchLevel;
      })
      .sort((a, b) => {
        if (sortBy === 'name')      return (a.client.name || '').localeCompare(b.client.name || '');
        if (sortBy === 'goal')      return (a.client.goal || '').localeCompare(b.client.goal || '');
        if (sortBy === 'level')     return (a.client.level || '').localeCompare(b.client.level || '');
        if (sortBy === 'adherence') return b.metrics.adherence - a.metrics.adherence;
        return a.metrics.daysSinceLast - b.metrics.daysSinceLast;
      });
  }, [clientNames, workouts, logs, search, goalFilter, levelFilter, sortBy]);
}