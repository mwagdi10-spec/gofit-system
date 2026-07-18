import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

export async function fetchClientLogsSince(db, appId, clientName, sinceDate) {
  const snap = await getDocs(
    query(collection(db, 'artifacts', appId, 'public', 'data', 'logs'),
      where('clientName', '==', clientName),
      where('completedAt', '>=', Timestamp.fromDate(sinceDate)),
      orderBy('completedAt', 'asc')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
