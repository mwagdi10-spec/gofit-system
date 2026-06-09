// ─── useAuth Hook ──────────────────────────────────────────────────────────
// إدارة حالة المصادقة والـ login والـ authentication

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase/config';

const TRAINER_MAIL = 'wagdi@gofit.com';

/**
 * Hook لإدارة حالة المصادقة
 * 
 * @returns {Object} {
 *   user: firebase user object,
 *   identifier: phone number or email,
 *   role: 'trainer' | 'client',
 *   isLoading: boolean,
 *   isAuthenticated: boolean,
 *   login: function,
 *   logout: function
 * }
 * 
 * @example
 * function App() {
 *   const { user, identifier, role, isLoading, login, logout } = useAuth();
 *   
 *   if (isLoading) return <LoadingScreen />;
 *   
 *   if (!user) return <LoginScreen onLogin={login} />;
 *   
 *   return role === 'trainer' ? <TrainerDash /> : <ClientView />;
 * }
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [identifier, setIdentifier] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('gofit_user') || '' : '';
  });
  const [role, setRole] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('gofit_role') || 'client' : 'client';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authStep, setAuthStep] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('gofit_user')
      ? 'authenticated'
      : 'login';
  });

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Determine role based on identifier
  const determineRole = useCallback((id) => {
    if (!id) return 'client';
    return id.toLowerCase() === TRAINER_MAIL.toLowerCase() ? 'trainer' : 'client';
  }, []);

  // Login function
  const login = useCallback((newIdentifier) => {
    if (!newIdentifier || !newIdentifier.trim()) {
      return { success: false, message: 'Identifier required' };
    }

    const newRole = determineRole(newIdentifier);
    
    // Save to localStorage
    localStorage.setItem('gofit_user', newIdentifier);
    localStorage.setItem('gofit_role', newRole);

    // Update state
    setIdentifier(newIdentifier);
    setRole(newRole);
    setAuthStep('authenticated');

    return { success: true, identifier: newIdentifier, role: newRole };
  }, [determineRole]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('gofit_user');
    localStorage.removeItem('gofit_role');
    
    setIdentifier('');
    setRole('client');
    setAuthStep('login');
    
    return { success: true };
  }, []);

  // Restore session from localStorage
  const restoreSession = useCallback(() => {
    const savedIdentifier = localStorage.getItem('gofit_user');
    const savedRole = localStorage.getItem('gofit_role');

    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
      setRole(savedRole || 'client');
      setAuthStep('authenticated');
      return true;
    }

    return false;
  }, []);

  return {
    // State
    user,
    identifier,
    role,
    isLoading,
    isAuthenticated: authStep === 'authenticated',
    authStep,

    // Methods
    login,
    logout,
    restoreSession,
    determineRole,

    // Helpers
    isTrainer: role === 'trainer',
    isClient: role === 'client'
  };
};

/**
 * Hook لحماية Routes
 * استخدم هذا مع react-router للتحقق من المصادقة
 * 
 * @example
 * function ProtectedRoute({ component: Component }) {
 *   const { isAuthenticated, isLoading } = useAuth();
 *   
 *   if (isLoading) return <LoadingScreen />;
 *   if (!isAuthenticated) return <Navigate to="/login" />;
 *   
 *   return <Component />;
 * }
 */
export const useRequireAuth = () => {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect to login or show error
      window.location.href = '/';
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
};

/**
 * Hook للتحقق من أن المستخدم يملك الدور المطلوب
 * 
 * @example
 * function TrainerOnly() {
 *   const hasAccess = useRequireRole('trainer');
 *   
 *   if (!hasAccess) return <NoAccess />;
 *   return <TrainerContent />;
 * }
 */
export const useRequireRole = (requiredRole) => {
  const { role, isLoading, isAuthenticated } = useAuth();

  return {
    hasAccess: isAuthenticated && role === requiredRole,
    isLoading,
    currentRole: role,
    isAuthorized: role === requiredRole
  };
};

/**
 * Hook بسيط لمعرفة إذا كان المستخدم logged in
 */
export const useIsLoggedIn = () => {
  const { isAuthenticated, isLoading } = useAuth();
  return { isLoggedIn: isAuthenticated, isLoading };
};

export default useAuth;
