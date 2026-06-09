// ─── Firebase Services Index ────────────────────────────────────────────────
// Export all Firebase services and utilities from a single entry point

export {
  app,
  auth,
  db,
  APP_ID,
  TRAINER_MAIL,
  COLLECTION_PATHS,
  initializeAuth,
  getCollectionPath,
  handleFirebaseError
} from './firebase-config';

export {
  getAllClients,
  subscribeToClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  updateClientPhase,
  updateClientGoal,
  bulkUpdateClients,
  searchClients,
  getClientsByGoal,
  getClientsByLevel,
  clientsService
} from './firebase-clients';

export {
  getAllWorkouts,
  subscribeToWorkouts,
  getClientWorkouts,
  subscribeToClientWorkouts,
  addWorkout,
  updateWorkout,
  deleteWorkout,
  deleteClientDay,
  bulkAddWorkouts,
  reorderWorkouts,
  swapWorkoutOrder,
  getClientDays,
  workoutsService
} from './firebase-workouts';

export {
  getAllExercises,
  subscribeToExercises,
  getExercise,
  addExercise,
  updateExercise,
  deleteExercise,
  getExercisesByCategory,
  getExercisesByMuscle,
  searchExercises,
  getExercisesWithGif,
  bulkAddExercises,
  getExerciseCount,
  exercisesService
} from './firebase-exercises';

export {
  getAllLogs,
  subscribeToRecentLogs,
  getClientLogs,
  subscribeToClientLogs,
  getLogsByDateRange,
  addLog,
  updateLog,
  deleteLog,
  deleteLogsByDate,
  deleteLogsByExerciseAndDate,
  bulkAddLogs,
  getLatestExerciseLog,
  getPRs,
  logsService
} from './firebase-logs';

// ─── Unified Services Object ───────────────────────────────────────────────
export const firebaseServices = {
  clients: clientsService,
  workouts: workoutsService,
  exercises: exercisesService,
  logs: logsService
};

export default firebaseServices;
