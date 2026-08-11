import { useState, useEffect } from 'react';
import {
  collection, doc, onSnapshot, query,
  where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';

export function useClientData(identifier) {
  const [workouts,    setWorkouts]    = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [sessions,    setSessions]    = useState([]);
  const [clientInfo,  setClientInfo]  = useState(null);
  const [library,     setLibrary]     = useState([]);
  const [checkIns,    setCheckIns]    = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!identifier) return;

    // ── 1. Client profile ──────────────────────────────────────
    const u0 = onSnapshot(
      doc(db, 'artifacts', APP_ID, 'public', 'data', 'client_names', identifier),
      snap => setClientInfo(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    );

    // ── 2. Assigned workouts ───────────────────────────────────
    const u1 = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'workouts'),
        where('assignedTo', '==', identifier),
        orderBy('orderIndex', 'asc')
      ),
      snap => setWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // ── 3. Logs – last 30 days ─────────────────────────────────
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const u2 = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'),
        where('clientName', '==', identifier),
        where('completedAt', '>=', Timestamp.fromDate(since)),
        orderBy('completedAt', 'asc')
      ),
      snap => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    // ── 4. Sessions ────────────────────────────────────────────
    const u3 = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'sessions'),
        where('clientName', '==', identifier)
      ),
      snap => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // ── 5. Exercise library (for auto-stretches) ───────────────
    const u4 = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'library'),
      snap => setLibrary(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const u5 = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'check_ins'),
        where('clientName', '==', identifier),
        orderBy('createdAt', 'desc')
      ),
      snap => setCheckIns(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // ── 7. Body measurements (weight / body fat / girths) ──────
    const u6 = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'body_measurements'),
        where('clientName', '==', identifier),
        orderBy('createdAt', 'asc')
      ),
      snap => setMeasurements(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { u0(); u1(); u2(); u3(); u4(); u5(); u6(); };
  }, [identifier]);

  return { workouts, logs, sessions, clientInfo, library, checkIns, measurements, loading };
}