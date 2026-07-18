import { CATEGORIES } from '../services/firebase/config';
import { getExerciseMuscle } from '../utils/formatters';

export const DEFAULT_CATEGORY_COUNTS = {
  'WARM-UP': 1,
  'ACTIVATION': 2,
  'SKILL': 2,
  'RESISTANCE': 8,
  'CARDIO': 2,
  'COOL-DOWN': 0,
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds ordered exercise items for a full day, pulling only from existing library
export function generateAutoDayItems(libraryData, { muscleFilter = '', categoryCounts = DEFAULT_CATEGORY_COUNTS, coachNote = '' } = {}) {
  const items = [];
  CATEGORIES.forEach(cat => {
    const count = categoryCounts[cat] || 0;
    if (!count) return;
    let pool = libraryData.filter(ex => ex.category === cat);
    if (muscleFilter && (cat === 'RESISTANCE' || cat === 'SKILL')) {
      const focused = pool.filter(ex => getExerciseMuscle(ex) === muscleFilter);
      if (focused.length) pool = focused;
    }
    shuffle(pool).slice(0, count).forEach(ex => {
      items.push({
        name: ex.name,
        category: cat,
        muscleGroup: getExerciseMuscle(ex),
        gifUrl: ex.gifUrl || '',
        sets: '3',
        reps: '10',
        tempo: '',
        coachNote,
        alternatives: ex.alternatives || [],
      });
    });
  });
  return items;
}

export function buildNasmCategoryCounts({ goal = '', phase = 1 } = {}) {
  const g = String(goal).toLowerCase();
  const counts = { ...DEFAULT_CATEGORY_COUNTS };
  if (g.includes('fat') || g.includes('loss') || g.includes('weight')) {
    counts['WARM-UP'] = 1;
    counts['ACTIVATION'] = 2;
    counts['SKILL'] = 1;
    counts['RESISTANCE'] = 6;
    counts['CARDIO'] = 2;
    counts['COOL-DOWN'] = 0;
  } else if (g.includes('strength')) {
    counts['WARM-UP'] = 1;
    counts['ACTIVATION'] = 2;
    counts['SKILL'] = 2;
    counts['RESISTANCE'] = 7;
    counts['CARDIO'] = 1;
    counts['COOL-DOWN'] = 0;
  } else if (g.includes('rehab') || phase <= 2) {
    counts['WARM-UP'] = 3;
    counts['ACTIVATION'] = 3;
    counts['SKILL'] = 2;
    counts['RESISTANCE'] = 4;
    counts['CARDIO'] = 0;
    counts['COOL-DOWN'] = 0;
  } else {
    counts['WARM-UP'] = 1;
    counts['ACTIVATION'] = 2;
    counts['SKILL'] = 2;
    counts['RESISTANCE'] = 6;
    counts['CARDIO'] = 2;
    counts['COOL-DOWN'] = 0;
  }
  return counts;
}
