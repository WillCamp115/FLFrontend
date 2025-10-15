import React, { useState, useEffect } from 'react';
import { X, Search, Tag, DollarSign, Target } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

const TransactionRecategorizeModal = ({
  transaction,
  availableCategories,
  currentCategoryOverride,
  onRecategorize,
  onClose
}) => {
  const [selectedCategory, setSelectedCategory] = useState(
    currentCategoryOverride?.categoryName || ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isGoalContribution, setIsGoalContribution] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [userGoals, setUserGoals] = useState([]);

  // Fetch user goals when modal opens
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const goals = await apiClient.getGoals();
        setUserGoals(goals || []);
      } catch (error) {
        console.error('Failed to fetch goals:', error);
        setUserGoals([]);
      }
    };

    fetchGoals();
  }, []);

  // Parse entity_id to get readable merchant name
  const parseEntityId = (entityId) => {
    if (!entityId) return 'Unknown';

    const cleaned = entityId
      .replace(/Entity\d+/g, '')
      .replace(/\d+/g, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();

    return cleaned || 'Unknown';
  };

  // Get merchant name for display
  const merchantName = transaction.merchant_name ||
    transaction.counterparties?.[0]?.name ||
    parseEntityId(transaction.merchant_entity_id || transaction.counterparties?.[0]?.entity_id) ||
    'Unknown Merchant';

  // Get current category display
  const getCurrentCategoryDisplay = () => {
    if (currentCategoryOverride) {
      return `${currentCategoryOverride.categoryName} (Custom)`;
    }

    if (transaction.personal_finance_category?.primary) {
      const primary = transaction.personal_finance_category.primary;
      return primary.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return transaction.category?.[0] || 'Uncategorized';
  };

  // Group categories by type
  const groupedCategories = {
    'Fixed Costs': availableCategories.filter(cat => cat.type === 'fixed'),
    'Variable Expenses': availableCategories.filter(cat => cat.type === 'variable')
  };

  // Filter categories based on search
  const filterCategories = (categories) => {
    if (!searchTerm) return categories;
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleConfirm = async () => {
    // Validate that either a category is selected OR it's a goal contribution
    if (!selectedCategory && !isGoalContribution) {
      alert('Please select a category or mark as goal contribution');
      return;
    }

    if (isGoalContribution && !selectedGoal) {
      alert('Please select a goal to contribute to');
      return;
    }

    // Only recategorize if a new category was selected
    if (selectedCategory) {
      const category = availableCategories.find(cat => cat.name === selectedCategory);
      if (category) {
        onRecategorize(transaction, {
          categoryName: category.name,
          mappedCategory: category.mappedCategory,
          type: category.type
        });
      }
    }

    // Handle goal contribution if specified
    if (isGoalContribution && selectedGoal) {
      try {
        await apiClient.contributeToGoal(
          selectedGoal,
          Math.abs(transaction.amount)
        );
        console.log('✅ Goal contribution applied:', {
          goal: selectedGoal,
          amount: Math.abs(transaction.amount),
          transaction: merchantName
        });
      } catch (error) {
        console.error('Failed to contribute to goal:', error);
        alert('Goal contribution failed. Please try again.');
      }
    }

    onClose();
  };

  const handleRemoveOverride = () => {
    onRecategorize(transaction, null); // Remove override
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Tag className="text-blue-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">
              Recategorize Transaction
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            <X size={20} />
          </button>
        </div>

        {/* Transaction Details */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="text-blue-600" size={16} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{merchantName}</p>
              <p className="text-sm text-gray-600">${transaction.amount.toFixed(2)}</p>
              <p className="text-xs text-gray-500">
                Current: {getCurrentCategoryDisplay()}
              </p>
            </div>
          </div>
        </div>

        {/* Goal Contribution Option */}
        {userGoals.length > 0 && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isGoalContribution}
                onChange={(e) => setIsGoalContribution(e.target.checked)}
                className="rounded border-emerald-300 text-emerald-600 focus:border-emerald-500 focus:ring focus:ring-emerald-200"
              />
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-900">
                  Mark as Goal Contribution
                </span>
              </div>
            </label>

            {isGoalContribution && (
              <div className="ml-6">
                <label htmlFor="goalSelect" className="block text-xs text-emerald-700 mb-1">
                  Select Goal:
                </label>
                <select
                  id="goalSelect"
                  value={selectedGoal}
                  onChange={(e) => setSelectedGoal(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">Choose a goal...</option>
                  {userGoals.map((goal) => (
                    <option key={goal.goal_name} value={goal.goal_name}>
                      {goal.goal_name} ({Math.round((goal.progress / goal.target_amount) * 100)}% complete)
                    </option>
                  ))}
                </select>
                <div className="text-xs text-emerald-600 mt-1">
                  ${Math.abs(transaction.amount).toFixed(2)} will be added to goal progress
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Selection */}
        <div className="flex-1 overflow-auto mb-4">
          {Object.entries(groupedCategories).map(([groupName, categories]) => {
            const filteredCategories = filterCategories(categories);
            if (filteredCategories.length === 0) return null;

            return (
              <div key={groupName} className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 px-1">
                  {groupName}
                </h4>
                <div className="space-y-1">
                  {filteredCategories.map((category) => (
                    <label
                      key={category.name}
                      className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="category"
                        value={category.name}
                        checked={selectedCategory === category.name}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {category.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Budget: ${category.limit?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {/* No results */}
          {searchTerm && Object.values(groupedCategories).every(cats =>
            filterCategories(cats).length === 0
          ) && (
            <div className="text-center py-4 text-gray-500">
              <p>No categories found for "{searchTerm}"</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {currentCategoryOverride && (
            <button
              onClick={handleRemoveOverride}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset to Original
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCategory && !isGoalContribution}
            className={`px-4 py-2 rounded-lg transition-colors ${
              (selectedCategory || isGoalContribution)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isGoalContribution && !selectedCategory ? 'Contribute to Goal' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionRecategorizeModal;