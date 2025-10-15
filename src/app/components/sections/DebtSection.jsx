// src/components/sections/DebtSection.jsx
import React, { useState } from 'react';
import { CreditCard, Plus, Trash2, AlertTriangle, TrendingDown, DollarSign, Calculator } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import ContributeToGoalModal from '../modals/ContributeToGoalModal';

const DebtSection = ({ 
  userId,
  debtGoals, 
  onCreateGoal,
  onDebtUpdated,
  isAdvisorView = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);

  // Calculate debt statistics
  const calculateDebtStats = () => {
    if (!debtGoals || debtGoals.length === 0) {
      return {
        totalDebt: 0,
        totalPaid: 0,
        averageInterestRate: 0,
        totalRemaining: 0,
        overallProgress: 0
      };
    }

    const totalDebt = debtGoals.reduce((sum, debt) => sum + (debt.target_amount || 0), 0);
    const totalPaid = debtGoals.reduce((sum, debt) => sum + (debt.progress || 0), 0);
    const totalRemaining = totalDebt - totalPaid;
    const overallProgress = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
    
    // Calculate weighted average interest rate
    const weightedInterestSum = debtGoals.reduce((sum, debt) => {
      const remaining = (debt.target_amount || 0) - (debt.progress || 0);
      const rate = debt.interest_rate || 0;
      return sum + (remaining * rate);
    }, 0);
    const averageInterestRate = totalRemaining > 0 ? weightedInterestSum / totalRemaining : 0;

    return {
      totalDebt,
      totalPaid,
      averageInterestRate,
      totalRemaining,
      overallProgress
    };
  };

  const stats = calculateDebtStats();

  // Get debt priority (highest interest rate first)
  const getPriorityOrder = () => {
    return [...(debtGoals || [])].sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0));
  };

  // Handle debt goal contribution
  const handleDebtClick = (debt) => {
    if (isAdvisorView) return; // Don't allow contributions in advisor view
    setSelectedDebt(debt);
    setContributeModalOpen(true);
  };

  const handleContributionMade = () => {
    if (onDebtUpdated) {
      onDebtUpdated();
    }
  };

  // Handle debt goal deletion
  const handleDeleteDebt = async (debtName) => {
    if (!window.confirm(`Are you sure you want to delete "${debtName}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.deleteGoal(debtName);

      if (onDebtUpdated) {
        onDebtUpdated();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete debt goal');
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

  const getProgressColor = (progress, target) => {
    const percentage = target > 0 ? (progress / target) * 100 : 0;
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getInterestRateColor = (rate) => {
    if (rate >= 20) return 'text-red-600 bg-red-50';
    if (rate >= 10) return 'text-orange-600 bg-orange-50';
    if (rate >= 5) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const priorityOrder = getPriorityOrder();

  return (
    <div id="debt-section" className="mb-8">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Debt Management
                {isAdvisorView && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    Advisor View
                  </span>
                )}
              </h2>
              <p className="text-gray-600 mt-1">
                {isAdvisorView ? (
                  debtGoals && debtGoals.length > 0
                    ? `Track and manage your client's ${debtGoals.length} debt goal${debtGoals.length > 1 ? 's' : ''}`
                    : 'Help your client create debt-free goals to manage their payments'
                ) : (
                  debtGoals && debtGoals.length > 0
                    ? `Track and manage your ${debtGoals.length} debt goal${debtGoals.length > 1 ? 's' : ''}`
                    : 'Create debt-free goals to manage your payments'
                )}
              </p>
            </div>
            <button
              onClick={onCreateGoal}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Plus size={16} />
              {isAdvisorView ? 'Add Debt Goal for Client' : 'Add Debt Goal'}
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

          {debtGoals && debtGoals.length > 0 ? (
            <div className="space-y-6">
              {/* Debt Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-red-600" size={20} />
                    <div>
                      <p className="text-sm text-red-600 font-medium">Total Debt</p>
                      <p className="text-xl font-bold text-red-900">
                        {formatCurrency(stats.totalDebt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="text-green-600" size={20} />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Paid Off</p>
                      <p className="text-xl font-bold text-green-900">
                        {formatCurrency(stats.totalPaid)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-orange-600" size={20} />
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Remaining</p>
                      <p className="text-xl font-bold text-orange-900">
                        {formatCurrency(stats.totalRemaining)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calculator className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Avg Interest</p>
                      <p className="text-xl font-bold text-blue-900">
                        {stats.averageInterestRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Progress */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900">Overall Debt Progress</h3>
                  <span className="text-sm font-medium text-green-600">
                    {stats.overallProgress.toFixed(1)}% Paid Off
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(stats.overallProgress, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {formatCurrency(stats.totalPaid)} of {formatCurrency(stats.totalDebt)} paid off
                </p>
              </div>

              {/* Debt Strategy Recommendation */}
              {priorityOrder.length > 1 && (
                <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-yellow-600 mt-1" size={20} />
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-2">Recommended Strategy</h3>
                      <p className="text-yellow-800 text-sm mb-2">
                        Focus on <strong>"{priorityOrder[0].goal_name}"</strong> first - it has the highest interest rate at {priorityOrder[0].interest_rate || 0}%.
                        This debt avalanche method will save you the most money on interest.
                      </p>
                      <p className="text-yellow-700 text-xs">
                        Make minimum payments on other debts while putting extra toward this one.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Debt Goals */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Individual Debts</h3>
                <div className="space-y-4">
                  {priorityOrder.map((debt, index) => {
                    const percentage = debt.target_amount > 0 ? (debt.progress / debt.target_amount) * 100 : 0;
                    const remaining = (debt.target_amount || 0) - (debt.progress || 0);
                    const progressColor = getProgressColor(debt.progress, debt.target_amount);
                    const interestColorClass = getInterestRateColor(debt.interest_rate || 0);

                    return (
                      <div
                        key={debt.goal_name}
                        className={`p-6 border border-red-200 rounded-lg bg-red-50 ${
                          !isAdvisorView ? 'cursor-pointer hover:bg-red-100 transition-colors' : ''
                        }`}
                        onClick={() => !isAdvisorView && handleDebtClick(debt)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CreditCard className="text-red-600" size={20} />
                              <h4 className="font-semibold text-red-900 text-lg">{debt.goal_name}</h4>
                              {!isAdvisorView && (
                                <span className="text-xs text-red-600 bg-red-200 px-2 py-1 rounded-full">
                                  Click to pay
                                </span>
                              )}
                              {index === 0 && priorityOrder.length > 1 && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                  PRIORITY
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${interestColorClass}`}>
                                {debt.interest_rate || 0}% {debt.interest_type || 'yearly'}
                              </span>
                              <span className="text-red-700">
                                {formatCurrency(remaining)} remaining
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteDebt(debt.goal_name)}
                              disabled={loading}
                              className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-red-700">Progress</span>
                            <span className="font-medium text-red-900">
                              {formatCurrency(debt.progress || 0)} / {formatCurrency(debt.target_amount || 0)}
                            </span>
                          </div>
                          <div className="w-full bg-red-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-300 ${progressColor}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-red-700 mt-1">
                            {percentage.toFixed(1)}% paid off
                          </p>
                        </div>

                        {/* Key Dates */}
                        {debt.start_date && debt.end_date && (
                          <div className="mt-4 flex gap-4 text-sm text-gray-600">
                            <span>Started: {new Date(debt.start_date).toLocaleDateString()}</span>
                            <span>Target: {new Date(debt.end_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Debt Tips */}
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-blue-900 mb-3">💡 Debt Payoff Tips</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                  <div>
                    <h4 className="font-medium mb-1">Debt Avalanche Method</h4>
                    <p>Pay minimums on all debts, then put extra toward the highest interest rate debt first.</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Budget for Success</h4>
                    <p>Cut expenses and allocate more to debt payments to accelerate your payoff timeline.</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Consider Consolidation</h4>
                    <p>If you have good credit, a lower-rate loan might reduce your interest burden.</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Stay Motivated</h4>
                    <p>Celebrate milestones and track your progress to maintain momentum.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No Debt Goals State */
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-16 w-16 text-gray-400 mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">No Debt Goals Tracked</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create debt-free goals to track your debt payoff progress and get strategic 
                payment recommendations to save money on interest.
              </p>
              <div className="space-y-3">
                <button
                  onClick={onCreateGoal}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mx-auto"
                >
                  <Plus size={20} />
                  Create Your First Debt Goal
                </button>
                <div className="flex justify-center gap-4 text-sm text-gray-500">
                  <span>• Credit Cards</span>
                  <span>• Student Loans</span>
                  <span>• Personal Loans</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contribute to Debt Goal Modal */}
      <ContributeToGoalModal
        isOpen={contributeModalOpen}
        onClose={() => setContributeModalOpen(false)}
        goal={selectedDebt}
        onContributionMade={handleContributionMade}
        isAdvisorView={isAdvisorView}
      />
    </div>
  );
};

export default DebtSection;