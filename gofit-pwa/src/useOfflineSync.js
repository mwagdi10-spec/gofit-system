// ─── useOfflineSync.js ────────────────────────────────────────────────────────
// React hook: detects online/offline state + syncs pending logs to Firebase
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  getPendingLogs,
  deletePendingLog,
  getPendingCount,
} from './offlineDB';

export function useOfflineSync(db, appId) {
  const [isOnline, setIsOnline]         = useState(navigator.onLine);
  const [isSyncing, setIsSyncing]       = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncedRef = useRef(false);

  // ── Update pending count ──────────────────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // ── Sync pending logs to Firebase ─────────────────────────────────────────
  const syncPendingLogs = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    const pending = await getPendingLogs();
    if (!pending.length) return;

    setIsSyncing(true);
    console.log(`[GoFit Sync] Syncing ${pending.length} offline logs...`);

    let synced = 0;
    for (const log of pending) {
      try {
        const { localId, savedAt, synced: _, ...firebaseData } = log;

        // Convert ISO string back to Firebase timestamp-compatible object
        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', 'logs'),
          {
            ...firebaseData,
            completedAt: serverTimestamp(), // use server time on sync
            syncedFromOffline: true,
            originalSavedAt: savedAt,
          }
        );

        await deletePendingLog(localId);
        synced++;
      } catch (err) {
        console.warn('[GoFit Sync] Failed to sync log:', err);
      }
    }

    console.log(`[GoFit Sync] ✅ Synced ${synced}/${pending.length} logs`);
    setIsSyncing(false);
    await refreshPendingCount();
  }, [db, appId, isSyncing, refreshPendingCount]);

  // ── Online/Offline listeners ──────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      syncedRef.current = false;
      // Small delay to ensure connection is stable
      setTimeout(() => syncPendingLogs(), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync on mount if already online and has pending
    if (navigator.onLine) {
      refreshPendingCount().then(() => syncPendingLogs());
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingLogs, refreshPendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncPendingLogs,
    refreshPendingCount,
  };
}
