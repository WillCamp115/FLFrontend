import React, { useState } from 'react';
import { DollarSign, ChevronDown, ChevronUp, Save, Edit } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const BudgetMessage = ({ message, isCurrentUser, onSaveBudget, onEditBudget }) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const budgetData = message.metadata?.budget || {};

  const calculateTotals = () => {
    // Budget data uses 'limit' for fixed costs and variable expenses
    const fixedCostsTotal = (budgetData.fixed_costs || []).reduce((sum, cost) => sum + (parseFloat(cost.limit) || parseFloat(cost.amount) || 0), 0);
    const variableExpensesTotal = (budgetData.variable_expenses || []).reduce((sum, exp) => sum + (parseFloat(exp.limit) || parseFloat(exp.amount) || 0), 0);
    const totalExpenses = fixedCostsTotal + variableExpensesTotal;
    const remaining = (budgetData.income || 0) - totalExpenses;

    return {
      fixedCostsTotal,
      variableExpensesTotal,
      totalExpenses,
      remaining
    };
  };

  const totals = calculateTotals();

  const handleSave = () => {
    if (onSaveBudget) {
      onSaveBudget(budgetData);
    }
  };

  const handleEdit = () => {
    if (onEditBudget) {
      onEditBudget(budgetData);
    }
  };

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-md ${isCurrentUser ? 'ml-auto' : 'mr-auto'}`}>
        {/* Sender info */}
        {!isCurrentUser && (
          <div className="text-xs text-gray-600 mb-1 px-1">
            {message.sender_name}
          </div>
        )}

        {/* Budget Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-blue-100 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {budgetData.goal_name || 'Budget'}
                  </h4>
                  <p className="text-sm text-gray-600">Shared Budget</p>
                </div>
              </div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-2 hover:bg-blue-200 rounded-full transition-colors"
              >
                {expanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-700" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Income</p>
                <p className="font-semibold text-green-700">
                  ${(budgetData.income || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Expenses</p>
                <p className="font-semibold text-red-700">
                  ${totals.totalExpenses.toLocaleString()}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-600">Remaining</p>
                <p className={`font-semibold text-lg ${totals.remaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ${totals.remaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="border-t border-blue-200 p-4 space-y-4">
              {/* Fixed Costs */}
              {budgetData.fixed_costs && budgetData.fixed_costs.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Fixed Costs</h5>
                  <div className="space-y-2">
                    {budgetData.fixed_costs.map((cost, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-white p-2 rounded">
                        <span className="text-gray-700">{cost.name}</span>
                        <span className="font-medium text-gray-900">${(parseFloat(cost.limit) || parseFloat(cost.amount) || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-between text-sm font-semibold">
                    <span>Total Fixed Costs:</span>
                    <span>${totals.fixedCostsTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Variable Expenses */}
              {budgetData.variable_expenses && budgetData.variable_expenses.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Variable Expenses</h5>
                  <div className="space-y-2">
                    {budgetData.variable_expenses.map((expense, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-white p-2 rounded">
                        <span className="text-gray-700">{expense.name}</span>
                        <span className="font-medium text-gray-900">${(parseFloat(expense.limit) || parseFloat(expense.amount) || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-between text-sm font-semibold">
                    <span>Total Variable Expenses:</span>
                    <span>${totals.variableExpensesTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons (only for recipients) */}
          {!isCurrentUser && (
            <div className="border-t border-blue-200 p-4">
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Save to My Budgets
              </button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 mt-1 px-1">
          {new Date(message.created_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default BudgetMessage;
