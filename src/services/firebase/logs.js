// ─── Logs Service ───────────────────────────────────────────────────────────
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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTION_PATHS, handleFirebaseError } from './firebase-config';

// ─── Get All Logs ────────────────────────────────────────────────────────────
export const getAllLogs = async () => {
  try {
    const logsRef = collection(db, COLLECTION_PATHS.logs);
    const q = query(logsRef, orderBy('completedAt', 'desc'));
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: logs };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Subscribe to Logs (Last 20 days) ─────────────────────────────────────────
export const subscribeToRecentLogs = (callback) => {
  try {
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const logsRef = collection(db, COLLECTION_PATHS.logs);
    const q = query(
      logsRef,
      where('completedAt', '>=', Timestamp.fromDate(twentyDaysAgo)),
      orderBy('completedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      callback({ success: true, data: logs });
    }, (error) => {
      callback(handleFirebaseError(error));
    });

    return unsubscribe;
  } catch (error) {
    callback(handleFirebaseError(error));
    return () => {};
  }
};

// ─── Get Client Logs ──────────────────────────────────────────────────────────
export const getClientLogs = async (clientPhone) => {
  try {
    if (!clientPhone) {
      return { success: false, message: 'Client phone is required' };
    }

    const logsRef = collection(db, COLLECTION_PATHS.logs);
    const q = query(
      logsRef,
      where('clientName', '==', clientPhone),
      orderBy('completedAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: logs };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Subscribe to Client Logs ─────────────────────────────────────────────────
export const subscribeToClientLogs = (clientPhone, callback) => {
  try {
    if (!clientPhone) {
      callback({ success: false, message: 'Client phone is required' });
      return () => {};
    }

    const logsRef = collection(db, COLLECTION_PATHS.logs);
    const q = query(
      logsRef,
      where('clientName', '==', clientPhone),
      orderBy('completedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      callback({ success: true, data: logs });
    }, (error) => {
      callback(handleFirebaseError(error));
    });

    return unsubscribe;
  } catch (error) {
    callback(handleFirebaseError(error));
    return () => {};
  }
};

// ─── Get Logs by Date Range ───────────────────────────────────────────────────
export const getLogsByDateRange = async (clientPhone, startDate, endDate) => {
  try {
    if (!clientPhone || !startDate || !endDate) {
      return { success: false, message: 'Client phone and date range are required' };
    }

    const logsRef = collection(db, COLLECTION_PATHS.logs);
    const q = query(
      logsRef,
      where('clientName', '==', clientPhone),
      where('completedAt', '>=', Timestamp.fromDate(startDate)),
      where('completedAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('completedAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: logs };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Add Log ──────────────────────────────────────────────────────────────────
export const addLog = async (logData) => {
  try {
    const { clientName, exerciseName, ...rest } = logData;

    if (!clientName || !exerciseName) {
      return { success: false, message: 'Client name and exercise name are required' };
    }

    const logsRef = collection(db, COLLECTION_PATHS.logs);
    const docRef = await addDoc(logsRef, {
      clientName,
      exerciseName,
      ...rest,
      completedAt: rest.completedAt || serverTimestamp()
    });

    return { success: true, message: 'Log added', data: { id: docRef.id, ...logData } };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Update Log ────────────────────────────────────────────────────────────────
export const updateLog = async (logId, updates) => {
  try {
    if (!logId) {
      return { success: false, message: 'Log ID is required' };
    }

    const logRef = doc(db, COLLECTION_PATHS.logs, logId);
    await updateDoc(logRef, updates);

    return { success: true, message: 'Log updated' };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Delete Log ────────────────────────────────────────────────────────────────
export const deleteLog = async (logId) => {
  try {
    if (!logId) {
      return { success: false, message: 'Log ID is required' };
    }

    const logRef = doc(db, COLLECTION_PATHS.logs, logId);
    await deleteDoc(logRef);

    return { success: true, message: 'Log deleted' };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Delete Logs by Date ───────────────────────────────────────────────────────
export const deleteLogsByDate = async (date, clientPhone = null) => {
  try {
    if (!date) {
      return { success: false, message: 'Date is required' };
    }

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const startOfDay = Timestamp.fromDate(
      new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())
    );
    const startOfNextDay = Timestamp.fromDate(
      new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1)
    );

    const logsRef = collection(db, COLLECTION_PATHS.logs);
    let q;

    if (clientPhone) {
      q = query(
        logsRef,
        where('clientName', '==', clientPhone),
        where('completedAt', '>=', startOfDay),
        where('completedAt', '<', startOfNextDay)
      );
    } else {
      q = query(
        logsRef,
        where('completedAt', '>=', startOfDay),
        where('completedAt', '<', startOfNextDay)
      );
    }

    const snapshot = await getDocs(q);
    let deletedCount = 0;

    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }

    return { success: true, message: `Deleted ${deletedCount} logs` };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Delete Logs by Exercise and Date ──────────────────────────────────────────
export const deleteLogsByExerciseAndDate = async (exerciseName, date, clientPhone) => {
  try {
    if (!exerciseName || !date || !clientPhone) {
      return { success: false, message: 'Exercise name, date, and client phone are required' };
    }

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const startOfDay = Timestamp.fromDate(
      new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())
    );
    const startOfNextDay = Timestamp.fromDate(
      new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1)
    );

    const logsRef = collection(db, COLLECTION_PATHS.logs);
    const q = query(
      logsRef,
      where('exerciseName', '==', exerciseName),
      where('clientName', '==', clientPhone),
      where('completedAt', '>=', startOfDay),
      where('completedAt', '<', startOfNextDay)
    );

    const snapshot = await getDocs(q);
    let deletedCount = 0;

    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }

    return { success: true, message: `Deleted ${deletedCount} logs` };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Bulk Add Logs ────────────────────────────────────────────────────────────
export const bulkAddLogs = async (logsArray) => {
  try {
    if (!Array.isArray(logsArray) || logsArray.length === 0) {
      return { success: false, message: 'Logs array is required' };
    }

    const logsRef = collection(db, COLLECTION_PATHS.logs);
    const results = [];

    for (const log of logsArray) {
      const { clientName, exerciseName, ...rest } = log;

      if (!clientName || !exerciseName) continue;

      const docRef = await addDoc(logsRef, {
        clientName,
        exerciseName,
        ...rest,
        completedAt: rest.completedAt || serverTimestamp()
      });

      results.push({ id: docRef.id, ...log });
    }

    return { success: true, message: `Added ${results.length} logs`, data: results };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Get Latest Log for Exercise ───────────────────────────────────────────────
export const getLatestExerciseLog = async (clientPhone, exerciseId) => {
  try {
    if (!clientPhone || !exerciseId) {
      return { success: false, message: 'Client phone and exercise ID are required' };
    }

    const logsRef = collection(db, COLLECTION_PATHS.logs);
    const q = query(
      logsRef,
      where('clientName', '==', clientPhone),
      where('exerciseId', '==', exerciseId),
      orderBy('completedAt', 'desc')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, message: 'No logs found' };
    }

    const data = snapshot.docs[0].data();
    return { success: true, data: { id: snapshot.docs[0].id, ...data } };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Get PRs (Personal Records) ────────────────────────────────────────────────
export const getPRs = async (clientPhone, allLogs) => {
  try {
    if (!clientPhone) {
      return { success: false, message: 'Client phone is required' };
    }

    const prs = allLogs.filter(log => log.clientName === clientPhone && log.isPR);
    return { success: true, data: prs };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Export Helper ────────────────────────────────────────────────────────────
export const logsService = {
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
  getPRs
};

export default logsService;
