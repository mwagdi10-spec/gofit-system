import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
