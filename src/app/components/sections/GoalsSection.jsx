// src/components/sections/GoalsSection.jsx
import React, { useState } from 'react';
import { Target, Plus, Edit, Trash2, Calendar, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import ContributeToGoalModal from '../modals/ContributeToGoalModal';

const GoalsSection = ({
  userId,
  goals,
  debtGoals,
  onCreateGoal,
  onGoalsUpdated,
  isAdvisorView = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const totalGoals = (goals?.length || 0) + (debtGoals?.length || 0);
  const allGoals = [...(goals || []), ...(debtGoals || [])];

  // Calculate goal statistics
  const calculateGoalStats = () => {
    const totalTargetAmount = allGoals.reduce((sum, goal) => sum + (goal.target_amount || 0), 0);
    const totalProgress = allGoals.reduce((sum, goal) => sum + (goal.progress || 0), 0);
    const overallProgress = totalTargetAmount > 0 ? (totalProgress / totalTargetAmount) * 100 : 0;

    return {
      totalTargetAmount,
      totalProgress,
      overallProgress,
      remainingAmount: totalTargetAmount - totalProgress
    };
  };

  const stats = calculateGoalStats();

  // Calculate time to completion for a goal
  const calculateTimeToCompletion = (goal, monthlyContribution = 0) => {
    if (!goal || monthlyContribution <= 0) return null;

    const remaining = goal.target_amount - goal.progress;
    if (remaining <= 0) return 0;

    if (goal.goal_type === 'savings') {
      return Math.ceil(remaining / monthlyContribution);
    } else {
      // Debt goal with interest
      const interestRate = (goal.interest_rate || 0) / 100;
      const isYearly = goal.interest_type === 'yearly';
      const monthlyRate = isYearly ? interestRate / 12 : interestRate;

      if (monthlyRate === 0) {
        return Math.ceil(remaining / monthlyContribution);
      }

      // Using loan payment formula
      const months = -Math.log(1 - (remaining * monthlyRate) / monthlyContribution) / Math.log(1 + monthlyRate);
      return Math.ceil(months);
    }
  };

  // Handle goal contribution
  const handleGoalClick = (goal) => {
    if (isAdvisorView) return; // Don't allow contributions in advisor view
    setSelectedGoal(goal);
    setContributeModalOpen(true);
  };

  const handleContributionMade = () => {
    if (onGoalsUpdated) {
      onGoalsUpdated();
    }
  };

  // Handle goal deletion
  const handleDeleteGoal = async (goalName, goalType) => {
    if (!window.confirm(`Are you sure you want to delete "${goalName}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.deleteGoal(goalName);

      if (onGoalsUpdated) {
        onGoalsUpdated();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete goal');
    } finally {
      setLoading(false);
    }
  };

  // Get progress color based on percentage
  const getProgressColor = (progress, target, goalType) => {
    const percentage = target > 0 ? (progress / target) * 100 : 0;

    if (goalType === 'debt_free') {
      if (percentage >= 90) return 'bg-green-500';
      if (percentage >= 50) return 'bg-yellow-500';
      return 'bg-red-500';
    } else {
      if (percentage >= 75) return 'bg-green-500';
      if (percentage >= 50) return 'bg-blue-500';
      if (percentage >= 25) return 'bg-yellow-500';
      return 'bg-gray-400';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTimeToCompletion = (months) => {
    if (!months || months <= 0) return 'Complete!';
    if (months === 1) return '1 month';
    if (months < 12) return `${months} months`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (remainingMonths === 0) {
      return years === 1 ? '1 year' : `${years} years`;
    } else {
      return `${years}y ${remainingMonths}m`;
    }
  };

  return (
    <div id="goals-section" className="mb-8">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Financial Goals
                {isAdvisorView && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    Advisor View
                  </span>
                )}
              </h2>
              <p className="text-gray-600 mt-1">
                {isAdvisorView ? (
                  totalGoals > 0
                    ? `Track your client's progress on ${totalGoals} financial goal${totalGoals > 1 ? 's' : ''}`
                    : 'Help your client set financial goals to track their progress'
                ) : (
                  totalGoals > 0
                    ? `Track progress on your ${totalGoals} financial goal${totalGoals > 1 ? 's' : ''}`
                    : 'Set financial goals to track your progress'
                )}
              </p>
            </div>
            <button
              onClick={onCreateGoal}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Plus size={16} />
              {isAdvisorView ? 'Add Goal for Client' : 'Add Goal'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
              {error}
            </div>
          )}

          {totalGoals > 0 ? (
            <div className="space-y-6">
              {/* Overall Progress Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Target className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Goals</p>
                      <p className="text-xl font-bold text-blue-900">{totalGoals}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-green-600" size={20} />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Total Progress</p>
                      <p className="text-xl font-bold text-green-900">
                        {formatCurrency(stats.totalProgress)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="text-purple-600" size={20} />
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Target Amount</p>
                      <p className="text-xl font-bold text-purple-900">
                        {formatCurrency(stats.totalTargetAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="text-orange-600" size={20} />
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Remaining</p>
                      <p className="text-xl font-bold text-orange-900">
                        {formatCurrency(stats.remainingAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Progress Bar */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900">Overall Progress</h3>
                  <span className="text-sm font-medium text-blue-600">
                    {stats.overallProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(stats.overallProgress, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {formatCurrency(stats.totalProgress)} of {formatCurrency(stats.totalTargetAmount)} achieved
                </p>
              </div>

              {/* Individual Goals */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Individual Goals</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Savings Goals */}
                  {goals?.map((goal) => {
                    const percentage = goal.target_amount > 0 ? (goal.progress / goal.target_amount) * 100 : 0;
                    const remaining = goal.target_amount - goal.progress;
                    const progressColor = getProgressColor(goal.progress, goal.target_amount, 'savings');

                    return (
                      <div
                        key={goal.goal_name}
                        className={`p-4 border border-blue-200 rounded-lg bg-blue-50 ${
                          !isAdvisorView ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''
                        }`}
                        onClick={() => !isAdvisorView && handleGoalClick(goal)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Target className="text-blue-600" size={16} />
                              <h4 className="font-semibold text-blue-900">{goal.goal_name}</h4>
                              {!isAdvisorView && (
                                <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
                                  Click to contribute
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-blue-700">Savings Goal</p>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteGoal(goal.goal_name, 'savings')}
                              disabled={loading}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Progress</span>
                            <span className="font-medium text-blue-900">
                              {formatCurrency(goal.progress)} / {formatCurrency(goal.target_amount)}
                            </span>
                          </div>

                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-blue-700">
                              {percentage.toFixed(1)}% complete
                            </span>
                            <span className="text-blue-700">
                              {formatCurrency(remaining)} remaining
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Debt Goals */}
                  {debtGoals?.map((goal) => {
                    const percentage = goal.target_amount > 0 ? (goal.progress / goal.target_amount) * 100 : 0;
                    const remaining = goal.target_amount - goal.progress;
                    const progressColor = getProgressColor(goal.progress, goal.target_amount, 'debt_free');

                    return (
                      <div
                        key={goal.goal_name}
                        className={`p-4 border border-red-200 rounded-lg bg-red-50 ${
                          !isAdvisorView ? 'cursor-pointer hover:bg-red-100 transition-colors' : ''
                        }`}
                        onClick={() => !isAdvisorView && handleGoalClick(goal)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="text-red-600" size={16} />
                              <h4 className="font-semibold text-red-900">{goal.goal_name}</h4>
                              {!isAdvisorView && (
                                <span className="text-xs text-red-600 bg-red-200 px-2 py-1 rounded-full">
                                  Click to pay
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-red-700">
                              Debt-Free Goal • {goal.interest_rate || 0}% {goal.interest_type || 'yearly'}
                            </p>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteGoal(goal.goal_name, 'debt_free')}
                              disabled={loading}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-red-700">Progress</span>
                            <span className="font-medium text-red-900">
                              {formatCurrency(goal.progress)} / {formatCurrency(goal.target_amount)}
                            </span>
                          </div>

                          <div className="w-full bg-red-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-red-700">
                              {percentage.toFixed(1)}% paid off
                            </span>
                            <span className="text-red-700">
                              {formatCurrency(remaining)} remaining
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* No Goals State */
            <div className="text-center py-12">
              <Target className="mx-auto h-16 w-16 text-gray-400 mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">No Goals Set Yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Set financial goals to stay motivated and track your progress.
                Whether it's saving for a vacation or paying off debt, we'll help you get there.
              </p>
              <div className="space-y-3">
                <button
                  onClick={onCreateGoal}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                >
                  <Plus size={20} />
                  Create Your First Goal
                </button>
                <div className="flex justify-center gap-4 text-sm text-gray-500">
                  <span>• Savings Goals</span>
                  <span>• Debt Payoff</span>
                  <span>• Investment Targets</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contribute to Goal Modal */}
      <ContributeToGoalModal
        isOpen={contributeModalOpen}
        onClose={() => setContributeModalOpen(false)}
        goal={selectedGoal}
        onContributionMade={handleContributionMade}
        isAdvisorView={isAdvisorView}
      />
    </div>
  );
};

export default GoalsSection;