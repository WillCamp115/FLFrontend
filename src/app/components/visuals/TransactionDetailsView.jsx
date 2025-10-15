// src/components/visuals/TransactionDetailsView.jsx
import React, { useState } from "react";
import { format } from "date-fns";
import { Edit3 } from "lucide-react";
import TransactionRecategorizeModal from "../modals/TransactionRecategorizeModal";

const TransactionDetailsView = ({
  categoryName,
  subcategoryName,
  transactions,
  budgetCategories = [],
  categoryOverrides = {},
  onTransactionRecategorize,
  onClose,
  onBack,
  showBackButton = true
}) => {
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'merchant'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [recategorizeModal, setRecategorizeModal] = useState({
    isOpen: false,
    transaction: null
  });

  // Parse entity_id to get readable merchant name
  const parseEntityId = (entityId) => {
    if (!entityId) return 'Unknown';
    
    // Remove numbers and "Entity" suffix, then format
    const cleaned = entityId
      .replace(/Entity\d+/g, '') // Remove "Entity" + numbers
      .replace(/\d+/g, '') // Remove any remaining numbers
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .trim();
    
    return cleaned || 'Unknown';
  };

  // Sort transactions
  const sortedTransactions = [...transactions].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'date':
        aVal = new Date(a.date);
        bVal = new Date(b.date);
        break;
      case 'amount':
        aVal = a.amount;
        bVal = b.amount;
        break;
      case 'merchant':
        aVal = a.merchant_name || parseEntityId(a.merchant_entity_id);
        bVal = b.merchant_name || parseEntityId(b.merchant_entity_id);
        break;
      default:
        aVal = new Date(a.date);
        bVal = new Date(b.date);
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  const handleCloseClick = () => {
    onClose();
  };

  // Get the effective category for a transaction (override or original)
  const getEffectiveCategory = (transaction) => {
    const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
    const override = categoryOverrides[transactionId];

    if (override) {
      return {
        name: override.categoryName,
        isOverride: true,
        type: override.type
      };
    }

    if (transaction.personal_finance_category?.primary) {
      const primary = transaction.personal_finance_category.primary;
      return {
        name: primary.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        isOverride: false,
        type: null
      };
    }

    return {
      name: transaction.category?.[0] || 'Uncategorized',
      isOverride: false,
      type: null
    };
  };

  // Handle opening recategorize modal
  const handleRecategorize = (transaction) => {
    setRecategorizeModal({
      isOpen: true,
      transaction
    });
  };

  // Handle transaction recategorization
  const handleTransactionRecategorize = (transaction, categoryData) => {
    if (onTransactionRecategorize) {
      onTransactionRecategorize(transaction, categoryData);
    }
    setRecategorizeModal({ isOpen: false, transaction: null });
  };

  // Close recategorize modal
  const closeRecategorizeModal = () => {
    setRecategorizeModal({ isOpen: false, transaction: null });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {subcategoryName} Transactions
            </h3>
            <p className="text-sm text-gray-600">
              {categoryName} → {subcategoryName} → Individual Transactions
            </p>
          </div>
          <div className="flex gap-2">
            {showBackButton && (
              <button
                onClick={handleBackClick}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleCloseClick}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">Total Transactions</p>
            <p className="text-xl font-bold text-blue-900">{transactions.length}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">Total Amount</p>
            <p className="text-xl font-bold text-red-900">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">Average Transaction</p>
            <p className="text-xl font-bold text-green-900">
              ${transactions.length > 0 ? (totalAmount / transactions.length).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="merchant">Merchant</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Order:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-auto">
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {sortedTransactions.map((transaction, index) => (
                <div
                  key={transaction.transaction_id || `${transaction.date}-${transaction.amount}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {/* Merchant Logo or Icon */}
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        {transaction.counterparties?.[0]?.logo_url ? (
                          <img
                            src={transaction.counterparties[0].logo_url}
                            alt=""
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold ${transaction.counterparties?.[0]?.logo_url ? 'hidden' : 'flex'}`}
                        >
                          {(transaction.merchant_name || 
                            transaction.counterparties?.[0]?.name ||
                            parseEntityId(transaction.merchant_entity_id || transaction.counterparties?.[0]?.entity_id) ||
                            'U')[0]?.toUpperCase()}
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {transaction.merchant_name ||
                                   transaction.counterparties?.[0]?.name ||
                                   parseEntityId(transaction.merchant_entity_id || transaction.counterparties?.[0]?.entity_id) ||
                                   'Unknown Merchant'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(transaction.date), 'MMM dd, yyyy')}
                                </p>
                                {transaction.name && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {transaction.name}
                                  </p>
                                )}
                                {/* Category Display */}
                                {(() => {
                                  const effectiveCategory = getEffectiveCategory(transaction);
                                  return (
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        effectiveCategory.isOverride
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {effectiveCategory.isOverride ? '✏️ ' : ''}
                                        {effectiveCategory.name}
                                      </span>
                                      {budgetCategories.length > 0 && (
                                        <button
                                          onClick={() => handleRecategorize(transaction)}
                                          className="text-blue-600 hover:text-blue-800 transition-colors"
                                          title="Recategorize transaction"
                                        >
                                          <Edit3 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className="text-right">
                                <p className="font-bold text-gray-900">
                                  ${transaction.amount.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {transaction.payment_channel}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Details */}
                        {(transaction.location?.city || transaction.location?.address) && (
                          <div className="mt-1 text-xs text-gray-500">
                            📍 {transaction.location.city && `${transaction.location.city}, `}
                            {transaction.location.region}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found for this category.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600 text-center">
          Showing {transactions.length} transactions in {subcategoryName}
        </div>
      </div>

      {/* Recategorize Modal */}
      {recategorizeModal.isOpen && (
        <TransactionRecategorizeModal
          transaction={recategorizeModal.transaction}
          availableCategories={budgetCategories}
          currentCategoryOverride={
            recategorizeModal.transaction
              ? categoryOverrides[
                  recategorizeModal.transaction.transaction_id ||
                  `${recategorizeModal.transaction.date}-${recategorizeModal.transaction.amount}`
                ]
              : null
          }
          onRecategorize={handleTransactionRecategorize}
          onClose={closeRecategorizeModal}
        />
      )}
    </div>
  );
};

export default TransactionDetailsView;