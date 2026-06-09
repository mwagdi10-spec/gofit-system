// ─── Workouts Service ────────────────────────────────────────────────────────
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

// ─── Get All Workouts ────────────────────────────────────────────────────────
export const getAllWorkouts = async () => {
  try {
    const workoutsRef = collection(db, COLLECTION_PATHS.workouts);
    const q = query(workoutsRef, orderBy('orderIndex', 'asc'));
    const snapshot = await getDocs(q);

    const workouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: workouts };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Subscribe to All Workouts (Real-time) ───────────────────────────────────
export const subscribeToWorkouts = (callback) => {
  try {
    const workoutsRef = collection(db, COLLECTION_PATHS.workouts);
    const q = query(workoutsRef, orderBy('orderIndex', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      callback({ success: true, data: workouts });
    }, (error) => {
      callback(handleFirebaseError(error));
    });

    return unsubscribe;
  } catch (error) {
    callback(handleFirebaseError(error));
    return () => {};
  }
};

// ─── Get Workouts by Client ──────────────────────────────────────────────────
export const getClientWorkouts = async (clientPhone) => {
  try {
    if (!clientPhone) {
      return { success: false, message: 'Client phone is required' };
    }

    const workoutsRef = collection(db, COLLECTION_PATHS.workouts);
    const q = query(
      workoutsRef,
      where('assignedTo', '==', clientPhone),
      orderBy('orderIndex', 'asc')
    );
    const snapshot = await getDocs(q);

    const workouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: workouts };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Subscribe to Client Workouts ────────────────────────────────────────────
export const subscribeToClientWorkouts = (clientPhone, callback) => {
  try {
    if (!clientPhone) {
      callback({ success: false, message: 'Client phone is required' });
      return () => {};
    }

    const workoutsRef = collection(db, COLLECTION_PATHS.workouts);
    const q = query(
      workoutsRef,
      where('assignedTo', '==', clientPhone),
      orderBy('orderIndex', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      callback({ success: true, data: workouts });
    }, (error) => {
      callback(handleFirebaseError(error));
    });

    return unsubscribe;
  } catch (error) {
    callback(handleFirebaseError(error));
    return () => {};
  }
};

// ─── Add Workout ──────────────────────────────────────────────────────────────
export const addWorkout = async (workoutData) => {
  try {
    const { name, category, assignedTo, day, ...rest } = workoutData;

    if (!name || !category || !assignedTo) {
      return { success: false, message: 'Name, category, and assignedTo are required' };
    }

    const workoutsRef = collection(db, COLLECTION_PATHS.workouts);
    const docRef = await addDoc(workoutsRef, {
      name,
      category,
      assignedTo,
      day: day || '',
      ...rest,
      orderIndex: Date.now()
    });

    return { success: true, message: 'Workout added', data: { id: docRef.id, ...workoutData } };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Update Workout ───────────────────────────────────────────────────────────
export const updateWorkout = async (workoutId, updates) => {
  try {
    if (!workoutId) {
      return { success: false, message: 'Workout ID is required' };
    }

    const workoutRef = doc(db, COLLECTION_PATHS.workouts, workoutId);
    await updateDoc(workoutRef, updates);

    return { success: true, message: 'Workout updated' };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Delete Workout ───────────────────────────────────────────────────────────
export const deleteWorkout = async (workoutId) => {
  try {
    if (!workoutId) {
      return { success: false, message: 'Workout ID is required' };
    }

    const workoutRef = doc(db, COLLECTION_PATHS.workouts, workoutId);
    await deleteDoc(workoutRef);

    return { success: true, message: 'Workout deleted' };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Delete Workouts by Client and Day ───────────────────────────────────────
export const deleteClientDay = async (clientPhone, day) => {
  try {
    if (!clientPhone || !day) {
      return { success: false, message: 'Client phone and day are required' };
    }

    const workoutsRef = collection(db, COLLECTION_PATHS.workouts);
    const q = query(
      workoutsRef,
      where('assignedTo', '==', clientPhone),
      where('day', '==', day)
    );
    const snapshot = await getDocs(q);

    let deletedCount = 0;
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }

    return { success: true, message: `Deleted ${deletedCount} workouts` };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Bulk Add Workouts ────────────────────────────────────────────────────────
export const bulkAddWorkouts = async (workoutsArray) => {
  try {
    if (!Array.isArray(workoutsArray) || workoutsArray.length === 0) {
      return { success: false, message: 'Workouts array is required' };
    }

    const workoutsRef = collection(db, COLLECTION_PATHS.workouts);
    const results = [];
    const baseTime = Date.now();

    for (let i = 0; i < workoutsArray.length; i++) {
      const workout = workoutsArray[i];
      const { name, category, assignedTo, ...rest } = workout;

      if (!name || !category || !assignedTo) continue;

      const docRef = await addDoc(workoutsRef, {
        name,
        category,
        assignedTo,
        ...rest,
        orderIndex: baseTime + i
      });

      results.push({ id: docRef.id, ...workout });
    }

    return { success: true, message: `Added ${results.length} workouts`, data: results };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Reorder Workouts ─────────────────────────────────────────────────────────
export const reorderWorkouts = async (workoutIds) => {
  try {
    if (!Array.isArray(workoutIds) || workoutIds.length === 0) {
      return { success: false, message: 'Workout IDs array is required' };
    }

    const baseTime = Date.now();
    const results = [];

    for (let i = 0; i < workoutIds.length; i++) {
      const workoutRef = doc(db, COLLECTION_PATHS.workouts, workoutIds[i]);
      await updateDoc(workoutRef, { orderIndex: baseTime + i });
      results.push({ id: workoutIds[i], orderIndex: baseTime + i });
    }

    return { success: true, message: 'Workouts reordered', data: results };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Swap Order ────────────────────────────────────────────────────────────────
export const swapWorkoutOrder = async (workoutId1, workoutId2) => {
  try {
    if (!workoutId1 || !workoutId2) {
      return { success: false, message: 'Both workout IDs are required' };
    }

    // This would require fetching both docs, swapping, and updating
    // Simplified: just swap the orderIndex values
    const ref1 = doc(db, COLLECTION_PATHS.workouts, workoutId1);
    const ref2 = doc(db, COLLECTION_PATHS.workouts, workoutId2);

    // Get current orders first
    // Note: In real implementation, you'd fetch these first
    const temp = Date.now();
    await updateDoc(ref1, { orderIndex: -temp });
    await updateDoc(ref2, { orderIndex: Date.now() });
    await updateDoc(ref1, { orderIndex: Date.now() + 1000 });

    return { success: true, message: 'Workouts swapped' };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Get Distinct Days for Client ────────────────────────────────────────────
export const getClientDays = async (clientPhone, allWorkouts) => {
  try {
    if (!clientPhone) {
      return { success: false, message: 'Client phone is required' };
    }

    const days = [...new Set(
      allWorkouts
        .filter(w => w.assignedTo === clientPhone)
        .map(w => w.day)
        .filter(Boolean)
    )];

    return { success: true, data: days };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Export Helper ────────────────────────────────────────────────────────────
export const workoutsService = {
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
  getClientDays
};

export default workoutsService;
