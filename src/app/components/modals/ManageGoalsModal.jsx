// src/components/modals/ManageGoalsModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Target, Edit, Trash2, DollarSign, Percent, Calendar, Save, X } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

const ManageGoalsModal = ({ userId, isOpen, onClose, onGoalsUpdated }) => {
  const [goals, setGoals] = useState([]);
  const [debtGoals, setDebtGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Fetch goals when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllGoals();
    }
  }, [isOpen]);

  const fetchAllGoals = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch savings goals
      const savingsGoals = await apiClient.getGoals();
      const formattedSavingsGoals = savingsGoals.map((goal) => ({
        ...goal,
        type: 'savings',
        displayType: 'Savings Goal'
      }));

      // Fetch debt goals
      const debtGoals = await apiClient.getDebtGoals();
      const formattedDebtGoals = debtGoals.map((goal) => ({
        ...goal,
        type: 'debt_free',
        displayType: 'Debt-Free Goal'
      }));

      setGoals(formattedSavingsGoals);
      setDebtGoals(formattedDebtGoals);
    } catch (err) {
      setError(err.message || "Failed to fetch goals");
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (goal) => {
    setEditingGoal(goal.goal_name);
    setEditForm({
      goal_name: goal.goal_name,
      target_amount: goal.target_amount,
      progress: goal.progress,
      interest_rate: goal.interest_rate || 0,
      interest_type: goal.interest_type || 'yearly'
    });
  };

  const handleEditCancel = () => {
    setEditingGoal(null);
    setEditForm({});
  };

  const handleEditSave = async (goal) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedGoal = {
        goal_name: editForm.goal_name,
        target_amount: parseFloat(editForm.target_amount),
        progress: parseFloat(editForm.progress),
        ...(goal.type === 'debt_free' && {
          interest_rate: parseFloat(editForm.interest_rate),
          interest_type: editForm.interest_type,
          start_date: goal.start_date,
          end_date: goal.end_date
        })
      };

      // Note: Backend doesn't have update endpoints yet, so we'll delete and recreate
      // TODO: Implement proper update endpoints in backend
      let response;
      if (goal.type === 'debt_free') {
        await apiClient.deleteGoal(goal.goal_name);
        response = await apiClient.createDebtGoal(updatedGoal);
      } else {
        await apiClient.deleteGoal(goal.goal_name);
        response = await apiClient.createGoal(updatedGoal);
      }

      setSuccess("Goal updated successfully!");
      setEditingGoal(null);
      setEditForm({});
      await fetchAllGoals();

      if (onGoalsUpdated) {
        onGoalsUpdated();
      }
    } catch (err) {
      setError(err.message || "Failed to update goal");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Are you sure you want to delete "${goal.goal_name}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.deleteGoal(goal.goal_name);

      setSuccess("Goal deleted successfully!");
      await fetchAllGoals();

      if (onGoalsUpdated) {
        onGoalsUpdated();
      }
    } catch (err) {
      setError(err.message || "Failed to delete goal");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const allGoals = [...goals, ...debtGoals];
  const totalGoals = allGoals.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Goals" size="lg">
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-400 rounded">
            {success}
          </div>
        )}

        {loading && (
          <div className="mb-4 p-3 bg-blue-100 text-blue-700 border border-blue-400 rounded">
            Loading goals...
          </div>
        )}

        {totalGoals === 0 ? (
          <div className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No goals to manage</p>
            <p className="text-sm text-gray-500 mt-2">Create some goals first to manage them here</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Managing {totalGoals} Goal{totalGoals > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-gray-600">
                Edit progress, amounts, or delete goals that are no longer relevant
              </p>
            </div>

            {/* Goals List */}
            <div className="space-y-3">
              {allGoals.map((goal) => (
                <div key={`${goal.type}-${goal.goal_name}`} className="border rounded-lg p-4">
                  {editingGoal === goal.goal_name ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">Editing: {goal.goal_name}</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditSave(goal)}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            <Save size={14} />
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Target Amount ($)
                          </label>
                          <input
                            type="number"
                            value={editForm.target_amount}
                            onChange={(e) => setEditForm({ ...editForm, target_amount: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Progress ($)
                          </label>
                          <input
                            type="number"
                            value={editForm.progress}
                            onChange={(e) => setEditForm({ ...editForm, progress: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        {goal.type === 'debt_free' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Interest Rate (%)
                              </label>
                              <input
                                type="number"
                                value={editForm.interest_rate}
                                onChange={(e) => setEditForm({ ...editForm, interest_rate: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="0.01"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Interest Period
                              </label>
                              <select
                                value={editForm.interest_type}
                                onChange={(e) => setEditForm({ ...editForm, interest_type: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="yearly">Yearly (APY)</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Target
                              className={goal.type === 'debt_free' ? 'text-red-600' : 'text-blue-600'}
                              size={16}
                            />
                            <h4 className="font-semibold text-gray-900">{goal.goal_name}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${goal.type === 'debt_free'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                              }`}>
                              {goal.displayType}
                            </span>
                          </div>

                          {goal.type === 'debt_free' && (
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <Percent size={12} />
                                {goal.interest_rate || 0}% {goal.interest_type || 'yearly'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditStart(goal)}
                            disabled={loading}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Edit Goal"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(goal)}
                            disabled={loading}
                            className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Delete Goal"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Progress Information */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(goal.progress || 0)} / {formatCurrency(goal.target_amount || 0)}
                          </span>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${goal.type === 'debt_free' ? 'bg-red-500' : 'bg-blue-500'
                              }`}
                            style={{
                              width: `${Math.min(((goal.progress || 0) / (goal.target_amount || 1)) * 100, 100)}%`
                            }}
                          ></div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>
                            {(((goal.progress || 0) / (goal.target_amount || 1)) * 100).toFixed(1)}%
                            {goal.type === 'debt_free' ? ' paid off' : ' complete'}
                          </span>
                          <span>
                            {formatCurrency((goal.target_amount || 0) - (goal.progress || 0))} remaining
                          </span>
                        </div>

                        {/* Goal dates for debt goals */}
                        {goal.type === 'debt_free' && goal.start_date && goal.end_date && (
                          <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              Started: {new Date(goal.start_date).toLocaleDateString()}
                            </span>
                            <span>
                              Target: {new Date(goal.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end pt-6 border-t mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ManageGoalsModal;