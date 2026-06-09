// ─── useApp Hook ──────────────────────────────────────────────────
// الـ hook الرئيسي لإدارة حالة التطبيق

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/hook-useAuth';
import { useMetrics } from '../hooks/hook-useMetrics';

export const useApp = () => {
  const auth = useAuth();
  const [clientNames, setClientNames] = useState({});
  const [workouts, setWorkouts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [libraryData, setLibraryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from Firebase (placeholder)
  useEffect(() => {
    if (!auth.isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // In real app, fetch from Firebase
        // const clients = await getClients();
        // const allWorkouts = await getWorkouts();
        // etc...
        
        // For now, use mock data
        setClientNames({});
        setWorkouts([]);
        setLogs([]);
        setLibraryData([]);
        
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [auth.isAuthenticated]);

  // Metrics for selected client
  const getClientStats = useCallback((clientPhone) => {
    return useMetrics(clientPhone, workouts, logs);
  }, [workouts, logs]);

  // Add new client
  const addClient = useCallback(async (clientData) => {
    try {
      // In real app: await createClient(clientData);
      setClientNames(prev => ({
        ...prev,
        [clientData.phone]: clientData
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Update client
  const updateClient = useCallback(async (clientPhone, clientData) => {
    try {
      // In real app: await updateClient(clientPhone, clientData);
      setClientNames(prev => ({
        ...prev,
        [clientPhone]: { ...prev[clientPhone], ...clientData }
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Delete client
  const deleteClient = useCallback(async (clientPhone) => {
    try {
      // In real app: await deleteClient(clientPhone);
      setClientNames(prev => {
        const copy = { ...prev };
        delete copy[clientPhone];
        return copy;
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Add workout
  const addWorkout = useCallback(async (workoutData) => {
    try {
      // In real app: await addWorkout(workoutData);
      const newWorkout = {
        id: Date.now().toString(),
        ...workoutData
      };
      setWorkouts(prev => [...prev, newWorkout]);
      return { success: true, data: newWorkout };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Update workout
  const updateWorkout = useCallback(async (workoutId, workoutData) => {
    try {
      // In real app: await updateWorkout(workoutId, workoutData);
      setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, ...workoutData } : w));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Delete workout
  const deleteWorkout = useCallback(async (workoutId) => {
    try {
      // In real app: await deleteWorkout(workoutId);
      setWorkouts(prev => prev.filter(w => w.id !== workoutId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Log exercise
  const logExercise = useCallback(async (logData) => {
    try {
      // In real app: await addLog(logData);
      const newLog = {
        id: Date.now().toString(),
        completedAt: new Date(),
        ...logData
      };
      setLogs(prev => [...prev, newLog]);
      return { success: true, data: newLog };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  return {
    // Auth
    ...auth,

    // Data
    clientNames,
    workouts,
    logs,
    libraryData,
    isLoading,
    error,

    // Methods
    getClientStats,
    addClient,
    updateClient,
    deleteClient,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    logExercise,

    // Helpers
    isTrainer: auth.role === 'trainer',
    isClient: auth.role === 'client'
  };
};

export default useApp;
