// src/components/modals/CreateGoalModal.jsx
import React, { useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import Modal from './Modal';

const CreateGoalModal = ({ userId, isOpen, onClose, onGoalCreated, isAdvisorView = false, clientName = '' }) => {
  const [goalType, setGoalType] = useState("savings");
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentProgress, setCurrentProgress] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [interestRatePeriod, setInterestRatePeriod] = useState("yearly");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setGoalName("");
    setGoalType("savings");
    setTargetAmount("");
    setCurrentProgress("");
    setInterestRate("");
    setInterestRatePeriod("yearly");
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const newGoal = {
      goal_name: goalName,
      goal_type: goalType,
      target_amount: parseFloat(targetAmount),
      progress: parseFloat(currentProgress),
      ...(goalType === "debt_free" && {
        interest_rate: parseFloat(interestRate) || 0.0,
        interest_type: interestRatePeriod || "yearly",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      }),
    };

    try {
      setError(null);
      setSuccess(null);
      
      let response;
      if (isAdvisorView) {
        // Use client-specific API endpoints for advisors
        if (goalType === "debt_free") {
          response = await apiClient.createClientDebtGoal(userId, newGoal);
        } else {
          response = await apiClient.createClientGoal(userId, newGoal);
        }
      } else {
        // Use regular endpoints for self-service
        if (goalType === "debt_free") {
          response = await apiClient.createDebtGoal(newGoal);
        } else {
          response = await apiClient.createGoal(newGoal);
        }
      }
      
      setSuccess("Goal created successfully!");
      
      // Notify parent component to refresh goals
      if (onGoalCreated) {
        onGoalCreated();
      }
      
      // Close modal after short delay to show success message
      setTimeout(() => {
        handleClose();
      }, 1000);
      
    } catch (err) {
      let errorMessage = "Failed to create goal";
      if (err.response && err.response.status === 400 && err.response.data.detail === "Goal already created") {
        errorMessage = "You cannot create two goals with the same name.";
      } else if (err.response) {
        errorMessage = err.response.data.detail || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isAdvisorView ? `Create Goal for ${clientName}` : "Create New Goal"} size="md">
      <form onSubmit={handleSubmit} className="p-6">
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

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2" htmlFor="goalType">
            Goal Type
          </label>
          <select
            id="goalType"
            value={goalType}
            onChange={(e) => setGoalType(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="savings">Savings Goal</option>
            <option value="debt_free">Debt-Free Goal</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2" htmlFor="goalName">
            Goal Name
          </label>
          <input
            type="text"
            id="goalName"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Save for Vacation"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="targetAmount">
              Target Amount ($)
            </label>
            <input
              type="number"
              id="targetAmount"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 5000"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="currentProgress">
              Current Progress ($)
            </label>
            <input
              type="number"
              id="currentProgress"
              value={currentProgress}
              onChange={(e) => setCurrentProgress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1000"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        {goalType === "debt_free" && (
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Interest Rate
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 5.5"
                min="0"
                step="0.01"
                required
              />
              <select
                value={interestRatePeriod}
                onChange={(e) => setInterestRatePeriod(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="yearly">Yearly (APY)</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateGoalModal;