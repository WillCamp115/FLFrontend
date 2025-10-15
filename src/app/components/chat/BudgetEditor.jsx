import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign } from 'lucide-react';

const BudgetEditor = ({ isOpen, onClose, budgetData, onSave }) => {
  const [editedBudget, setEditedBudget] = useState({
    goal_name: '',
    income: 0,
    fixed_costs: [],
    variable_expenses: []
  });

  useEffect(() => {
    if (budgetData) {
      setEditedBudget({
        goal_name: budgetData.goal_name || '',
        income: budgetData.income || 0,
        fixed_costs: budgetData.fixed_costs || [],
        variable_expenses: budgetData.variable_expenses || []
      });
    }
  }, [budgetData]);

  const calculateTotals = () => {
    const fixedCostsTotal = editedBudget.fixed_costs.reduce((sum, cost) => sum + (parseFloat(cost.amount) || 0), 0);
    const variableExpensesTotal = editedBudget.variable_expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const totalExpenses = fixedCostsTotal + variableExpensesTotal;
    const remaining = (parseFloat(editedBudget.income) || 0) - totalExpenses;

    return {
      fixedCostsTotal,
      variableExpensesTotal,
      totalExpenses,
      remaining
    };
  };

  const totals = calculateTotals();

  const handleIncomeChange = (value) => {
    setEditedBudget({
      ...editedBudget,
      income: parseFloat(value) || 0
    });
  };

  const handleGoalNameChange = (value) => {
    setEditedBudget({
      ...editedBudget,
      goal_name: value
    });
  };

  const addFixedCost = () => {
    setEditedBudget({
      ...editedBudget,
      fixed_costs: [...editedBudget.fixed_costs, { name: '', amount: 0 }]
    });
  };

  const updateFixedCost = (index, field, value) => {
    const updated = [...editedBudget.fixed_costs];
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' ? (parseFloat(value) || 0) : value
    };
    setEditedBudget({
      ...editedBudget,
      fixed_costs: updated
    });
  };

  const removeFixedCost = (index) => {
    setEditedBudget({
      ...editedBudget,
      fixed_costs: editedBudget.fixed_costs.filter((_, i) => i !== index)
    });
  };

  const addVariableExpense = () => {
    setEditedBudget({
      ...editedBudget,
      variable_expenses: [...editedBudget.variable_expenses, { name: '', amount: 0 }]
    });
  };

  const updateVariableExpense = (index, field, value) => {
    const updated = [...editedBudget.variable_expenses];
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' ? (parseFloat(value) || 0) : value
    };
    setEditedBudget({
      ...editedBudget,
      variable_expenses: updated
    });
  };

  const removeVariableExpense = (index) => {
    setEditedBudget({
      ...editedBudget,
      variable_expenses: editedBudget.variable_expenses.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    onSave(editedBudget);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Edit Budget</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Budget Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Name
            </label>
            <input
              type="text"
              value={editedBudget.goal_name}
              onChange={(e) => handleGoalNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter budget name"
            />
          </div>

          {/* Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Income
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                value={editedBudget.income}
                onChange={(e) => handleIncomeChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Fixed Costs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Fixed Costs
              </label>
              <button
                onClick={addFixedCost}
                className="flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Cost
              </button>
            </div>
            <div className="space-y-2">
              {editedBudget.fixed_costs.map((cost, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={cost.name}
                    onChange={(e) => updateFixedCost(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Cost name"
                  />
                  <input
                    type="number"
                    value={cost.amount}
                    onChange={(e) => updateFixedCost(index, 'amount', e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => removeFixedCost(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            {editedBudget.fixed_costs.length > 0 && (
              <div className="mt-2 pt-2 border-t flex justify-between text-sm font-semibold">
                <span>Total:</span>
                <span>${totals.fixedCostsTotal.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Variable Expenses */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Variable Expenses
              </label>
              <button
                onClick={addVariableExpense}
                className="flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </button>
            </div>
            <div className="space-y-2">
              {editedBudget.variable_expenses.map((expense, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={expense.name}
                    onChange={(e) => updateVariableExpense(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Expense name"
                  />
                  <input
                    type="number"
                    value={expense.amount}
                    onChange={(e) => updateVariableExpense(index, 'amount', e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => removeVariableExpense(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            {editedBudget.variable_expenses.length > 0 && (
              <div className="mt-2 pt-2 border-t flex justify-between text-sm font-semibold">
                <span>Total:</span>
                <span>${totals.variableExpensesTotal.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Income:</span>
              <span className="font-semibold text-green-700">
                ${(parseFloat(editedBudget.income) || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Expenses:</span>
              <span className="font-semibold text-red-700">
                ${totals.totalExpenses.toLocaleString()}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-300 flex justify-between">
              <span className="font-semibold text-gray-900">Remaining:</span>
              <span className={`font-bold text-lg ${totals.remaining >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${totals.remaining.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Budget
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetEditor;
