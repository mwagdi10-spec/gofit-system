// ─── App.jsx ──────────────────────────────────────────────────────
// التطبيق الرئيسي - نسخة مبسطة للبداية

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/hook-useAuth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import ClientSelector from './ClientSelector';
import ClientProfileModal from './ClientProfileModal';
import ExerciseLibrary from './ExerciseLibrary';

const App = () => {
  const { user, isLoading, isAuthenticated, identifier, role, login, logout } = useAuth();
  const [clientNames, setClientNames] = useState({});
  const [selectedClient, setSelectedClient] = useState('');
  const [showProfile, setShowProfile] = useState(false);

  // Mock data - في التطبيق الحقيقي ستأتي من Firebase
  const mockExercises = [
    { id: '1', name: 'Bench Press', category: 'RESISTANCE', sets: '4', reps: '6-8', muscleGroup: 'Chest' },
    { id: '2', name: 'Squat', category: 'RESISTANCE', sets: '4', reps: '6-8', muscleGroup: 'Quads' },
    { id: '3', name: 'Deadlift', category: 'RESISTANCE', sets: '3', reps: '3-5', muscleGroup: 'Back' },
    { id: '4', name: 'Lat Pulldown', category: 'RESISTANCE', sets: '3', reps: '8-12', muscleGroup: 'Back' }
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" message="Loading GoFit..." fullScreen />
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-800 bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-center">
            <h1 className="text-4xl font-black text-white mb-2">GoFit</h1>
            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest">Fitness Coaching Platform</p>
          </div>

          {/* Login Form */}
          <div className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2 uppercase">
                Access Key
              </label>
              <input
                type="text"
                id="loginInput"
                placeholder="Enter your ID"
                className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              onClick={() => {
                const input = document.getElementById('loginInput');
                login(input.value);
              }}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase rounded-lg shadow-lg active:scale-95 transition-all"
            >
              Login
            </button>

            <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
              Demo: Use your phone number or email
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-blue-600">GoFit</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
              {role === 'trainer' ? 'Trainer Dashboard' : 'Client Portal'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {identifier}
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4">
        {role === 'trainer' ? (
          // Trainer Dashboard
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Client Selector */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">
                  Select Client
                </h2>
                <ClientSelector
                  clientNames={clientNames}
                  value={selectedClient}
                  onChange={setSelectedClient}
                />

                {selectedClient && (
                  <button
                    onClick={() => setShowProfile(true)}
                    className="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                  >
                    View Profile
                  </button>
                )}
              </div>
            </div>

            {/* Right Column - Exercise Library */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">
                  Exercise Library
                </h2>
                <ExerciseLibrary
                  exercises={mockExercises}
                  onSelect={(ex) => console.log('Selected:', ex)}
                  isEditable={true}
                />
              </div>
            </div>
          </div>
        ) : (
          // Client View
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
              Welcome, {identifier}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 font-semibold">
              Your workout program will appear here. Check back soon!
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedClient && (
        <ClientProfileModal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          client={clientNames[selectedClient] || {}}
          onSave={async (data) => {
            console.log('Saving client:', data);
            setShowProfile(false);
          }}
        />
      )}
    </div>
  );
};

export default App;
