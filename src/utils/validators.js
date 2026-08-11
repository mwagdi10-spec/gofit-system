import { getMuscleGroup, getExerciseMuscle } from './formatters';
export const makeDefaultAlternatives = () => [
  { id: '1', name: '', reason: '', gifUrl: '', videoUrl: '' },
  { id: '2', name: '', reason: '', gifUrl: '', videoUrl: '' },
  { id: '3', name: '', reason: '', gifUrl: '', videoUrl: '' }
];

export function normalizeAlternatives(alternatives = []) {
  const clean = alternatives
    .slice(0, 3)
    .map((alt, idx) => ({
      id: alt.id || String(idx + 1),
      name: alt.name || '',
      reason: alt.reason || '',
      gifUrl: alt.gifUrl || '',
      videoUrl: alt.videoUrl || ''
    }));

  return [...clean, ...makeDefaultAlternatives().slice(clean.length)].slice(0, 3);

}

export function getFilledAlternatives(alternatives = []) {
  return normalizeAlternatives(alternatives).filter(alt => alt.name.trim());
}

export const ALTERNATIVE_PRESETS = {
  category: {
    CARDIO: ['Treadmill', 'Stationary Bike', 'Elliptical', 'Rowing Machine', 'Stair Climber'],
    'WARM-UP': ['Dynamic Stretching', 'Light Treadmill Walk', 'Bike Warm-up', 'Mobility Flow'],
    ACTIVATION: ['Glute Bridge', 'Dead Bug', 'Bird Dog', 'Banded Lateral Walk', 'Scapular Push-up'],
    SKILL: ['Goblet Squat', 'Box Squat', 'Tempo Push-up', 'Assisted Pull-up', 'Hip Hinge Drill'],
    RESISTANCE: ['Dumbbell Variation', 'Cable Variation', 'Machine Variation', 'Bodyweight Variation'],
    'COOL-DOWN': ['Static Stretching', 'Foam Rolling', 'Breathing Drill', 'Easy Bike Cool-down']
  },

  muscle: {
    Chest: ['Machine Chest Press', 'Dumbbell Chest Press', 'Push-up', 'Cable Fly'],
    Back: ['Lat Pulldown', 'Seated Cable Row', 'Single-arm Dumbbell Row', 'Assisted Pull-up'],
    Quads: ['Leg Press', 'Goblet Squat', 'Split Squat', 'Step Up'],
    Hamstrings: ['Romanian Deadlift', 'Hamstring Curl', 'Glute-ham Raise', 'Single-leg RDL'],
    Glutes: ['Hip Thrust', 'Glute Bridge', 'Cable Kickback', 'Banded Lateral Walk'],
    Shoulders: ['Machine Shoulder Press', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Face Pull'],
    Arms: ['Cable Curl', 'Dumbbell Curl', 'Triceps Pushdown', 'Overhead Triceps Extension'],
    Core: ['Plank', 'Dead Bug', 'Cable Crunch', 'Pallof Press'],
    Cardio: ['Treadmill', 'Stationary Bike', 'Elliptical', 'Rowing Machine'],
    'Full Body': ['Goblet Squat', 'Kettlebell Deadlift', 'Step Up', 'Farmer Carry'],
    Mobility: ['World Greatest Stretch', 'Hip Flexor Stretch', 'Thoracic Rotation', 'Ankle Mobility'],
    Other: ['Bodyweight Variation', 'Machine Variation', 'Cable Variation']
  }
};

export function suggestAlternatives(exercise = {}, libraryData = []) {
  const category = exercise.category || 'RESISTANCE';
  const muscleGroup = exercise.muscleGroup || getMuscleGroup(exercise.name) || (category === 'CARDIO' ? 'Cardio' : 'Other');
  const original = (exercise.name || '').trim().toLowerCase();
  const libraryPool = libraryData
    .filter(item => {
      const name = (item.name || '').trim();
      return name && name.toLowerCase() !== original;
    })
    .sort((a,b) => {
      const aCategory = (a.category || 'RESISTANCE') === category ? 0 : 1;
      const bCategory = (b.category || 'RESISTANCE') === category ? 0 : 1;
      const aMuscle = getExerciseMuscle(a) === muscleGroup ? 0 : 1;
      const bMuscle = getExerciseMuscle(b) === muscleGroup ? 0 : 1;
      return aMuscle - bMuscle || aCategory - bCategory || (a.name || '').localeCompare(b.name || '');
    });
  const libraryMatches = libraryPool
    .filter(item => (item.category || 'RESISTANCE') === category || getExerciseMuscle(item) === muscleGroup)

    .map(item => ({

      id: item.id || item.name,

      name: item.name,

      reason: (item.category || category) === category ? `${category} alternative` : `${muscleGroup} alternative`,

      gifUrl: item.gifUrl || '',

      videoUrl: item.videoUrl || ''

    }));

  if (libraryMatches.length) {

    const seen = new Set();

    return libraryMatches.filter(item => {

      const key = item.name.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);

      return true;

    }).slice(0, 2);

  }

  const names = [

    ...(ALTERNATIVE_PRESETS.muscle[muscleGroup] || []),

    ...(ALTERNATIVE_PRESETS.category[category] || [])

  ];

  return [...new Set(names)]

    .filter(name => name.toLowerCase() !== original)

    .slice(0, 2)

    .map((name, idx) => ({

      id: String(idx + 1),

      name,

      reason: category === 'CARDIO' ? 'Cardio option' : `${muscleGroup} alternative`

    }));

}



export function getAlternativeOptions(exercise = {}, currentName = '', libraryData = []) {

  const category = exercise.category || 'RESISTANCE';

  const muscleGroup = exercise.muscleGroup || getMuscleGroup(exercise.name) || (category === 'CARDIO' ? 'Cardio' : 'Other');

  const original = (exercise.name || '').trim().toLowerCase();

  const libraryOptions = libraryData

    .filter(item => (item.name || '').trim() && item.name.toLowerCase() !== original)

    .sort((a,b) => {

      const aMuscle = getExerciseMuscle(a) === muscleGroup ? 0 : 1;

      const bMuscle = getExerciseMuscle(b) === muscleGroup ? 0 : 1;

      const aCategory = (a.category || 'RESISTANCE') === category ? 0 : 1;

      const bCategory = (b.category || 'RESISTANCE') === category ? 0 : 1;

      return aMuscle - bMuscle || aCategory - bCategory || (a.name || '').localeCompare(b.name || '');

    })

    .map(item => ({

      id: item.id || item.name,

      name: item.name,

      reason: (item.category || '') === category ? `${category} alternative` : `${getExerciseMuscle(item)} alternative`,

      gifUrl: item.gifUrl || '',

      videoUrl: item.videoUrl || ''

    }));

  const options = libraryOptions.length ? libraryOptions : suggestAlternatives(exercise, libraryData);

  if (currentName && !options.some(option => option.name === currentName)) {

    return [{ id: 'current', name: currentName, reason: '' }, ...options];

  }

  return options;

}

export function applySuggestedAlternatives(exercise = {}, currentAlternatives = [], libraryData = []) {

  const current = normalizeAlternatives(currentAlternatives);

  const suggested = suggestAlternatives(exercise, libraryData);

  return normalizeAlternatives([

    suggested[0] || current[0],

    suggested[1] || current[1],

    current[2] || { id: '3', name: '', reason: '' }

  ]);
}