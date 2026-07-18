import { collection, doc, addDoc, getDocs, deleteDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';

export async function deleteLogsByDate(date, db, appId, clientName) {
  if (!clientName) {
    throw new Error('deleteLogsByDate requires clientName to avoid cross-client deletion.');
  }

  let dateObj = date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  }

  const startOfDay = Timestamp.fromDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  const startOfNextDay = Timestamp.fromDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1));

  // equality-only query لتفادي composite index، فلترة التاريخ محلياً
  const snap = await getDocs(
    query(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), where('clientName', '==', clientName))
  );
  const logsToDelete = snap.docs.filter(d => {
    const ts = d.data().completedAt;
    if (!ts) return false;
    const t = ts.toMillis();
    return t >= startOfDay.toMillis() && t < startOfNextDay.toMillis();
  });
  for (const docRef of logsToDelete) {
    await deleteDoc(docRef.ref);
  }
  return logsToDelete.length;
}

export async function deleteLogsByExerciseAndDate(exerciseName, date, db, appId, clientName) {
  if (!clientName) {
    throw new Error('deleteLogsByExerciseAndDate requires clientName to avoid cross-client deletion.');
  }

  let dateObj = date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  }

  const startOfDay = Timestamp.fromDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  const startOfNextDay = Timestamp.fromDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1));

  // equality-only query لتفادي composite index، فلترة التاريخ والتمرين محلياً
  const snap = await getDocs(
    query(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), where('clientName', '==', clientName))
  );
  const logsToDelete = snap.docs.filter(d => {
    const data = d.data();
    if (data.exerciseName !== exerciseName) return false;
    const ts = data.completedAt;
    if (!ts) return false;
    const t = ts.toMillis();
    return t >= startOfDay.toMillis() && t < startOfNextDay.toMillis();
  });
  for (const docRef of logsToDelete) {
    await deleteDoc(docRef.ref);
  }
  return logsToDelete.length;
}

export async function addLog(db, appId, data) {
  return await addDoc(
    collection(db, 'artifacts', appId, 'public', 'data', 'logs'),
    { ...data, completedAt: serverTimestamp() }
  );
}
