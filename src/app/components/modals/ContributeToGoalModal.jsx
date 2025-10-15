// src/components/modals/ContributeToGoalModal.jsx
import React, { useState, useEffect } from 'react';
import { DollarSign, Target, TrendingUp } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import Modal from './Modal';

const ContributeToGoalModal = ({
  isOpen,
  onClose,
  goal,
  onContributionMade,
  isAdvisorView = false
}) => {
  const [contributionAmount, setContributionAmount] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setContributionAmount('');
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      setError('Please enter a valid contribution amount');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiClient.contributeToGoal(goal.goal_name, parseFloat(contributionAmount));

      setSuccess(result.message);

      // Call the callback to refresh goal data
      if (onContributionMade) {
        onContributionMade();
      }

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to make contribution');
    } finally {
      setLoading(false);
    }
  };

  if (!goal) return null;

  const isDebtGoal = goal.interest_rate !== undefined;
  const percentage = goal.target_amount > 0 ? (goal.progress / goal.target_amount) * 100 : 0;
  const remaining = goal.target_amount - goal.progress;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Contribute to ${goal.goal_name}`}
      size="md"
    >
      <div className="p-6">
        {/* Goal Summary */}
        <div className={`p-4 rounded-lg mb-6 ${isDebtGoal ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {isDebtGoal ? (
              <TrendingUp className="text-red-600" size={20} />
            ) : (
              <Target className="text-blue-600" size={20} />
            )}
            <div>
              <h3 className={`font-semibold ${isDebtGoal ? 'text-red-900' : 'text-blue-900'}`}>
                {goal.goal_name}
              </h3>
              <p className={`text-sm ${isDebtGoal ? 'text-red-700' : 'text-blue-700'}`}>
                {isDebtGoal ? 'Debt-Free Goal' : 'Savings Goal'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={isDebtGoal ? 'text-red-700' : 'text-blue-700'}>Progress</span>
              <span className={`font-medium ${isDebtGoal ? 'text-red-900' : 'text-blue-900'}`}>
                {formatCurrency(goal.progress)} / {formatCurrency(goal.target_amount)}
              </span>
            </div>

            <div className={`w-full rounded-full h-2 ${isDebtGoal ? 'bg-red-200' : 'bg-blue-200'}`}>
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  percentage >= 75 ? 'bg-green-500' :
                  percentage >= 50 ? (isDebtGoal ? 'bg-yellow-500' : 'bg-blue-500') :
                  percentage >= 25 ? 'bg-yellow-500' :
                  isDebtGoal ? 'bg-red-500' : 'bg-gray-400'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs">
              <span className={isDebtGoal ? 'text-red-700' : 'text-blue-700'}>
                {percentage.toFixed(1)}% {isDebtGoal ? 'paid off' : 'complete'}
              </span>
              <span className={isDebtGoal ? 'text-red-700' : 'text-blue-700'}>
                {formatCurrency(remaining)} remaining
              </span>
            </div>
          </div>
        </div>

        {/* Contribution Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="contributionAmount" className="block text-sm font-medium text-gray-700 mb-2">
              {isDebtGoal ? 'Payment Amount' : 'Contribution Amount'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                id="contributionAmount"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                max={remaining}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum: {formatCurrency(remaining)}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !contributionAmount || parseFloat(contributionAmount) <= 0}
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 transition-colors ${
                isDebtGoal
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Processing...' : isDebtGoal ? 'Make Payment' : 'Contribute'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ContributeToGoalModal;