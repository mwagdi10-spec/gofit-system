export function separateExerciseTypes(exercises) {
  return {
    standard: exercises.filter(e => e.type !== 'staticStretch'),
    staticStretches: exercises.filter(e => e.type === 'staticStretch'),
  };
}

export function formatProgramToWeekBased(days) {
  const weeks = [[], [], [], []];
  days.forEach((day, idx) => {
    const weekIdx = Math.floor(idx / 7) % 4;
    weeks[weekIdx].push({ 
      ...day, 
      weekNumber: weekIdx + 1,
      dayInWeek: (idx % 7) + 1 
    });
  });
  return weeks.map((daysInWeek, idx) => ({
    weekNumber: idx + 1,
    days: daysInWeek
  }));
}

export function getWeeksFromProgram(programWeeks) {
  return Array.isArray(programWeeks) 
    ? programWeeks.sort((a, b) => a.weekNumber - b.weekNumber)
    : [];
}

export function validateExerciseProgress(exercise, exerciseLog) {
  if (exercise.type === 'staticStretch') {
    return { valid: true, requiresWeight: false };
  }
  return { 
    valid: exerciseLog.reps > 0 && exerciseLog.sets > 0,
    requiresWeight: true
  };
}

export function calculateVolumeMetric(exercises) {
  // Volume = weight × reps × sets (حساب الحجم التدريبي)
  return exercises.reduce((total, ex) => {
    if (ex.type === 'staticStretch') return total;
    const volume = (ex.weight || 0) * (ex.reps || 0) * (ex.sets || 0);
    return total + volume;
  }, 0);
}

export function filterProgressData(progressLogs) {
  // استبعد Static Stretches من بيانات التقدم
  return progressLogs.filter(log => log.type !== 'staticStretch');
}

export function groupExercisesByMuscleGroup(exercises) {
  return exercises.reduce((acc, ex) => {
    const group = ex.muscleGroup || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {});
}

export function calculateConsistency(completedDays, plannedDays, period = 'week') {
  if (plannedDays === 0) return 0;
  return Math.round((completedDays / plannedDays) * 100);
}

export function reorderExercises(exercises, exerciseId, direction) {
  // direction: 'up' أو 'down'
  const idx = exercises.findIndex(ex => ex.id === exerciseId);
  if (idx === -1) return exercises;
  
  const newIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= exercises.length) return exercises;
  
  const newExercises = [...exercises];
  [newExercises[idx], newExercises[newIdx]] = [newExercises[newIdx], newExercises[idx]];
  return newExercises;
}

export function getExerciseAlternatives(exercise, allExercises) {
  // alternatives من نفس muscle group إلا إذا كان override
  if (exercise.manualAlternatives?.length) {
    return exercise.manualAlternatives;
  }
  return allExercises.filter(
    ex => ex.id !== exercise.id && ex.muscleGroup === exercise.muscleGroup
  );
}