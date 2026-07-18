import { doc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';

export async function addClient(db, appId, phone, data) {
  return await setDoc(
    doc(db, 'artifacts', appId, 'public', 'data', 'client_names', phone),
    { ...data, createdAt: serverTimestamp() }
  );
}

export async function updateClient(db, appId, phone, data) {
  return await updateDoc(
    doc(db, 'artifacts', appId, 'public', 'data', 'client_names', phone),
    data
  );
}

// كل العمليات scoped بـ phone فقط
export async function deleteClientCompletely(db, appId, phone) {
  if (!phone) throw new Error('deleteClientCompletely requires phone.');

  const collectionsByField = [
    { name: 'workouts', field: 'assignedTo' },
    { name: 'logs', field: 'clientName' },
    { name: 'check_ins', field: 'clientName' },
    { name: 'user_notes', field: 'clientName' },
  ];

  let totalDeleted = 0;

  for (const { name, field } of collectionsByField) {
    const snap = await getDocs(
      query(collection(db, 'artifacts', appId, 'public', 'data', name), where(field, '==', phone))
    );
    // Firestore batch limit = 500
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 500) {
      const batch = writeBatch(db);
      docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    totalDeleted += docs.length;
  }

  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'client_names', phone));

  return totalDeleted;
}
