// ─── offlineDB.js ─────────────────────────────────────────────────────────────
// IndexedDB layer for GoFit PWA
// Stores: client workouts (read cache) + pending logs (write queue)
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME    = 'gofit-offline';
const DB_VERSION = 1;

// Store names
const STORES = {
  WORKOUTS:     'workouts',      // client's assigned exercises (cached from Firebase)
  PENDING_LOGS: 'pending_logs',  // logs saved offline, waiting to sync
  LOGS:         'logs',          // cached logs for display
};

// ─── Open DB ─────────────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Workouts store — keyed by Firestore doc id
      if (!db.objectStoreNames.contains(STORES.WORKOUTS)) {
        const ws = db.createObjectStore(STORES.WORKOUTS, { keyPath: 'id' });
        ws.createIndex('assignedTo', 'assignedTo', { unique: false });
      }

      // Pending logs — keyed by local temp id
      if (!db.objectStoreNames.contains(STORES.PENDING_LOGS)) {
        db.createObjectStore(STORES.PENDING_LOGS, {
          keyPath: 'localId',
          autoIncrement: true,
        });
      }

      // Logs cache
      if (!db.objectStoreNames.contains(STORES.LOGS)) {
        const ls = db.createObjectStore(STORES.LOGS, { keyPath: 'id' });
        ls.createIndex('clientName', 'clientName', { unique: false });
      }
    };

    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

// ─── Generic helpers ──────────────────────────────────────────────────────────
async function dbGet(storeName, key) {
  const db  = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGetAllByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly');
    const index = tx.objectStore(storeName).index(indexName);
    const req   = index.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbPut(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function dbClear(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ─── Workouts Cache ───────────────────────────────────────────────────────────

/** Cache all workouts for a specific client */
export async function cacheClientWorkouts(identifier, workouts) {
  try {
    // Clear old workouts for this client
    const existing = await dbGetAllByIndex(STORES.WORKOUTS, 'assignedTo', identifier);
    for (const w of existing) await dbDelete(STORES.WORKOUTS, w.id);

    // Save new ones
    for (const w of workouts) await dbPut(STORES.WORKOUTS, w);
    console.log(`[GoFit Offline] Cached ${workouts.length} workouts for ${identifier}`);
  } catch (err) {
    console.warn('[GoFit Offline] Failed to cache workouts:', err);
  }
}

/** Get cached workouts for a client (used when offline) */
export async function getCachedWorkouts(identifier) {
  try {
    return await dbGetAllByIndex(STORES.WORKOUTS, 'assignedTo', identifier);
  } catch {
    return [];
  }
}

// ─── Logs Cache ───────────────────────────────────────────────────────────────

/** Cache logs for a client */
export async function cacheLogs(logs) {
  try {
    for (const log of logs) await dbPut(STORES.LOGS, log);
  } catch (err) {
    console.warn('[GoFit Offline] Failed to cache logs:', err);
  }
}

/** Get cached logs for a client */
export async function getCachedLogs(identifier) {
  try {
    return await dbGetAllByIndex(STORES.LOGS, 'clientName', identifier);
  } catch {
    return [];
  }
}

// ─── Pending Logs (Offline Queue) ─────────────────────────────────────────────

/**
 * Save a workout log locally when offline.
 * Will be synced to Firebase when connection is restored.
 */
export async function savePendingLog(logData) {
  try {
    const pending = {
      ...logData,
      savedAt: new Date().toISOString(),
      synced: false,
    };
    const id = await dbPut(STORES.PENDING_LOGS, pending);
    console.log('[GoFit Offline] Log saved locally, id:', id);
    return id;
  } catch (err) {
    console.warn('[GoFit Offline] Failed to save pending log:', err);
    throw err;
  }
}

/** Get all pending (unsynced) logs */
export async function getPendingLogs() {
  try {
    const all = await dbGetAll(STORES.PENDING_LOGS);
    return all.filter(l => !l.synced);
  } catch {
    return [];
  }
}

/** Mark a pending log as synced (delete it from queue) */
export async function deletePendingLog(localId) {
  try {
    await dbDelete(STORES.PENDING_LOGS, localId);
  } catch (err) {
    console.warn('[GoFit Offline] Failed to delete pending log:', err);
  }
}

/** Count pending logs (for UI badge) */
export async function getPendingCount() {
  try {
    const pending = await getPendingLogs();
    return pending.length;
  } catch {
    return 0;
  }
}
