import { WORKOUT_TEMPLATES, TEMPLATE_MAX_EXERCISES, TEMPLATE_SPLIT_TARGETS, TEMPLATE_FALLBACK_EXERCISES } from '../constants/templates';
import { getMuscleGroup, getExerciseMuscle } from './formatters';
import { normalizeAlternatives, applySuggestedAlternatives } from './validators';

export function getTemplateDefaults(muscleGroup = 'Other') {
  const cardio = muscleGroup === 'Cardio';
  const mobility = muscleGroup === 'Mobility';
  const activation = ['Core', 'Glutes', 'Mobility'].includes(muscleGroup);
  return {
    category: cardio ? 'CARDIO' : mobility ? 'WARM-UP' : activation ? 'ACTIVATION' : 'RESISTANCE',
    sets: cardio ? '1' : '3',
    reps: cardio ? '10-15 mins' : activation ? '10-12' : '8-12',
    tempo: cardio ? 'Moderate' : ''
  };
}

export function normalizeTemplateExercise(item = {}) {
  const muscleGroup = item.muscleGroup || getMuscleGroup(item.name) || (item.category === 'CARDIO' ? 'Cardio' : 'Other');
  return {
    ...item,
    muscleGroup,
    alternatives: normalizeAlternatives(item.alternatives || applySuggestedAlternatives({...item, muscleGroup}, item.alternatives))
  };
}

export function pickTemplateExerciseFromLibrary(libraryData = [], muscleGroup = 'Other', usedNames = new Set()) {
  const match = libraryData.find(ex => {
    const name = (ex.name || '').trim();
    if (!name || usedNames.has(name.toLowerCase())) return false;
    const exMuscle = getExerciseMuscle(ex);
    return exMuscle === muscleGroup || ex.category === muscleGroup.toUpperCase();
  });
  if (match) {
    const defaults = getTemplateDefaults(muscleGroup);
    return normalizeTemplateExercise({
      name: match.name,
      category: match.category || defaults.category,
      muscleGroup: getExerciseMuscle(match),
      sets: match.defaultSets || match.sets || defaults.sets,
      reps: match.defaultReps || match.reps || defaults.reps,
      tempo: match.tempo || defaults.tempo,
      coachNote: '',
      gifUrl: match.gifUrl || '',
      alternatives: match.alternatives
    });
  }

  const fallbackName = (TEMPLATE_FALLBACK_EXERCISES[muscleGroup] || TEMPLATE_FALLBACK_EXERCISES.Other)
    .find(name => !usedNames.has(name.toLowerCase())) || `${muscleGroup} Exercise`;
  const defaults = getTemplateDefaults(muscleGroup);
  return normalizeTemplateExercise({
    name: fallbackName,
    category: defaults.category,
    muscleGroup,
    sets: defaults.sets,
    reps: defaults.reps,
    tempo: defaults.tempo,
    coachNote: '',
    gifUrl: ''
  });
}

export function buildExpandedTemplateItems(templateName, libraryData = [], coachNoteSuffix = '') {
  const seedItems = (WORKOUT_TEMPLATES[templateName] || []).map(normalizeTemplateExercise);
  const days = [...new Set(seedItems.map(item => item.day).filter(Boolean))];
  const usedNames = new Set(seedItems.map(item => (item.name || '').toLowerCase()));
  const grouped = {};
  seedItems.forEach(item => {
    if (!grouped[item.day]) grouped[item.day] = [];
    grouped[item.day].push(item);
  });

  const result = [];
  days.forEach(day => {
    const dayItems = grouped[day] || [];
    const targetCount = Math.max(dayItems.length, Math.ceil(TEMPLATE_MAX_EXERCISES / Math.max(days.length, 1)));
    const targets = TEMPLATE_SPLIT_TARGETS[day] || ['Chest', 'Back', 'Quads', 'Core'];
    const expanded = [...dayItems];
    let targetIdx = 0;
    while (expanded.length < targetCount && result.length + expanded.length < TEMPLATE_MAX_EXERCISES) {
      const muscleGroup = targets[targetIdx % targets.length];
      const picked = pickTemplateExerciseFromLibrary(libraryData, muscleGroup, usedNames);
      usedNames.add((picked.name || '').toLowerCase());
      expanded.push({...picked, day});
      targetIdx++;
    }
    result.push(...expanded);
  });

  return result.slice(0, TEMPLATE_MAX_EXERCISES).map((item, idx) => ({
    ...item,
    coachNote: [item.coachNote, coachNoteSuffix].filter(Boolean).join(' · '),
    orderIndex: Date.now() + idx
  }));
}