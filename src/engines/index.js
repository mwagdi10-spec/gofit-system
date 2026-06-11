// ─── Engines Index ────────────────────────────────────────────────────────
export {
  getPhaseInfo,
  getAllPhases,
  getPhaseProgression,
  getNextPhase,
  getPreviousPhase,
  recommendStartingPhase,
  getPhaseCharacteristics,
  getPrimaryGoal,
  parseRepRange,
  parseIntensityRange,
  parseRestPeriod,
  determineAppropriatePhase,
  shouldTransitionPhase,
  getRecommendedSetsReps,
  getPhaseSpecificTempo,
  calculateVolume,
  estimateOneRepMax,
  getPhaseDuration,
  getPhaseColor,
  nasmEngine
} from './engine-nasm';

export {
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
  calculateSessionVolume,
  exerciseEngine
} from './engine-exercise';

// ─── Hooks Index ─────────────────────────────────────────────────────────
export {
  useBackButton,
  useBackButtonStack,
  useSimpleBackButton
} from './hook-useBackButton';

export {
  useAuth,
  useRequireAuth,
  useRequireRole,
  useIsLoggedIn
} from './hook-useAuth';

export {
  useMetrics,
  useCoachRecommendations,
  useOverloadSuggestion,
  useExerciseStats,
  useMuscleLogs,
  useTodayStats,
  useWeeklyAdherence,
  usePRs
} from './hook-useMetrics';

// ─── Unified Objects ──────────────────────────────────────────────────────
export const engines = {
  nasm: nasmEngine,
  exercise: exerciseEngine
};

export const hooks = {
  useBackButton,
  useAuth,
  useMetrics,
  useRequireAuth,
  useRequireRole,
  useCoachRecommendations,
  useExerciseStats,
  useMuscleLogs,
  useTodayStats,
  useWeeklyAdherence,
  usePRs
};
