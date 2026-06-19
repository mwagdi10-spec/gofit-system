// في النهاية
export async function getClientProgressExcludingStretches(clientId, days = 20) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const q = query(
    collection(db, 'clients', clientId, 'progress'),
    where('date', '>=', startDate),
    where('type', '!=', 'staticStretch'),
    orderBy('date', 'desc')
  );
  return (await getDocs(q)).docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateClientMeasurements(clientId, measurements) {
  await updateDoc(doc(db, 'clients', clientId), { measurements });
}