import React, { useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { getClientById, updateClient } from '../../services/firebaseService';
import { StrengthProgressChart, ConsistencyChart } from '../../components/ProgressCharts';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ClientDetail() {
  const { clientId } = useParams();
  const { isDark } = useContext(ThemeContext);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingField, setEditingField] = useState(null);

  const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const inputBg = isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 border border-gray-300';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const data = await getClientById(clientId);
      setClient(data);
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldUpdate = async (field, value) => {
    try {
      await updateClient(clientId, { [field]: value });
      setClient({ ...client, [field]: value });
      setEditingField(null);
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!client) return <div className={`${bgClass} ${textClass} p-6`}>Client not found</div>;

  const currentProgram = client.workoutPrograms?.[0];
  const programWeeks = currentProgram?.weeks || [];

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{client.name}</h1>
          <p className={textSecondary}>Email: {client.email}</p>
          <p className={textSecondary}>Joined: {new Date(client.createdAt?.toDate?.() || client.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          {['overview', 'workouts', 'progress', 'measurements'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 font-semibold transition ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : `${textSecondary} hover:text-white`
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className={`${cardBg} rounded-lg p-6`}>
              <h2 className="text-2xl font-bold mb-4">Personal Details</h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-1 ${textSecondary}`}>Age</label>
                  {editingField === 'age' ? (
                    <input
                      type="number"
                      defaultValue={client.age}
                      onBlur={(e) => handleFieldUpdate('age', parseInt(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && handleFieldUpdate('age', parseInt(e.target.value))}
                      className={inputBg}
                      autoFocus
                    />
                  ) : (
                    <p onClick={() => setEditingField('age')} className="cursor-pointer">
                      {client.age || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-1 ${textSecondary}`}>Goal</label>
                  {editingField === 'goal' ? (
                    <select
                      defaultValue={client.goal}
                      onBlur={(e) => handleFieldUpdate('goal', e.target.value)}
                      className={inputBg}
                      autoFocus
                    >
                      <option>Hypertrophy</option>
                      <option>Strength</option>
                      <option>Endurance</option>
                      <option>Fat Loss</option>
                    </select>
                  ) : (
                    <p onClick={() => setEditingField('goal')} className="cursor-pointer">
                      {client.goal || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-1 ${textSecondary}`}>Experience Level</label>
                  {editingField === 'experienceLevel' ? (
                    <select
                      defaultValue={client.experienceLevel}
                      onBlur={(e) => handleFieldUpdate('experienceLevel', e.target.value)}
                      className={inputBg}
                      autoFocus
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  ) : (
                    <p onClick={() => setEditingField('experienceLevel')} className="cursor-pointer">
                      {client.experienceLevel || 'Not set'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Current Program */}
            <div className={`${cardBg} rounded-lg p-6`}>
              <h2 className="text-2xl font-bold mb-4">Current Program</h2>
              {currentProgram ? (
                <div className="space-y-3">
                  <div>
                    <p className={`${textSecondary} text-sm`}>Phase</p>
                    <p className="font-bold text-lg">{currentProgram.phase}</p>
                  </div>
                  <div>
                    <p className={`${textSecondary} text-sm`}>Duration</p>
                    <p className="font-bold">{currentProgram.duration} weeks</p>
                  </div>
                  <div>
                    <p className={`${textSecondary} text-sm`}>Start Date</p>
                    <p className="font-bold">
                      {new Date(currentProgram.startDate?.toDate?.() || currentProgram.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className={`${textSecondary} text-sm`}>Status</p>
                    <p className="font-bold text-green-500">Active</p>
                  </div>
                </div>
              ) : (
                <p className={textSecondary}>No active program</p>
              )}
            </div>
          </div>
        )}

        {/* Workouts Tab - Week Based */}
        {activeTab === 'workouts' && (
          <div className="space-y-4">
            {programWeeks.length > 0 ? (
              programWeeks.map((week, widx) => (
                <div key={widx} className={`${cardBg} rounded-lg p-6`}>
                  <h3 className="text-xl font-bold mb-4">Week {week.weekNumber}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {week.days?.map((day, didx) => (
                      <div key={didx} className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded p-4`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">{day.name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${day.completed ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'}`}>
                            {day.completed ? '✓ Done' : '○ Pending'}
                          </span>
                        </div>
                        <p className={`text-sm ${textSecondary} mb-3`}>
                          {day.exercises?.length || 0} exercises
                        </p>
                        <div className="space-y-1">
                          {day.exercises?.slice(0, 3).map((ex, eidx) => (
                            <p key={eidx} className="text-xs">• {ex.name}</p>
                          ))}
                          {day.exercises?.length > 3 && (
                            <p className={`text-xs ${textSecondary}`}>+{day.exercises.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className={textSecondary}>No weeks assigned</p>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${cardBg} rounded-lg p-6`}>
              <h3 className="text-xl font-bold mb-4">Strength Progress</h3>
              <StrengthProgressChart data={currentProgram?.progressData?.strength || []} isDark={isDark} />
            </div>
            <div className={`${cardBg} rounded-lg p-6`}>
              <h3 className="text-xl font-bold mb-4">Consistency</h3>
              <ConsistencyChart data={currentProgram?.progressData?.consistency || []} isDark={isDark} />
            </div>
          </div>
        )}

        {/* Measurements Tab */}
        {activeTab === 'measurements' && (
          <div className={`${cardBg} rounded-lg p-6`}>
            <h2 className="text-2xl font-bold mb-6">Body Measurements</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['weight', 'chest', 'waist', 'arms', 'legs', 'bodyFat'].map(measurement => (
                <div key={measurement}>
                  <label className={`block text-sm font-semibold mb-2 ${textSecondary}`}>
                    {measurement.charAt(0).toUpperCase() + measurement.slice(1)}
                  </label>
                  {editingField === measurement ? (
                    <input
                      type="number"
                      defaultValue={client.measurements?.[measurement]}
                      onBlur={(e) => handleFieldUpdate(`measurements.${measurement}`, parseFloat(e.target.value))}
                      className={inputBg}
                      autoFocus
                    />
                  ) : (
                    <p
                      onClick={() => setEditingField(measurement)}
                      className="cursor-pointer font-bold text-lg"
                    >
                      {client.measurements?.[measurement] || '-'} {measurement === 'weight' ? 'kg' : 'cm'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}