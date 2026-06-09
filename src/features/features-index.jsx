// ─── Phase 5 Features Index ────────────────────────────────────
// تصدير جميع مكونات Phase 5

export { default as ClientSelector } from './ClientSelector';
export { default as ClientProfileModal } from './ClientProfileModal';
export { default as ExerciseRow } from './ExerciseRow';
export { default as ExerciseLibrary } from './ExerciseLibrary';
export { default as DayBuilder } from './DayBuilder';
export { default as App } from './App';
export { default as useApp } from './useApp';

// ─── Features Object ────────────────────────────────────────────
export const features = {
  clients: {
    ClientSelector,
    ClientProfileModal
  },
  workouts: {
    ExerciseRow,
    DayBuilder
  },
  exercises: {
    ExerciseLibrary
  },
  app: {
    App,
    useApp
  }
};

export default features;
