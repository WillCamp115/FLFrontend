// src/components/modals/EditBudgetModal.jsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/apiClient';
import Modal from './Modal';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import CategoryDropdown from '../common/CategoryDropdown';
import DetailedCategoryDropdown from '../common/DetailedCategoryDropdown';
import { getDetailedCategories } from '../../utils/categoryData';
import { validateTransactionData } from '../../utils/mockBudgetHelper';

const EditBudgetModal = ({ userId, isOpen, onClose, onBudgetUpdated, currentBudget, isAdvisorView = false, clientName = '', isGroupBudget = false, groupId = null }) => {
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [fixedCosts, setFixedCosts] = useState([]);
  const [variableExpenses, setVariableExpenses] = useState([]);
  const [income, setIncome] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [timeframe, setTimeframe] = useState(null);
  const [transactionData, setTransactionData] = useState(null);
  const [primaryCategories, setPrimaryCategories] = useState([]);

  // Fetch transaction data and extract categories
  useEffect(() => {
    const fetchTransactionData = async () => {
      try {
        // Use appropriate API call based on advisor mode
        const data = isAdvisorView
          ? await apiClient.getClientTransactions(userId)
          : await apiClient.getTransactions();

        // Validate and use the transaction data from backend
        if (data && data.added && Array.isArray(data.added) && validateTransactionData(data.added)) {
          setTransactionData(data);
          // Extract unique primary categories from the transaction data
          const categories = [...new Set(data.added.map((t) => t.category?.[0]).filter(Boolean))];
          setPrimaryCategories(categories);
        } else {
          setTransactionData({ added: [] });
          setPrimaryCategories(["Rent", "Utilities", "Food and Drink", "Entertainment", "Travel", "Shops"]);
        }
      } catch (err) {
        // Set empty transaction data and fallback categories if API fails
        setTransactionData({ added: [] });
        setPrimaryCategories(["Rent", "Utilities", "Food and Drink", "Entertainment", "Travel", "Shops"]);
      }
    };

    fetchTransactionData();
  }, [isAdvisorView, userId]);

  useEffect(() => {
    if (isOpen) {
      fetchGoals();
      fetchAutopopulatedData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentBudget && isOpen) {
      // Populate form with current budget data - override any autopopulated data
      setIncome(currentBudget.income || 0);
      setSelectedGoal(currentBudget.goal_name || "");
      setMonthlyContribution(currentBudget.monthly_contribution || "");

      // Handle existing budget structure and add new fields for detailed categories
      const processedFixedCosts = (currentBudget.fixed_costs || []).map(cost => ({
        ...cost,
        detailed_categories: cost.detailed_categories || [],
        showDetailed: false
      }));
      setFixedCosts(processedFixedCosts);

      const processedVariableExpenses = (currentBudget.variable_expenses || []).map(expense => ({
        ...expense,
        detailed_categories: expense.detailed_categories || [],
        showDetailed: false
      }));
      setVariableExpenses(processedVariableExpenses);
    }
  }, [currentBudget, isOpen, goals]);

  // Calculate timeframe based on selected goal and monthly contribution
  useEffect(() => {
    if (!selectedGoal || !monthlyContribution || parseFloat(monthlyContribution) <= 0) {
      setTimeframe(null);
      return;
    }

    const goal = goals.find(g => g.name === selectedGoal);
    if (!goal) {
      setTimeframe(null);
      return;
    }

    const monthlyContrib = parseFloat(monthlyContribution);
    let remainingAmount = goal.target_amount - goal.current_progress;
    let months = 0;

    if (goal.type === "savings") {
      months = Math.ceil(remainingAmount / monthlyContrib);
    } else {
      const interestRate = goal.ir / 100;
      const isYearlyInterest = goal.interest_rate_period === "yearly";
      if (isYearlyInterest) {
        months = Math.log(remainingAmount / monthlyContrib) / Math.log(1 + interestRate);
      } else {
        months = Math.log(remainingAmount / monthlyContrib) / Math.log(1 + (interestRate / 12));
      }
      months = Math.ceil(months);
    }

    setTimeframe(months);
  }, [selectedGoal, monthlyContribution, goals]);

  const fetchGoals = async () => {
    try {
      // Use appropriate API calls based on advisor mode
      const savingsGoals = isAdvisorView 
        ? await apiClient.getClientGoals(userId)
        : await apiClient.getGoals();
      // Filter out debt goals - they should only appear in debt section
      const nonDebtGoals = (Array.isArray(savingsGoals) ? savingsGoals : []).filter(goal => goal.goal_type !== 'debt_free');
      const formattedSavingsGoals = nonDebtGoals.map((goal) => ({
        name: goal.goal_name,
        type: goal.goal_type,
        target_amount: goal.target_amount,
        current_progress: goal.progress,
        ir: goal.ir || 0,
        interest_rate_period: goal.interest_rate_period || "yearly",
      }));

      const debtGoals = isAdvisorView 
        ? await apiClient.getClientDebtGoals(userId)
        : await apiClient.getDebtGoals();
      const formattedDebtGoals = (Array.isArray(debtGoals) ? debtGoals : []).map((goal) => ({
        name: goal.goal_name,
        type: goal.goal_type,
        target_amount: goal.target_amount,
        current_progress: goal.progress,
        ir: goal.interest_rate || 0,
        interest_rate_period: goal.interest_type || "yearly",
      }));

      const allGoals = [...formattedSavingsGoals, ...formattedDebtGoals];
      setGoals(allGoals);
    } catch (err) {
      setError(err.message || "Failed to fetch goals");
    }
  };

  const fetchAutopopulatedData = async () => {
    try {
      const response = await apiClient.getAutopopulateBudgetData();
      const { income, fixed_costs } = response;

      // Only populate with autopopulated data if there's NO current budget
      if (!currentBudget) {
        setIncome(income);
        setFixedCosts(fixed_costs);

        // Preload variable expenses categories using transaction data
        if (primaryCategories.length > 0) {
          const variableCategories = [];
          primaryCategories.forEach((category) => {
            if (!["Rent", "Utilities", "Entertainment"].includes(category)) {
              variableCategories.push({ name: category, limit: "" });
            }
          });
          setVariableExpenses(variableCategories);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to fetch autopopulated budget data");
    }
  };

  const resetForm = () => {
    setSelectedGoal("");
    setMonthlyContribution("");
    setFixedCosts([]);
    setVariableExpenses([]);
    setIncome(0);
    setError(null);
    setSuccess(null);
    setTimeframe(null);
    setDeleting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDeleteBudget = async () => {
    if (!window.confirm('Are you sure you want to delete this budget? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.deleteBudgets();
      
      setSuccess("Budget deleted successfully!");
      
      if (onBudgetUpdated) {
        onBudgetUpdated();
      }
      
      setTimeout(() => {
        handleClose();
      }, 1000);
      
    } catch (err) {
      // Ensure error is always a string to prevent React rendering issues
      let errorMessage = "Failed to delete budget";
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = typeof err.response.data.detail === 'string' 
            ? err.response.data.detail 
            : JSON.stringify(err.response.data.detail);
        }
      }
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const addFixedCost = () => {
    setFixedCosts([...fixedCosts, { name: "", limit: "", detailed_categories: [], showDetailed: false }]);
  };

  const addVariableExpense = () => {
    setVariableExpenses([...variableExpenses, { name: "", limit: "", detailed_categories: [], showDetailed: false }]);
  };

  const updateFixedCost = (index, field, value) => {
    const updatedCosts = [...fixedCosts];
    updatedCosts[index][field] = value;
    
    // If changing the category name, reset detailed categories
    if (field === 'name' && value !== updatedCosts[index].name) {
      updatedCosts[index].detailed_categories = [];
      updatedCosts[index].showDetailed = false;
    }
    
    setFixedCosts(updatedCosts);
  };

  const updateVariableExpense = (index, field, value) => {
    const updatedExpenses = [...variableExpenses];
    updatedExpenses[index][field] = value;
    
    // If changing the category name, reset detailed categories
    if (field === 'name' && value !== updatedExpenses[index].name) {
      updatedExpenses[index].detailed_categories = [];
      updatedExpenses[index].showDetailed = false;
    }
    
    setVariableExpenses(updatedExpenses);
  };

  const deleteFixedCost = (index) => {
    const updatedCosts = fixedCosts.filter((_, i) => i !== index);
    setFixedCosts(updatedCosts);
  };

  const deleteVariableExpense = (index) => {
    const updatedExpenses = variableExpenses.filter((_, i) => i !== index);
    setVariableExpenses(updatedExpenses);
  };

  // Toggle detailed category view
  const toggleDetailedView = (index, isFixed) => {
    if (isFixed) {
      const updatedCosts = [...fixedCosts];
      updatedCosts[index].showDetailed = !updatedCosts[index].showDetailed;
      setFixedCosts(updatedCosts);
    } else {
      const updatedExpenses = [...variableExpenses];
      updatedExpenses[index].showDetailed = !updatedExpenses[index].showDetailed;
      setVariableExpenses(updatedExpenses);
    }
  };

  // Add detailed category to budget item
  const addDetailedCategory = (index, isFixed) => {
    if (isFixed) {
      const updatedCosts = [...fixedCosts];
      const primaryCategory = updatedCosts[index].name;
      
      if (!primaryCategory) {
        setError("Please select a primary category first");
        return;
      }
      
      updatedCosts[index].detailed_categories = [
        ...(updatedCosts[index].detailed_categories || []),
        { name: "", limit: "" }
      ];
      setFixedCosts(updatedCosts);
    } else {
      const updatedExpenses = [...variableExpenses];
      const primaryCategory = updatedExpenses[index].name;
      
      if (!primaryCategory) {
        setError("Please select a primary category first");
        return;
      }
      
      updatedExpenses[index].detailed_categories = [
        ...(updatedExpenses[index].detailed_categories || []),
        { name: "", limit: "" }
      ];
      setVariableExpenses(updatedExpenses);
    }
  };

  // Update detailed category
  const updateDetailedCategory = (categoryIndex, detailIndex, field, value, isFixed) => {
    if (isFixed) {
      const updatedCosts = [...fixedCosts];
      updatedCosts[categoryIndex].detailed_categories[detailIndex][field] = value;
      setFixedCosts(updatedCosts);
    } else {
      const updatedExpenses = [...variableExpenses];
      updatedExpenses[categoryIndex].detailed_categories[detailIndex][field] = value;
      setVariableExpenses(updatedExpenses);
    }
  };

  // Delete detailed category
  const deleteDetailedCategory = (categoryIndex, detailIndex, isFixed) => {
    if (isFixed) {
      const updatedCosts = [...fixedCosts];
      updatedCosts[categoryIndex].detailed_categories = updatedCosts[categoryIndex].detailed_categories.filter((_, i) => i !== detailIndex);
      setFixedCosts(updatedCosts);
    } else {
      const updatedExpenses = [...variableExpenses];
      updatedExpenses[categoryIndex].detailed_categories = updatedExpenses[categoryIndex].detailed_categories.filter((_, i) => i !== detailIndex);
      setVariableExpenses(updatedExpenses);
    }
  };

  const totalAllocated = () => {
    const fixedTotal = fixedCosts.reduce((sum, cost) => sum + (parseFloat(cost.limit) || 0), 0);
    const variableTotal = variableExpenses.reduce((sum, expense) => sum + (parseFloat(expense.limit) || 0), 0);
    return fixedTotal + variableTotal;
  };

  const remainingAmount = income - totalAllocated() - (parseFloat(monthlyContribution) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (fixedCosts.length === 0 || variableExpenses.length === 0) {
      setError("Please add at least one fixed cost and one variable expense.");
      setLoading(false);
      return;
    }

    const hasEmptyFixedLimit = fixedCosts.some((cost) => !cost.limit || parseFloat(cost.limit) <= 0);
    const hasEmptyVariableLimit = variableExpenses.some((expense) => !expense.limit || parseFloat(expense.limit) <= 0);
    if (hasEmptyFixedLimit || hasEmptyVariableLimit) {
      setError("Please set a valid limit for all categories (greater than 0).");
      setLoading(false);
      return;
    }

    let monthlyContributionAmount = 0;
    if (selectedGoal !== "") {
      if (!monthlyContribution || parseFloat(monthlyContribution) <= 0) {
        setError("Please enter a valid monthly contribution (greater than 0) for the selected goal.");
        setLoading(false);
        return;
      }
      monthlyContributionAmount = parseFloat(monthlyContribution);
    }

    const goalName = selectedGoal !== "" ? selectedGoal : null;
    
    // Process fixed costs with detailed categories
    const processedFixedCosts = fixedCosts.map((cost) => ({
      name: cost.name,
      limit: parseFloat(cost.limit) || 0,
      detailed_categories: (cost.detailed_categories || [])
        .filter(detail => detail.name && detail.limit) // Only include completed detailed categories
        .map(detail => ({
          name: detail.name,
          limit: parseFloat(detail.limit) || 0,
        }))
    }));
    
    // Process variable expenses with detailed categories
    const processedVariableExpenses = variableExpenses.map((expense) => ({
      name: expense.name,
      limit: parseFloat(expense.limit) || 0,
      detailed_categories: (expense.detailed_categories || [])
        .filter(detail => detail.name && detail.limit) // Only include completed detailed categories
        .map(detail => ({
          name: detail.name,
          limit: parseFloat(detail.limit) || 0,
        }))
    }));
    
    const budget = {
      id: currentBudget?.id, // Include budget ID if editing existing budget
      income,
      goal_name: goalName,
      monthly_contribution: monthlyContributionAmount,
      fixed_costs: processedFixedCosts,
      variable_expenses: processedVariableExpenses,
    };

    try {
      setError(null);
      setSuccess(null);

      // Use appropriate API call based on mode (advisor, group, or personal)
      let response;
      if (isGroupBudget && groupId) {
        // Group budget mode - use group budget APIs
        if (currentBudget?.id) {
          // Update existing group budget
          response = await apiClient.updateGroupBudget(currentBudget.id, {
            title: 'Group Budget',
            budget: budget,
          });
        } else {
          // Create new group budget
          response = await apiClient.createGroupBudget(groupId, {
            title: 'Group Budget',
            budget: budget,
          });
        }
      } else if (isAdvisorView) {
        // Advisor creating budget for client
        response = await apiClient.createClientBudget(userId, {
          budget_data: budget,
        });
      } else {
        // Personal budget
        response = await apiClient.createBudget({
          budget_data: budget,
        });
      }

      setSuccess("Budget saved successfully!");

      if (onBudgetUpdated) {
        onBudgetUpdated();
      }

      setTimeout(() => {
        handleClose();
      }, 1000);

    } catch (err) {
      setError(err.message || "Failed to save budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={
      isGroupBudget
        ? (currentBudget ? "Edit Group Budget" : "Create Group Budget")
        : isAdvisorView
        ? (currentBudget ? `Edit Budget for ${clientName}` : `Create Budget for ${clientName}`)
        : (currentBudget ? "Edit Budget" : "Create Budget")
    } size="xl">
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

        {/* Show overlay when deleting */}
        {deleting && (
          <div className="mb-4 p-3 bg-orange-100 text-orange-700 border border-orange-400 rounded">
            <div className="flex items-center gap-2">
              <Trash2 size={16} className="animate-pulse" />
              <span>Deleting budget...</span>
            </div>
          </div>
        )}

        {/* Main form content - disable when deleting */}
        <div className={deleting ? 'opacity-50 pointer-events-none' : ''}>
          {/* Income and Remaining Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="income">
                Monthly Income ($)
              </label>
              <input
                type="number"
                id="income"
                value={income}
                onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="flex items-end">
              <div>
                <p className="text-gray-700 font-medium mb-2">Remaining to Allocate</p>
                <p className={`text-2xl font-bold ${remainingAmount < 0 ? "text-red-500" : "text-green-500"}`}>
                  ${remainingAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Goal Priority Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Priority</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Select Goal</label>
                <select
                  value={selectedGoal}
                  onChange={(e) => setSelectedGoal(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Goal Selected</option>
                  {goals.map((goal) => (
                    <option key={goal.name} value={goal.name}>
                      {goal.name} (${goal.current_progress.toFixed(2)} / ${goal.target_amount.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              {selectedGoal !== "" && (
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Monthly Contribution ($)</label>
                  <input
                    type="number"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 100"
                    min="0"
                    step="0.01"
                    required
                  />
                  {timeframe !== null && (
                    <p className="text-gray-600 mt-2 text-sm">
                      Estimated Time to Reach Goal: {timeframe} months
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fixed Costs and Variable Expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fixed Costs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Fixed Costs</h3>
                <button
                  type="button"
                  onClick={addFixedCost}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
              <div className="space-y-4">
                {fixedCosts.map((cost, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    {/* Main category row */}
                    <div className="flex gap-2 mb-2">
                      <CategoryDropdown
                        value={cost.name}
                        onChange={(value) => updateFixedCost(index, 'name', value)}
                        placeholder="Select category"
                        className="flex-1"
                        required
                      />
                      <input
                        type="number"
                        value={cost.limit}
                        onChange={(e) => updateFixedCost(index, 'limit', e.target.value)}
                        className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="$"
                        min="0"
                        step="0.01"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => toggleDetailedView(index, true)}
                        disabled={!cost.name}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Add detailed breakdown"
                      >
                        {cost.showDetailed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFixedCost(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Detailed categories section */}
                    {cost.showDetailed && (
                      <div className="ml-4 border-l-2 border-blue-200 pl-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Detailed Breakdown</span>
                          <button
                            type="button"
                            onClick={() => addDetailedCategory(index, true)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            <Plus size={12} className="inline mr-1" />
                            Add Detail
                          </button>
                        </div>
                        
                        {(cost.detailed_categories || []).map((detail, detailIndex) => (
                          <div key={detailIndex} className="flex gap-2">
                            <DetailedCategoryDropdown
                              primaryCategory={cost.name}
                              value={detail.name}
                              onChange={(value) => updateDetailedCategory(index, detailIndex, 'name', value, true)}
                              placeholder="Select detailed category"
                              className="flex-1"
                              required
                            />
                            <input
                              type="number"
                              value={detail.limit}
                              onChange={(e) => updateDetailedCategory(index, detailIndex, 'limit', e.target.value, true)}
                              className="w-20 p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="$"
                              min="0"
                              step="0.01"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => deleteDetailedCategory(index, detailIndex, true)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        
                        {cost.detailed_categories && cost.detailed_categories.length === 0 && (
                          <p className="text-xs text-gray-500 italic">No detailed breakdown added yet</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Variable Expenses */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Variable Expenses</h3>
                <button
                  type="button"
                  onClick={addVariableExpense}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
              <div className="space-y-4">
                {variableExpenses.map((expense, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    {/* Main category row */}
                    <div className="flex gap-2 mb-2">
                      <CategoryDropdown
                        value={expense.name}
                        onChange={(value) => updateVariableExpense(index, 'name', value)}
                        placeholder="Select category"
                        className="flex-1"
                        required
                      />
                      <input
                        type="number"
                        value={expense.limit}
                        onChange={(e) => updateVariableExpense(index, 'limit', e.target.value)}
                        className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="$"
                        min="0"
                        step="0.01"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => toggleDetailedView(index, false)}
                        disabled={!expense.name}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Add detailed breakdown"
                      >
                        {expense.showDetailed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVariableExpense(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Detailed categories section */}
                    {expense.showDetailed && (
                      <div className="ml-4 border-l-2 border-green-200 pl-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Detailed Breakdown</span>
                          <button
                            type="button"
                            onClick={() => addDetailedCategory(index, false)}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            <Plus size={12} className="inline mr-1" />
                            Add Detail
                          </button>
                        </div>
                        
                        {(expense.detailed_categories || []).map((detail, detailIndex) => (
                          <div key={detailIndex} className="flex gap-2">
                            <DetailedCategoryDropdown
                              primaryCategory={expense.name}
                              value={detail.name}
                              onChange={(value) => updateDetailedCategory(index, detailIndex, 'name', value, false)}
                              placeholder="Select detailed category"
                              className="flex-1"
                              required
                            />
                            <input
                              type="number"
                              value={detail.limit}
                              onChange={(e) => updateDetailedCategory(index, detailIndex, 'limit', e.target.value, false)}
                              className="w-20 p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="$"
                              min="0"
                              step="0.01"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => deleteDetailedCategory(index, detailIndex, false)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        
                        {expense.detailed_categories && expense.detailed_categories.length === 0 && (
                          <p className="text-xs text-gray-500 italic">No detailed breakdown added yet</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 border-t mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          {/* Delete Button - Only show when editing existing budget */}
          {currentBudget && (
            <button
              type="button"
              onClick={handleDeleteBudget}
              disabled={deleting || loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting...' : 'Delete Budget'}
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading || deleting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Save Budget'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditBudgetModal;