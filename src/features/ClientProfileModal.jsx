// ─── ClientProfileModal Feature ───────────────────────────────────
// عرض وتعديل بيانات العميل الكاملة

import React, { useState, useMemo } from 'react';
import Modal from '../components/ui/Modal';
import { NASM_OPT_PHASES } from '../constants/nasm';
import { getClientMetrics, getCoachRecommendations } from '../utils/helpers';

const ClientProfileModal = ({
  isOpen = false,
  onClose = () => {},
  client = {},
  onSave = () => {},
  workouts = [],
  logs = [],
  isSaving = false
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(client);

  const metrics = useMemo(() => {
    return getClientMetrics(client.phone, workouts, logs);
  }, [client.phone, workouts, logs]);

  const recommendations = useMemo(() => {
    return getCoachRecommendations(client, metrics);
  }, [client, metrics]);

  const handleSave = async () => {
    await onSave(formData);
    setEditMode(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${formData.name || 'Client'} Profile`}
      size="lg"
    >
      {editMode ? (
        // Edit Mode
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Age"
              value={formData.age || ''}
              onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={formData.gender || ''}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Goal"
            value={formData.goal || ''}
            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={formData.nasm_phase || 1}
            onChange={(e) => setFormData({ ...formData, nasm_phase: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
          >
            {[1, 2, 3, 4, 5].map(p => (
              <option key={p} value={p}>
                Phase {p}: {NASM_OPT_PHASES[p].phase}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Injuries/Notes"
            value={formData.injuries || ''}
            onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
          />

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setFormData(client);
              }}
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // View Mode
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <p className="text-2xl font-bold text-blue-500">{metrics.assigned}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">Assigned</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <p className="text-2xl font-bold text-green-500">{metrics.completed}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">Completed</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <p className="text-2xl font-bold text-yellow-500">{metrics.prs}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">PRs</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <p className="text-2xl font-bold text-purple-500">{metrics.adherence}%</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">Adherence</p>
            </div>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">Phase</p>
              <p className="text-lg font-bold text-blue-500">Phase {formData.nasm_phase || 1}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">Goal</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formData.goal || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">Age</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{formData.age || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 uppercase">Top Muscle</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{metrics.topMuscle}</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">Coach Recommendations</h4>
            <ul className="space-y-1">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-green-800 dark:text-green-300">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Edit Button */}
          <button
            onClick={() => setEditMode(true)}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
          >
            ✏️ Edit Profile
          </button>
        </div>
      )}
    </Modal>
  );
};

export default ClientProfileModal;
