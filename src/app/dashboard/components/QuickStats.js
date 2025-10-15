import React from 'react';
import { Target, DollarSign, CreditCard, TrendingUp } from 'lucide-react';

const QuickStats = ({ totalGoals, totalSpending, debtGoalsCount, userHasBudget }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <Target className="text-blue-600" size={24} />
          <div>
            <p className="text-sm text-gray-600">Active Goals</p>
            <p className="text-2xl font-bold text-gray-900">{totalGoals}</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <DollarSign className="text-green-600" size={24} />
          <div>
            <p className="text-sm text-gray-600">This Month&apos;s Spending</p>
            <p className="text-2xl font-bold text-gray-900">${totalSpending.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <CreditCard className="text-red-600" size={24} />
          <div>
            <p className="text-sm text-gray-600">Debt Goals</p>
            <p className="text-2xl font-bold text-gray-900">{debtGoalsCount}</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-purple-600" size={24} />
          <div>
            <p className="text-sm text-gray-600">Budget Status</p>
            <p className="text-2xl font-bold text-gray-900">
              {userHasBudget ? 'Active' : 'None'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;