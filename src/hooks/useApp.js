import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db, APP_ID } from '../services/firebase/config';

export function useAppData(user, authStep) {
  const [workouts, setWorkouts]             = useState([]);
  const [allLogs, setAllLogs]               = useState([]);
  const [clientRegistry, setClientRegistry] = useState({});

  useEffect(() => {
    if (!user || authStep !== 'authenticated') return;
    const u1 = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'client_names'),
      s => { const m = {}; s.forEach(d => { m[d.id] = d.data(); }); setClientRegistry(m); }
    );
    const u2 = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'workouts'), orderBy('orderIndex', 'asc')),
      s => setWorkouts(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    const u3 = onSnapshot(
      query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'),
        where('completedAt', '>=', Timestamp.fromDate(twentyDaysAgo)),
        orderBy('completedAt', 'desc')
      ),
      s => setAllLogs(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); u3(); };
  }, [user, authStep]);

  return { workouts, allLogs, clientRegistry };
}
