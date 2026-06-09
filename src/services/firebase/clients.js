// ─── Clients Service ─────────────────────────────────────────────────────────
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, COLLECTION_PATHS, handleFirebaseError } from './firebase-config';

// ─── Get All Clients ─────────────────────────────────────────────────────────
export const getAllClients = async () => {
  try {
    const clientsRef = collection(db, COLLECTION_PATHS.clients);
    const snapshot = await getDocs(clientsRef);
    
    const clientsMap = {};
    snapshot.forEach(doc => {
      clientsMap[doc.id] = {
        phone: doc.id,
        ...doc.data()
      };
    });
    
    return { success: true, data: clientsMap };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Subscribe to All Clients (Real-time) ─────────────────────────────────────
export const subscribeToClients = (callback) => {
  try {
    const clientsRef = collection(db, COLLECTION_PATHS.clients);
    
    const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
      const clientsMap = {};
      snapshot.forEach(doc => {
        clientsMap[doc.id] = {
          phone: doc.id,
          ...doc.data()
        };
      });
      
      callback({ success: true, data: clientsMap });
    }, (error) => {
      callback(handleFirebaseError(error));
    });

    return unsubscribe;
  } catch (error) {
    callback(handleFirebaseError(error));
    return () => {}; // Return no-op unsubscribe
  }
};

// ─── Get Single Client ─────────────────────────────────────────────────────────
export const getClient = async (phone) => {
  try {
    const clientRef = doc(db, COLLECTION_PATHS.clients, phone);
    const snapshot = await getDoc(clientRef);
    
    if (!snapshot.exists()) {
      return { success: false, message: 'Client not found' };
    }
    
    return { 
      success: true, 
      data: { 
        phone: snapshot.id, 
        ...snapshot.data() 
      } 
    };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Create Client ────────────────────────────────────────────────────────────
export const createClient = async (clientData) => {
  try {
    const { phone, ...data } = clientData;
    
    if (!phone) {
      return { success: false, message: 'Phone number is required' };
    }

    const clientRef = doc(db, COLLECTION_PATHS.clients, phone);
    
    await setDoc(clientRef, {
      ...data,
      phone,
      createdAt: serverTimestamp()
    });

    return { success: true, message: 'Client created successfully', data: { phone, ...data } };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Update Client ────────────────────────────────────────────────────────────
export const updateClient = async (phone, updates) => {
  try {
    if (!phone) {
      return { success: false, message: 'Phone number is required' };
    }

    const clientRef = doc(db, COLLECTION_PATHS.clients, phone);
    
    await updateDoc(clientRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true, message: 'Client updated successfully' };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Delete Client ────────────────────────────────────────────────────────────
export const deleteClient = async (phone) => {
  try {
    if (!phone) {
      return { success: false, message: 'Phone number is required' };
    }

    const clientRef = doc(db, COLLECTION_PATHS.clients, phone);
    await deleteDoc(clientRef);

    return { success: true, message: 'Client deleted successfully' };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Update Client NASM Phase ─────────────────────────────────────────────────
export const updateClientPhase = async (phone, phase) => {
  try {
    if (!phone || !phase) {
      return { success: false, message: 'Phone and phase are required' };
    }

    return await updateClient(phone, { nasm_phase: phase });
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Update Client Goal ────────────────────────────────────────────────────────
export const updateClientGoal = async (phone, goal) => {
  try {
    if (!phone || !goal) {
      return { success: false, message: 'Phone and goal are required' };
    }

    return await updateClient(phone, { goal });
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Bulk Update Clients ──────────────────────────────────────────────────────
export const bulkUpdateClients = async (updates) => {
  try {
    const results = [];
    
    for (const [phone, data] of Object.entries(updates)) {
      const result = await updateClient(phone, data);
      results.push({ phone, ...result });
    }

    return { success: true, data: results };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Search Clients ───────────────────────────────────────────────────────────
export const searchClients = async (searchTerm, allClients) => {
  try {
    if (!searchTerm || !allClients) {
      return { success: true, data: allClients || {} };
    }

    const lowerSearch = searchTerm.toLowerCase();
    const filtered = {};

    Object.entries(allClients).forEach(([phone, client]) => {
      const name = client.name?.toLowerCase() || '';
      const goal = client.goal?.toLowerCase() || '';
      
      if (name.includes(lowerSearch) || phone.includes(lowerSearch) || goal.includes(lowerSearch)) {
        filtered[phone] = client;
      }
    });

    return { success: true, data: filtered };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Get Clients by Goal ───────────────────────────────────────────────────────
export const getClientsByGoal = async (goal, allClients) => {
  try {
    if (!goal || !allClients) {
      return { success: true, data: {} };
    }

    const filtered = {};
    const lowerGoal = goal.toLowerCase();

    Object.entries(allClients).forEach(([phone, client]) => {
      if (client.goal?.toLowerCase().includes(lowerGoal)) {
        filtered[phone] = client;
      }
    });

    return { success: true, data: filtered };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Get Clients by Level ─────────────────────────────────────────────────────
export const getClientsByLevel = async (level, allClients) => {
  try {
    if (!level || !allClients) {
      return { success: true, data: {} };
    }

    const filtered = {};
    const lowerLevel = level.toLowerCase();

    Object.entries(allClients).forEach(([phone, client]) => {
      if (client.level?.toLowerCase().includes(lowerLevel)) {
        filtered[phone] = client;
      }
    });

    return { success: true, data: filtered };
  } catch (error) {
    return handleFirebaseError(error);
  }
};

// ─── Export Helper ────────────────────────────────────────────────────────────
export const clientsService = {
  getAllClients,
  subscribeToClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  updateClientPhase,
  updateClientGoal,
  bulkUpdateClients,
  searchClients,
  getClientsByGoal,
  getClientsByLevel
};

export default clientsService;
