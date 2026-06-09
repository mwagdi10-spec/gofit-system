// ─── Exercise Engine ────────────────────────────────────────────────────────
// منطق البدائل والاقتراحات والحسابات المرتبطة بالتمارين

import { ALTERNATIVE_PRESETS, MUSCLE_GROUPS } from '../constants/templates';
import { getMuscleGroup, getFilledAlternatives, makeDefaultAlternatives } from '../utils/helpers';

// ─── Suggest Alternatives ───────────────────────────────────────────────────
export const suggestAlternatives = (exercise = {}, libraryData = []) => {
  const category = exercise.category || 'RESISTANCE';
  const muscleGroup = exercise.muscleGroup || getMuscleGroup(exercise.name) || 'Other';
  const original = (exercise.name || '').trim().toLowerCase();

  // Priority 1: Search library for same muscle/category
  const libraryPool = libraryData
    .filter(item => {
      const name = (item.name || '').trim();
      return name && name.toLowerCase() !== original;
    })
    .sort((a, b) => {
      // Sort by relevance
      const aMuscle = (a.muscleGroup || getMuscleGroup(a.name)) === muscleGroup ? 0 : 1;
      const bMuscle = (b.muscleGroup || getMuscleGroup(b.name)) === muscleGroup ? 0 : 1;
      const aCategory = (a.category || 'RESISTANCE') === category ? 0 : 1;
      const bCategory = (b.category || 'RESISTANCE') === category ? 0 : 1;
      
      return aMuscle - bMuscle || aCategory - bCategory || 
        (a.name || '').localeCompare(b.name || '');
    });

  const libraryMatches = libraryPool
    .filter(item => 
      (item.category || 'RESISTANCE') === category || 
      (item.muscleGroup || getMuscleGroup(item.name)) === muscleGroup
    )
    .map(item => ({
      id: item.id || item.name,
      name: item.name,
      reason: (item.category || category) === category 
        ? `${category} alternative` 
        : `${muscleGroup} alternative`
    }));

  if (libraryMatches.length >= 2) {
    return libraryMatches.slice(0, 2);
  }

  // Priority 2: Use presets
  const presetNames = [
    ...(ALTERNATIVE_PRESETS.muscle[muscleGroup] || []),
    ...(ALTERNATIVE_PRESETS.category[category] || [])
  ];

  return [...new Set(presetNames)]
    .filter(name => name.toLowerCase() !== original)
    .slice(0, 2)
    .map((name, idx) => ({
      id: String(idx + 1),
      name,
      reason: category === 'CARDIO' ? 'Cardio option' : `${muscleGroup} alternative`
    }));
};

// ─── Apply Suggested Alternatives ───────────────────────────────────────────
export const applySuggestedAlternatives = (exercise = {}, currentAlternatives = [], libraryData = []) => {
  const current = getFilledAlternatives(currentAlternatives);
  const suggested = suggestAlternatives(exercise, libraryData);

  return [
    suggested[0] || current[0],
    suggested[1] || current[1],
    current[2] || { id: '3', name: '', reason: '' }
  ];
};

// ─── Get Alternative Options (for dropdown) ──────────────────────────────────
export const getAlternativeOptions = (exercise = {}, currentName = '', libraryData = []) => {
  const category = exercise.category || 'RESISTANCE';
  const muscleGroup = exercise.muscleGroup || getMuscleGroup(exercise.name) || 'Other';
  const original = (exercise.name || '').trim().toLowerCase();

  const libraryOptions = libraryData
    .filter(item => (item.name || '').trim() && item.name.toLowerCase() !== original)
    .sort((a, b) => {
      const aMuscle = (a.muscleGroup || getMuscleGroup(a.name)) === muscleGroup ? 0 : 1;
      const bMuscle = (b.muscleGroup || getMuscleGroup(b.name)) === muscleGroup ? 0 : 1;
      const aCategory = (a.category || 'RESISTANCE') === category ? 0 : 1;
      const bCategory = (b.category || 'RESISTANCE') === category ? 0 : 1;
      
      return aMuscle - bMuscle || aCategory - bCategory || 
        (a.name || '').localeCompare(b.name || '');
    })
    .map(item => ({
      id: item.id || item.name,
      name: item.name,
      reason: (item.category || '') === category 
        ? `${category} alternative` 
        : `${getMuscleGroup(item.name)} alternative`
    }));

  const options = libraryOptions.length ? libraryOptions : suggestAlternatives(exercise, libraryData);

  // Add current name if not in options
  if (currentName && !options.some(option => option.name === currentName)) {
    return [{ id: 'current', name: currentName, reason: '' }, ...options];
  }

  return options;
};

// ─── Check if two exercises are equivalent ───────────────────────────────────
export const areExercisesEquivalent = (exercise1, exercise2) => {
  const muscle1 = exercise1.muscleGroup || getMuscleGroup(exercise1.name);
  const muscle2 = exercise2.muscleGroup || getMuscleGroup(exercise2.name);
  
  const category1 = exercise1.category || 'RESISTANCE';
  const category2 = exercise2.category || 'RESISTANCE';

  return muscle1 === muscle2 && category1 === category2;
};

// ─── Calculate Exercise Difficulty ──────────────────────────────────────────
export const calculateExerciseDifficulty = (exercise = {}) => {
  const category = exercise.category || 'RESISTANCE';
  const repRange = exercise.reps || '10';
  
  const difficultyMap = {
    'WARM-UP': 1,
    'ACTIVATION': 2,
    'SKILL': 3,
    'RESISTANCE': 4,
    'CARDIO': 3,
    'COOL-DOWN': 1
  };

  let difficulty = difficultyMap[category] || 3;

  // Adjust based on reps (lower reps = harder)
  const reps = parseInt(repRange);
  if (reps <= 5) difficulty = Math.min(5, difficulty + 1);
  if (reps >= 15) difficulty = Math.max(1, difficulty - 1);

  return Math.min(5, Math.max(1, difficulty));
};

