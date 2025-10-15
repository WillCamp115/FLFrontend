import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar } from 'lucide-react';
import apiClient from '../../../lib/apiClient';

const BudgetSelector = ({ isOpen, onClose, onSelectBudget }) => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchBudgets();
    }
  }, [isOpen]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/user/me/budgets');
      console.log('Budget API response:', response);

      // apiClient.get returns data directly, not wrapped in response.data
      const budgetData = Array.isArray(response) ? response : [];
      console.log('Processed budgets:', budgetData);

      setBudgets(budgetData);
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBudget = (budget) => {
    onSelectBudget(budget);
    onClose();
  };

  const formatBudget = (budget) => {
    const budgetData = budget.budget;
    return {
      income: budgetData.income || 0,
      goalName: budgetData.goal_name || 'Budget',
      fixedCosts: budgetData.fixed_costs?.length || 0,
      variableExpenses: budgetData.variable_expenses?.length || 0,
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Share a Budget</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">{error}</p>
              <button
                onClick={fetchBudgets}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Try again
              </button>
            </div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">No budgets found</p>
              <p className="text-sm text-gray-400">Create a budget first to share it</p>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map((budget) => {
                const formatted = formatBudget(budget);
                return (
                  <button
                    key={budget.id}
                    onClick={() => handleSelectBudget(budget)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {formatted.goalName}
                        </h4>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>Income: ${formatted.income.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatted.fixedCosts} fixed costs</span>
                          <span>{formatted.variableExpenses} variable expenses</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetSelector;
