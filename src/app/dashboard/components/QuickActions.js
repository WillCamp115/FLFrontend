import React from 'react';
import { DollarSign, Target, TrendingUp, CreditCard } from 'lucide-react';

const QuickActions = ({ userHasBudget, userHasGoals, userHasDebtGoals, onQuickAccess }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <button
        onClick={() => onQuickAccess('budget')}
        className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-3"
      >
        <DollarSign className="text-green-600" size={24} />
        <div className="text-left">
          <p className="font-semibold text-gray-900">Budget</p>
          <p className="text-sm text-gray-600">
            {userHasBudget ? 'View & manage' : 'Create budget'}
          </p>
        </div>
      </button>

      <button
        onClick={() => onQuickAccess('goals')}
        className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-3"
      >
        <Target className="text-blue-600" size={24} />
        <div className="text-left">
          <p className="font-semibold text-gray-900">Goals</p>
          <p className="text-sm text-gray-600">
            {userHasGoals ? 'Track progress' : 'Set first goal'}
          </p>
        </div>
      </button>

      <button
        onClick={() => onQuickAccess('spending')}
        className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-3"
      >
        <TrendingUp className="text-purple-600" size={24} />
        <div className="text-left">
          <p className="font-semibold text-gray-900">Spending</p>
          <p className="text-sm text-gray-600">View insights</p>
        </div>
      </button>

      <button
        onClick={() => onQuickAccess('debt')}
        className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-3"
      >
        <CreditCard className="text-red-600" size={24} />
        <div className="text-left">
          <p className="font-semibold text-gray-900">Debts</p>
          <p className="text-sm text-gray-600">
            {userHasDebtGoals ? 'Manage payments' : 'Add debt goal'}
          </p>
        </div>
      </button>
    </div>
  );
};

export default QuickActions;