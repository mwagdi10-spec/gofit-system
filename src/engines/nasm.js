import { getMuscleGroup, dateFromLog, startOfDay } from '../utils/formatters';

export function getClientMetrics(phone, workouts, logs) {

  const clientWorkouts = workouts.filter(w => w.assignedTo === phone);

  const clientLogs = logs.filter(l => l.clientName === phone);

  const datedLogs = clientLogs.map(l => ({...l, _date: dateFromLog(l)})).filter(l => l._date);

  const lastLog = datedLogs.sort((a,b) => b._date - a._date)[0];

  const now = new Date();

  const twentyDaysAgo = new Date(now);

  twentyDaysAgo.setDate(now.getDate() - 20);

  const recentLogs = datedLogs.filter(l => l._date >= twentyDaysAgo);

  const activeDays = new Set(recentLogs.map(l => startOfDay(l._date).toISOString().slice(0,10))).size;

  const expectedDays = Math.max(1, Math.min(28, Number(clientWorkouts.length ? 12 : 4)));

  const adherence = Math.min(100, Math.round((activeDays / expectedDays) * 100));

  const muscleCounts = {};

  clientLogs.forEach(l => {

    const muscle = getMuscleGroup(l.exerciseName);

    if (muscle) muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;

  });

  const topMuscle = Object.entries(muscleCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';

  const avgRpeLogs = clientLogs.filter(l => Number(l.rpe));

  const avgRpe = avgRpeLogs.length ? (avgRpeLogs.reduce((a,l)=>a+Number(l.rpe),0)/avgRpeLogs.length).toFixed(1) : '—';

  return {
    assigned: clientWorkouts.length,
    logs: clientLogs.length,
    completed: clientLogs.length,
    prs: clientLogs.filter(l => l.isPR).length,
    avgRpe,
    topMuscle,
    adherence,
    lastDate: lastLog?._date || null,
    daysSinceLast: lastLog?._date ? Math.floor((startOfDay(now)-startOfDay(lastLog._date))/(1000*60*60*24)) : 999,
    muscleCounts,
  };

}
export function getCoachRecommendations(client, metrics) {
  const recs = [];
  if (metrics.daysSinceLast >= 7) recs.push('Follow up: no workout logged this week.');
  if (metrics.adherence < 50) recs.push('Reduce plan complexity or add a lighter check-in session.');
  if (Number(metrics.avgRpe) >= 8.5) recs.push('High average RPE: consider deload or lower volume.');
  if (metrics.assigned > 0 && metrics.completed / metrics.assigned < 0.35) recs.push('Client may need fewer exercises per day.');
  if (client.injuries) recs.push('Review exercise selection against injury notes before progressing load.');
  return recs.length ? recs : ['Plan looks stable. Progress load gradually where form is clean.'];
}