// components/onboarding/steps/BudgetDemoStep.jsx
'use client'
import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../../../../contexts/OnboardingContext';
import { 
  DollarSign, 
  Home, 
  Car, 
  ShoppingCart, 
  Utensils, 
  Gamepad2,
  PiggyBank,
  Plus,
  Minus,
  Check,
  AlertCircle,
  TrendingUp,
  Target
} from 'lucide-react';

const BudgetDemoStep = ({ onNext }) => {
  const { saveUserChoice, userChoices } = useOnboarding();
  const [monthlyIncome, setMonthlyIncome] = useState(userChoices.demoIncome || 5000);
  const [budgetCategories, setBudgetCategories] = useState({
    housing: 1500,
    transportation: 400,
    food: 600,
    utilities: 200,
    entertainment: 300,
    savings: 500,
    other: 500
  });

  const categories = [
    { 
      id: 'housing', 
      name: 'Housing', 
      icon: Home, 
      color: 'bg-blue-500',
      description: 'Rent, mortgage, insurance',
      recommended: 30
    },
    { 
      id: 'transportation', 
      name: 'Transportation', 
      icon: Car, 
      color: 'bg-green-500',
      description: 'Car payment, gas, maintenance',
      recommended: 15
    },
    { 
      id: 'food', 
      name: 'Food & Dining', 
      icon: Utensils, 
      color: 'bg-orange-500',
      description: 'Groceries, restaurants',
      recommended: 12
    },
    { 
      id: 'utilities', 
      name: 'Utilities', 
      icon: DollarSign, 
      color: 'bg-yellow-500',
      description: 'Electric, water, internet',
      recommended: 8
    },
    { 
      id: 'entertainment', 
      name: 'Entertainment', 
      icon: Gamepad2, 
      color: 'bg-purple-500',
      description: 'Movies, hobbies, subscriptions',
      recommended: 10
    },
    { 
      id: 'savings', 
      name: 'Savings & Goals', 
      icon: PiggyBank, 
      color: 'bg-emerald-500',
      description: 'Emergency fund, investments',
      recommended: 20
    },
    { 
      id: 'other', 
      name: 'Other Expenses', 
      icon: ShoppingCart, 
      color: 'bg-gray-500',
      description: 'Miscellaneous spending',
      recommended: 5
    }
  ];

  const totalBudget = Object.values(budgetCategories).reduce((sum, amount) => sum + amount, 0);
  const remaining = monthlyIncome - totalBudget;
  const isBalanced = Math.abs(remaining) < 50; // Allow small variance

  const updateCategory = (categoryId, newAmount) => {
    setBudgetCategories(prev => ({
      ...prev,
      [categoryId]: Math.max(0, newAmount)
    }));
  };

  const getRecommendedAmount = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return Math.round((monthlyIncome * category.recommended) / 100);
  };

  const applyRecommended = () => {
    const recommended = {};
    categories.forEach(category => {
      recommended[category.id] = getRecommendedAmount(category.id);
    });
    setBudgetCategories(recommended);
  };

  const handleContinue = () => {
    // Save the demo budget for use in the app
    const demoBudget = {
      monthlyIncome,
      categories: budgetCategories,
      createdDuringOnboarding: true
    };
    
    saveUserChoice('demoBudget', demoBudget);
    
    // TODO: When backend is ready, save this as the user's first budget
    // await apiClient.createBudget(demoBudget);
    
    onNext();
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Let's Build Your First Budget
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This interactive demo will help you create a realistic budget. 
            Don't worry about getting it perfect - you can always adjust it later!
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Budget Builder */}
          <div className="lg:col-span-2">
            {/* Monthly Income */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Income</h3>
                <div className="text-2xl font-bold text-green-600">
                  ${monthlyIncome.toLocaleString()}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="text-sm text-gray-600">Adjust your monthly income:</label>
                <input
                  type="range"
                  min="2000"
                  max="15000"
                  step="250"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(parseInt(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-1 border border-gray-300 rounded text-center"
                />
              </div>
            </div>

            {/* Budget Categories */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Budget Categories</h3>
                <button
                  onClick={applyRecommended}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Use Recommended %
                </button>
              </div>

              {categories.map((category) => {
                const Icon = category.icon;
                const amount = budgetCategories[category.id];
                const percentage = monthlyIncome ? (amount / monthlyIncome * 100) : 0;
                const recommended = getRecommendedAmount(category.id);
                const isOverRecommended = amount > recommended * 1.2;
                
                return (
                  <div key={category.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <p className="text-sm text-gray-500">{category.description}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${isOverRecommended ? 'text-red-600' : 'text-gray-900'}`}>
                          ${amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {percentage.toFixed(1)}% of income
                        </div>
                      </div>
                    </div>

                    {/* Amount Controls */}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => updateCategory(category.id, amount - 50)}
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      
                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max={monthlyIncome * 0.6}
                          step="25"
                          value={amount}
                          onChange={(e) => updateCategory(category.id, parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>$0</span>
                          <span className="text-blue-600">
                            Recommended: ${recommended.toLocaleString()} ({category.recommended}%)
                          </span>
                          <span>${Math.round(monthlyIncome * 0.6).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => updateCategory(category.id, amount + 50)}
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Budget Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Summary</h3>
              
              {/* Income vs Expenses */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Income:</span>
                  <span className="font-semibold text-green-600">
                    ${monthlyIncome.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Budget:</span>
                  <span className="font-semibold text-gray-900">
                    ${totalBudget.toLocaleString()}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Remaining:</span>
                    <span className={`font-semibold ${
                      remaining > 0 ? 'text-green-600' : remaining < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {remaining >= 0 ? '+' : ''}${remaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className={`p-4 rounded-lg mb-6 ${
                isBalanced ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center">
                  {isBalanced ? (
                    <Check className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  )}
                  <div>
                    <p className={`font-medium ${isBalanced ? 'text-green-800' : 'text-yellow-800'}`}>
                      {isBalanced ? 'Budget Balanced!' : 'Needs Adjustment'}
                    </p>
                    <p className={`text-sm ${isBalanced ? 'text-green-700' : 'text-yellow-700'}`}>
                      {isBalanced 
                        ? 'Your budget looks great!' 
                        : remaining > 0 
                          ? 'Consider allocating remaining funds to savings or goals'
                          : 'You\'re spending more than you earn'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleContinue}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                Save This Budget
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-2">
                You can modify this anytime in your dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Backend Integration Note */}
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Backend Integration Ready:</strong> This budget will be saved as the user's first budget template and can be:
          </p>
          <ul className="text-sm text-green-700 mt-2 ml-4 space-y-1">
            <li>• Automatically applied to their dashboard</li>
            <li>• Used as the basis for spending tracking</li>
            <li>• Modified and refined over time</li>
            <li>• Shared with group members (premium feature)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BudgetDemoStep;