// ─── Get Exercise Category Info ──────────────────────────────────────────────
export const getCategoryInfo = (category) => {
  const info = {
    'WARM-UP': {
      purpose: 'Prepare the body for exercise',
      focus: 'Mobility & activation',
      duration: '5-10 minutes',
      intensity: 'Light'
    },
    'ACTIVATION': {
      purpose: 'Activate target muscle groups',
      focus: 'Mind-muscle connection',
      duration: '2-3 minutes',
      intensity: 'Light to moderate'
    },
    'SKILL': {
      purpose: 'Learn and practice movement patterns',
      focus: 'Form and technique',
      duration: '5-10 minutes',
      intensity: 'Light to moderate'
    },
    'RESISTANCE': {
      purpose: 'Build strength and muscle',
      focus: 'Progressive overload',
      duration: 'Varies',
      intensity: 'Moderate to high'
    },
    'CARDIO': {
      purpose: 'Improve cardiovascular fitness',
      focus: 'Heart rate and endurance',
      duration: '10-30 minutes',
      intensity: 'Moderate to high'
    },
    'COOL-DOWN': {
      purpose: 'Recovery and flexibility',
      focus: 'Static stretching and relaxation',
      duration: '5-10 minutes',
      intensity: 'Light'
    }
  };

  return info[category] || info['RESISTANCE'];
};

// ─── Get Exercise Variations ────────────────────────────────────────────────
export const getExerciseVariations = (exercise = {}, libraryData = []) => {
  const muscleGroup = exercise.muscleGroup || getMuscleGroup(exercise.name);
  
  if (!muscleGroup) return [];

  return libraryData.filter(item => {
    const itemMuscle = item.muscleGroup || getMuscleGroup(item.name);
    return itemMuscle === muscleGroup && 
           item.name.toLowerCase() !== (exercise.name || '').toLowerCase();
  });
};

// ─── Check if Exercise Needs Alternatives ───────────────────────────────────
export const needsAlternatives = (exercise = {}) => {
  const alternatives = getFilledAlternatives(exercise.alternatives || []);
  return alternatives.length < 1; // Should have at least 1 alternative
};

// ─── Normalize Exercise Data ────────────────────────────────────────────────
export const normalizeExercise = (exercise = {}, libraryData = []) => {
  const normalized = {
    ...exercise,
    muscleGroup: exercise.muscleGroup || getMuscleGroup(exercise.name) || 'Other',
    category: exercise.category || 'RESISTANCE',
    sets: exercise.sets || '3',
    reps: exercise.reps || '10',
    tempo: exercise.tempo || '',
    alternatives: getFilledAlternatives(exercise.alternatives || [])
  };

  // Auto-fill alternatives if missing
  if (normalized.alternatives.length === 0) {
    normalized.alternatives = suggestAlternatives(normalized, libraryData);
  }

  return normalized;
};

// ─── Get Recommended Recovery Time ──────────────────────────────────────────
export const getRecommendedRecovery = (muscleGroup) => {
  const recoveryMap = {
    'Chest': '48-72 hours',
    'Back': '48-72 hours',
    'Quads': '48-72 hours',
    'Hamstrings': '48-72 hours',
    'Glutes': '48-72 hours',
    'Shoulders': '48 hours',
    'Arms': '24-48 hours',
    'Core': '24-48 hours',
    'Cardio': '24 hours',
    'Calves': '24-48 hours'
  };

  return recoveryMap[muscleGroup] || '48 hours';
};

// ─── Check Exercise Compatibility ───────────────────────────────────────────
export const checkExerciseCompatibility = (newExercise, existingExercises = []) => {
  const newMuscle = newExercise.muscleGroup || getMuscleGroup(newExercise.name);
  
  const muscleGroups = existingExercises.map(ex => 
    ex.muscleGroup || getMuscleGroup(ex.name)
  );

  const muscleCount = muscleGroups.filter(m => m === newMuscle).length;

  return {
    compatible: true,
    muscleCount,
    warning: muscleCount > 3 ? `Already have ${muscleCount} exercises for ${newMuscle}` : null
  };
};

// ─── Calculate Total Volume ────────────────────────────────────────────────
export const calculateSessionVolume = (exercises = [], logs = []) => {
  let totalVolume = 0;
  let totalSets = 0;

  logs.forEach(log => {
    const setsCount = log.setsData?.length || 0;
    totalSets += setsCount;

    log.setsData?.forEach(set => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseFloat(set.reps) || 0;
      totalVolume += weight * reps;
    });
  });

  return {
    totalVolume,
    totalSets,
    averageVolumePerExercise: logs.length > 0 ? totalVolume / logs.length : 0,
    averageSetsPerExercise: logs.length > 0 ? totalSets / logs.length : 0
  };
};

// ─── Export all functions ───────────────────────────────────────────────────
export const exerciseEngine = {
  suggestAlternatives,
  applySuggestedAlternatives,
  getAlternativeOptions,
  areExercisesEquivalent,
  calculateExerciseDifficulty,
  getCategoryInfo,
  getExerciseVariations,
  needsAlternatives,
  normalizeExercise,
  getRecommendedRecovery,
  checkExerciseCompatibility,
  calculateSessionVolume
};

export default exerciseEngine;
