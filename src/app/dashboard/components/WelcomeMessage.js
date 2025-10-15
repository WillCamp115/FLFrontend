import React from 'react';
import { Sparkles } from 'lucide-react';

const WelcomeMessage = ({ 
  userHasBudget, 
  userHasGoals, 
  userHasDebtGoals,
  onCreateBudget,
  onCreateGoal,
  onViewTemplates
}) => {
  if (!userHasBudget && !userHasGoals && !userHasDebtGoals) {
    return (
      <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-center">
          <h2 className="text-xl font-bold text-blue-900 mb-2">Welcome to FreedomLedger!</h2>
          <p className="text-blue-800 mb-4">Let&apos;s get you started on your financial journey. Begin by creating a budget or setting your first financial goal.</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={onCreateBudget}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Budget
            </button>
            <button
              onClick={onCreateGoal}
              className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              Set a Financial Goal
            </button>
          </div>
        </div>
      </div>
    );
  }

  if ((userHasGoals || userHasDebtGoals) && !userHasBudget) {
    return (
      <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to Create Your Budget?
            </h3>
            <p className="text-gray-700">
              Use our AI-powered budget templates based on your spending patterns and goals.
            </p>
          </div>
          <button
            onClick={onViewTemplates}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Sparkles size={16} />
            View Smart Templates
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default WelcomeMessage;