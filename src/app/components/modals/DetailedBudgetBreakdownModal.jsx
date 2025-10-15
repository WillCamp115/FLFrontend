import React from 'react';
import Modal from './Modal';
import { X, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

const DetailedBudgetBreakdownModal = ({
  isOpen,
  onClose,
  categoryName,
  detailedBreakdown,
  mainCategoryData
}) => {
  if (!detailedBreakdown || detailedBreakdown.length === 0) {
    return null;
  }

  const totalDetailedLimit = detailedBreakdown.reduce((sum, detail) => sum + detail.limit, 0);
  const totalDetailedSpent = detailedBreakdown.reduce((sum, detail) => sum + detail.spent, 0);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`${categoryName} - Detailed Breakdown`}
      size="lg"
    >
      <div className="p-6">
        {/* Main category summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Category Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Budget</p>
                <p className="text-xl font-bold text-blue-900">
                  ${mainCategoryData?.limit?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <DollarSign className="text-purple-600" size={20} />
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Spent</p>
                <p className="text-xl font-bold text-purple-900">
                  ${mainCategoryData?.spent?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {mainCategoryData?.isOverBudget ? (
                <AlertTriangle className="text-red-600" size={20} />
              ) : (
                <DollarSign className="text-green-600" size={20} />
              )}
              <div>
                <p className={`text-sm font-medium ${mainCategoryData?.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                  {mainCategoryData?.isOverBudget ? 'Over Budget' : 'Remaining'}
                </p>
                <p className={`text-xl font-bold ${mainCategoryData?.isOverBudget ? 'text-red-900' : 'text-green-900'}`}>
                  ${Math.abs(mainCategoryData?.remaining || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Overall progress bar */}
          {mainCategoryData && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">Overall Progress</h4>
                <span className={`text-sm font-medium ${mainCategoryData.percentage > 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  {mainCategoryData.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    mainCategoryData.percentage > 100 ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(mainCategoryData.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Detailed breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Spending Breakdown</h3>
          <div className="space-y-3">
            {detailedBreakdown.map((detail, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">{detail.name}</h4>
                  <span className={`text-sm font-medium ${detail.spent > detail.limit ? 'text-red-600' : 'text-green-600'}`}>
                    ${detail.spent.toFixed(2)} / ${detail.limit.toFixed(2)}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      detail.spent > detail.limit ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(detail.percentage, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    {detail.spent > detail.limit
                      ? `$${Math.abs(detail.remaining).toFixed(2)} over budget`
                      : `$${detail.remaining.toFixed(2)} remaining`
                    }
                  </span>
                  <span>{detail.percentage.toFixed(1)}% used</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary comparison */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Detailed vs Total Comparison</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-700">Detailed Budget Total: <span className="font-semibold">${totalDetailedLimit.toFixed(2)}</span></p>
              <p className="text-blue-700">Detailed Spending Total: <span className="font-semibold">${totalDetailedSpent.toFixed(2)}</span></p>
            </div>
            <div>
              <p className="text-blue-700">Main Category Budget: <span className="font-semibold">${(mainCategoryData?.limit || 0).toFixed(2)}</span></p>
              <p className="text-blue-700">Main Category Spending: <span className="font-semibold">${(mainCategoryData?.spent || 0).toFixed(2)}</span></p>
            </div>
          </div>
          {totalDetailedLimit !== (mainCategoryData?.limit || 0) && (
            <p className="text-orange-700 text-xs mt-2 italic">
              Note: Detailed budget total differs from main category budget. 
              Unallocated amount: ${Math.abs(totalDetailedLimit - (mainCategoryData?.limit || 0)).toFixed(2)}
            </p>
          )}
        </div>

        {/* Close button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DetailedBudgetBreakdownModal;