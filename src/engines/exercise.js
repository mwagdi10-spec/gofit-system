import { dateFromLog } from '../utils/formatters';

export function getOverloadSuggestion(exercise, allLogs, identifier) {

  const history = allLogs

    .filter(l => l.exerciseId === exercise.id && l.clientName === identifier)

    .sort((a,b)=>(dateFromLog(a)||0)-(dateFromLog(b)||0))

    .slice(-3);

  if (history.length < 2) return 'Log 2 sessions to unlock overload guidance.';

  const last = history[history.length - 1];

  const lastMax = Number(last.maxWeight) || Math.max(...(last.setsData?.map(s=>parseFloat(s.weight)||0)||[0]));

  const avgRpe = history.reduce((a,l)=>a+(Number(l.rpe)||7),0)/history.length;

  if (avgRpe <= 7 && lastMax > 0) return `Next target: try ${Math.round((lastMax + 2.5) * 2) / 2}kg if form stays clean.`;

  if (avgRpe >= 9) return 'Hold load or reduce 5-10% next session.';

  return 'Repeat current load and aim for cleaner reps.';

}
