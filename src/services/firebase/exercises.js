// ─── Exercises Service ───────────────────────────────────────────────────────
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, COLLECTION_PATHS, handleFirebaseError } from './firebase-config';

// ─── Get All Exercises ───────────────────────────────────────────────────────
export const getAllExercises = async () => {
  try {
    const exercisesRef = collection(db, COLLECTION_PATHS.exercises);
    const snapshot = await getDocs(exercisesRef);

    const exercises = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: exercises };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Subscribe to All Exercises (Real-time) ──────────────────────────────────
export const subscribeToExercises = (callback) => {
  try {
    const exercisesRef = collection(db, COLLECTION_PATHS.exercises);

    const unsubscribe = onSnapshot(exercisesRef, (snapshot) => {
      const exercises = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      callback({ success: true, data: exercises });
    }, (error) => {
      callback(handleFirebaseError(error));
    });

    return unsubscribe;
  } catch (error) {
    callback(handleFirebaseError(error));
    return () => {};
  }
};

// ─── Get Exercise by ID ───────────────────────────────────────────────────────
export const getExercise = async (exerciseId) => {
  try {
    if (!exerciseId) {
      return { success: false, message: 'Exercise ID is required' };
    }

    const exerciseRef = doc(db, COLLECTION_PATHS.exercises, exerciseId);
    const snapshot = await getDocs(query(collection(db, COLLECTION_PATHS.exercises), where('id', '==', exerciseId)));

    if (snapshot.empty) {
      return { success: false, message: 'Exercise not found' };
    }

    const data = snapshot.docs[0].data();
    return { success: true, data: { id: snapshot.docs[0].id, ...data } };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Add Exercise ────────────────────────────────────────────────────────────
export const addExercise = async (exerciseData) => {
  try {
    const { name, category, ...rest } = exerciseData;

    if (!name || !category) {
      return { success: false, message: 'Name and category are required' };
    }

    const exercisesRef = collection(db, COLLECTION_PATHS.exercises);
    const docRef = await addDoc(exercisesRef, {
      name,
      category,
      ...rest,
      createdAt: serverTimestamp()
    });

    return { success: true, message: 'Exercise added', data: { id: docRef.id, ...exerciseData } };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Update Exercise ──────────────────────────────────────────────────────────
export const updateExercise = async (exerciseId, updates) => {
  try {
    if (!exerciseId) {
      return { success: false, message: 'Exercise ID is required' };
    }

    const exerciseRef = doc(db, COLLECTION_PATHS.exercises, exerciseId);
    await updateDoc(exerciseRef, updates);

    return { success: true, message: 'Exercise updated' };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Delete Exercise ──────────────────────────────────────────────────────────
export const deleteExercise = async (exerciseId) => {
  try {
    if (!exerciseId) {
      return { success: false, message: 'Exercise ID is required' };
    }

    const exerciseRef = doc(db, COLLECTION_PATHS.exercises, exerciseId);
    await deleteDoc(exerciseRef);

    return { success: true, message: 'Exercise deleted' };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Filter Exercises by Category ─────────────────────────────────────────────
export const getExercisesByCategory = async (category, allExercises) => {
  try {
    if (!category || !allExercises) {
      return { success: true, data: [] };
    }

    const filtered = allExercises.filter(ex => ex.category === category);
    return { success: true, data: filtered };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Filter Exercises by Muscle Group ─────────────────────────────────────────
export const getExercisesByMuscle = async (muscleGroup, allExercises) => {
  try {
    if (!muscleGroup || !allExercises) {
      return { success: true, data: [] };
    }

    const filtered = allExercises.filter(ex => ex.muscleGroup === muscleGroup);
    return { success: true, data: filtered };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Search Exercises ─────────────────────────────────────────────────────────
export const searchExercises = async (searchTerm, allExercises) => {
  try {
    if (!searchTerm || !allExercises) {
      return { success: true, data: allExercises || [] };
    }

    const lowerSearch = searchTerm.toLowerCase();
    const filtered = allExercises.filter(ex =>
      ex.name?.toLowerCase().includes(lowerSearch) ||
      ex.category?.toLowerCase().includes(lowerSearch) ||
      ex.muscleGroup?.toLowerCase().includes(lowerSearch)
    );

    return { success: true, data: filtered };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Get Exercises with GIF ────────────────────────────────────────────────────
export const getExercisesWithGif = async (allExercises) => {
  try {
    if (!allExercises) {
      return { success: true, data: [] };
    }

    const filtered = allExercises.filter(ex => ex.gifUrl && ex.gifUrl.trim());
    return { success: true, data: filtered };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Bulk Add Exercises ────────────────────────────────────────────────────────
export const bulkAddExercises = async (exercisesArray) => {
  try {
    if (!Array.isArray(exercisesArray) || exercisesArray.length === 0) {
      return { success: false, message: 'Exercises array is required' };
    }

    const exercisesRef = collection(db, COLLECTION_PATHS.exercises);
    const results = [];

    for (const exercise of exercisesArray) {
      const { name, category, ...rest } = exercise;

      if (!name || !category) continue;

      const docRef = await addDoc(exercisesRef, {
        name,
        category,
        ...rest,
        createdAt: serverTimestamp()
      });

      results.push({ id: docRef.id, ...exercise });
    }

    return { success: true, message: `Added ${results.length} exercises`, data: results };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Get Exercise Count ────────────────────────────────────────────────────────
export const getExerciseCount = async (allExercises) => {
  try {
    return {
      success: true,
      data: {
        total: allExercises?.length || 0,
        byCategory: groupExercisesByCategory(allExercises || []),
        byMuscle: groupExercisesByMuscle(allExercises || [])
      }
    };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Helper: Group by Category ─────────────────────────────────────────────────
const groupExercisesByCategory = (exercises) => {
  return exercises.reduce((acc, ex) => {
    const cat = ex.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
};

// ─── Helper: Group by Muscle ──────────────────────────────────────────────────
const groupExercisesByMuscle = (exercises) => {
  return exercises.reduce((acc, ex) => {
    const muscle = ex.muscleGroup || 'Other';
    acc[muscle] = (acc[muscle] || 0) + 1;
    return acc;
  }, {});
};

// ─── Export Helper ────────────────────────────────────────────────────────────
export const exercisesService = {
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
  getExerciseCount
};

export default exercisesService;
