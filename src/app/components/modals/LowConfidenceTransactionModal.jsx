// src/components/modals/LowConfidenceTransactionModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import {
  AlertTriangle,
  CheckCircle,
  SkipForward,
  Users,
  DollarSign,
  Calendar,
  Info,
  ChevronRight,
  ChevronLeft,
  X,
  Target
} from 'lucide-react';
import { getConfidenceDisplay } from '../../utils/confidenceUtils';
import { apiClient } from '../../../lib/apiClient';

const LowConfidenceTransactionModal = ({
  isOpen,
  onClose,
  transactions = [],
  availableCategories = [],
  categoryOverrides = {},
  onTransactionRecategorize,
  title = "Review Low-Confidence Transactions"
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [reviewDecisions, setReviewDecisions] = useState(new Map());
  const [showBatchOptions, setShowBatchOptions] = useState(false);
  const [batchApplyTo, setBatchApplyTo] = useState('similar'); // 'similar', 'all'
  const [isGoalContribution, setIsGoalContribution] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [userGoals, setUserGoals] = useState([]);

  const currentTransaction = transactions[currentIndex];
  const totalTransactions = transactions.length;

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

    if (isOpen) {
      fetchGoals();
    }
  }, [isOpen]);

  // Reset state when modal opens/closes or transactions change
  useEffect(() => {
    if (isOpen && transactions.length > 0) {
      setCurrentIndex(0);
      setSelectedCategory('');
      setReviewDecisions(new Map());
      setShowBatchOptions(false);
      setIsGoalContribution(false);
      setSelectedGoal('');
    }
  }, [isOpen, transactions]);

  // Helper function to parse entity_id for merchant name
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
  const getMerchantName = (transaction) => {
    return transaction.merchant_name ||
           transaction.counterparties?.[0]?.name ||
           parseEntityId(transaction.counterparties?.[0]?.entity_id) ||
           transaction.name ||
           'Unknown Merchant';
  };

  // Get current category display
  const getCurrentCategoryDisplay = (transaction) => {
    const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
    const override = categoryOverrides[transactionId];

    if (override) {
      return `${override.categoryName} (Previously Set)`;
    }

    if (transaction.personal_finance_category?.primary) {
      const primary = transaction.personal_finance_category.primary;
      return primary.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return transaction.category?.[0] || 'Uncategorized';
  };

  // Get confidence display info
  const getConfidenceInfo = (transaction) => {
    const confidence = transaction.personal_finance_category?.confidence_level;
    return getConfidenceDisplay(confidence);
  };

  // Group categories by type for better organization
  const groupedCategories = {
    'Fixed Costs': availableCategories.filter(cat => cat.type === 'fixed'),
    'Variable Expenses': availableCategories.filter(cat => cat.type === 'variable')
  };

  // Handle navigation
  const goToNext = () => {
    if (currentIndex < totalTransactions - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedCategory('');
      setShowBatchOptions(false);
      setIsGoalContribution(false);
      setSelectedGoal('');
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedCategory('');
      setShowBatchOptions(false);
      setIsGoalContribution(false);
      setSelectedGoal('');
    }
  };

  // Handle accepting Plaid's categorization
  const handleAcceptPlaidCategory = () => {
    const decision = {
      action: 'accept',
      transaction: currentTransaction
    };

    const newDecisions = new Map(reviewDecisions);
    newDecisions.set(currentTransaction.transaction_id || `${currentTransaction.date}-${currentTransaction.amount}`, decision);
    setReviewDecisions(newDecisions);

    if (currentIndex < totalTransactions - 1) {
      goToNext();
    } else {
      // Pass the updated decisions to ensure last transaction is saved
      handleFinishReview(newDecisions);
    }
  };

  // Handle manual categorization
  const handleManualCategorize = () => {
    if (!selectedCategory) return;
    if (isGoalContribution && !selectedGoal) {
      alert('Please select a goal to contribute to');
      return;
    }

    const category = availableCategories.find(cat => cat.name === selectedCategory);
    if (!category) return;

    const decision = {
      action: 'recategorize',
      transaction: currentTransaction,
      categoryData: {
        categoryName: category.name,
        mappedCategory: category.mappedCategory,
        type: category.type
      },
      applyToSimilar: showBatchOptions && batchApplyTo === 'similar',
      goalContribution: isGoalContribution ? {
        goalName: selectedGoal,
        amount: Math.abs(currentTransaction.amount)
      } : null
    };

    const newDecisions = new Map(reviewDecisions);
    const transactionId = currentTransaction.transaction_id || `${currentTransaction.date}-${currentTransaction.amount}`;
    newDecisions.set(transactionId, decision);
    setReviewDecisions(newDecisions);

    // If batch apply to similar transactions
    if (showBatchOptions && batchApplyTo === 'similar') {
      const currentMerchant = getMerchantName(currentTransaction);
      transactions.forEach(transaction => {
        if (getMerchantName(transaction) === currentMerchant) {
          const txnId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
          const batchDecision = {
            ...decision,
            transaction: transaction
          };
          newDecisions.set(txnId, batchDecision);
        }
      });
    }

    setReviewDecisions(newDecisions);

    if (currentIndex < totalTransactions - 1) {
      goToNext();
    } else {
      // Pass the updated decisions to ensure last transaction is saved
      handleFinishReview(newDecisions);
    }
  };

  // Handle skipping a transaction
  const handleSkip = () => {
    const decision = {
      action: 'skip',
      transaction: currentTransaction
    };

    const newDecisions = new Map(reviewDecisions);
    newDecisions.set(currentTransaction.transaction_id || `${currentTransaction.date}-${currentTransaction.amount}`, decision);
    setReviewDecisions(newDecisions);

    if (currentIndex < totalTransactions - 1) {
      goToNext();
    } else {
      // Pass the updated decisions to ensure last transaction is saved
      handleFinishReview(newDecisions);
    }
  };

  // Apply all decisions and close modal
  const handleFinishReview = async (decisionsToApply = reviewDecisions) => {
    // Process all decisions
    for (const decision of decisionsToApply.values()) {
      if (decision.action === 'recategorize') {
        onTransactionRecategorize(decision.transaction, decision.categoryData);

        // Handle goal contribution if specified
        if (decision.goalContribution) {
          try {
            await apiClient.contributeToGoal(
              decision.goalContribution.goalName,
              decision.goalContribution.amount
            );
            console.log('✅ Goal contribution applied:', {
              goal: decision.goalContribution.goalName,
              amount: decision.goalContribution.amount,
              transaction: decision.transaction.merchant_name || decision.transaction.name
            });
          } catch (error) {
            console.error('Failed to contribute to goal:', error);
            // Don't block the categorization if goal contribution fails
          }
        }
      } else if (decision.action === 'accept') {
        // Save the accepted Plaid category so it doesn't show as uncertain again
        const pfc = decision.transaction.personal_finance_category;
        const acceptedCategory = {
          categoryName: pfc?.primary?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Other',
          mappedCategory: pfc?.primary || 'OTHER',
          type: 'variable' // Default to variable, doesn't really matter for accepted categories
        };
        console.log('💾 Accepting Plaid category:', {
          merchant: decision.transaction.merchant_name || decision.transaction.name,
          plaidCategory: pfc?.primary,
          acceptedCategory
        });
        onTransactionRecategorize(decision.transaction, acceptedCategory);
      }
      // 'skip' action doesn't require changes - will show again next time
    }

    onClose();
  };

  // Count similar transactions for batch apply
  const getSimilarTransactionCount = () => {
    if (!currentTransaction) return 0;
    const currentMerchant = getMerchantName(currentTransaction);
    return transactions.filter(t => getMerchantName(t) === currentMerchant).length;
  };

  if (!isOpen || !currentTransaction) return null;

  const confidenceInfo = getConfidenceInfo(currentTransaction);
  const similarTransactionCount = getSimilarTransactionCount();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="p-6">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Transaction {currentIndex + 1} of {totalTransactions}
            </span>
            <span className="text-sm text-gray-500">
              {reviewDecisions.size} reviewed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalTransactions) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Transaction details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">
                {getMerchantName(currentTransaction)}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{currentTransaction.date}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-lg text-gray-900">
                  ${Math.abs(currentTransaction.amount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Confidence indicator */}
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
            confidenceInfo.color === 'red' ? 'bg-red-50 border-red-200' :
            confidenceInfo.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${
              confidenceInfo.color === 'red' ? 'text-red-500' :
              confidenceInfo.color === 'yellow' ? 'text-yellow-500' :
              'text-gray-500'
            }`} />
            <div>
              <div className="font-medium text-sm text-gray-900">
                {confidenceInfo.label}
              </div>
              <div className="text-xs text-gray-600">
                {confidenceInfo.description}
              </div>
            </div>
          </div>

          {/* Current category */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Current Category:</div>
            <div className="font-medium text-gray-900">
              {getCurrentCategoryDisplay(currentTransaction)}
            </div>
          </div>
        </div>

        {/* Goal Contribution Option - Top Level */}
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
                  ${Math.abs(currentTransaction.amount).toFixed(2)} will be added to goal progress
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action options */}
        <div className="space-y-4">
          {/* Accept Plaid's categorization */}
          <button
            onClick={handleAcceptPlaidCategory}
            className="w-full p-4 border-2 border-green-200 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Accept Plaid's Category</div>
                <div className="text-sm text-green-700">Keep the current categorization</div>
              </div>
            </div>
          </button>

          {/* Manual categorization */}
          <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-5 h-5 text-blue-600" />
              <div className="font-medium text-blue-900">Choose Different Category</div>
            </div>

            {/* Category selection */}
            <div className="space-y-3">
              {Object.entries(groupedCategories).map(([groupName, categories]) => (
                categories.length > 0 && (
                  <div key={groupName}>
                    <div className="text-sm font-medium text-gray-700 mb-2">{groupName}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((category) => (
                        <button
                          key={category.name}
                          onClick={() => setSelectedCategory(category.name)}
                          className={`p-2 text-sm rounded border text-left transition-colors ${
                            selectedCategory === category.name
                              ? 'border-blue-500 bg-blue-100 text-blue-900'
                              : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Batch options */}
            {selectedCategory && similarTransactionCount > 1 && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">
                    Apply to Similar Transactions
                  </span>
                </div>
                <div className="text-xs text-purple-700 mb-3">
                  Found {similarTransactionCount} transactions from "{getMerchantName(currentTransaction)}"
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBatchOptions}
                    onChange={(e) => setShowBatchOptions(e.target.checked)}
                    className="rounded border-purple-300 text-purple-600 focus:border-purple-500 focus:ring focus:ring-purple-200"
                  />
                  <span className="text-sm text-purple-900">
                    Apply "{selectedCategory}" to all similar transactions
                  </span>
                </label>
              </div>
            )}

            <button
              onClick={handleManualCategorize}
              disabled={!selectedCategory}
              className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Categorize as "{selectedCategory}"
            </button>
          </div>

          {/* Skip option */}
          <button
            onClick={handleSkip}
            className="w-full p-4 border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <SkipForward className="w-5 h-5 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">Skip for Now</div>
                <div className="text-sm text-gray-600">Review this transaction later</div>
              </div>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={handleFinishReview}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {currentIndex === totalTransactions - 1 ? 'Finish Review' : 'Save & Continue'}
          </button>

          <button
            onClick={goToNext}
            disabled={currentIndex === totalTransactions - 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LowConfidenceTransactionModal;