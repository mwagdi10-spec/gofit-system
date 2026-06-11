import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, TRAINER_MAIL } from '../services/firebase/config';

export function useAuth() {
  const [user, setUser]           = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [identifier, setIdentifier] = useState(localStorage.getItem('gofit_user') || '');
  const [role, setRole]           = useState(localStorage.getItem('gofit_role') || 'client');
  const [authStep, setAuthStep]   = useState(localStorage.getItem('gofit_user') ? 'authenticated' : 'login');

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsub = onAuthStateChanged(auth, au => { setUser(au); setIsLoading(false); });
    return () => unsub();
  }, []);

  const doLogin = () => {
    if (!identifier.trim()) return;
    const r = identifier.toLowerCase() === TRAINER_MAIL.toLowerCase() ? 'trainer' : 'client';
    localStorage.setItem('gofit_user', identifier);
    localStorage.setItem('gofit_role', r);
    setRole(r);
    setAuthStep('authenticated');
  };

  return { user, isLoading, identifier, setIdentifier, role, authStep, doLogin };
}
