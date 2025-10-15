'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { Loader, CheckCircle, XCircle, AlertCircle, ArrowRight, ArrowLeft, Plus, Trash2, Edit3 } from 'lucide-react';

const OnboardingPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestedGoals, setSuggestedGoals] = useState([]);
  const [selectedGoals, setSelectedGoals] = useState(new Set());
  const [customGoals, setCustomGoals] = useState([]);
  const [editingGoal, setEditingGoal] = useState(null);
  
  const router = useRouter();
  const { user } = useAuth();

  // Fetch suggested goals from liabilities
  useEffect(() => {
    const fetchSuggestedGoals = async () => {
      try {
        setLoading(true);
        console.log('Fetching suggested debt goals from liabilities...');
        const goals = await apiClient.getSuggestedDebtGoalsFromLiabilities();
        console.log('Received goals from API:', goals);
        setSuggestedGoals(goals || []); // Ensure goals is always an array
        
        // Auto-select all goals by default
        const allGoalIds = new Set((goals || []).map((_, index) => index));
        setSelectedGoals(allGoalIds);
        
        // If no goals were found, show a friendly message instead of an error
        if (!goals || goals.length === 0) {
          console.log('No liability accounts found - user can proceed without debt goals');
        } else {
          console.log(`Found ${goals.length} suggested debt goals`);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching suggested goals:', err);
        console.error('Error details:', err.response?.data || err.message);
        // Gracefully handle the error - don't block the user from proceeding
        setSuggestedGoals([]);
        setSelectedGoals(new Set());
        setError(null); // Don't show error for missing liabilities
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSuggestedGoals();
    }
  }, [user]);

  const handleGoalToggle = (index) => {
    const newSelected = new Set(selectedGoals);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedGoals(newSelected);
  };

  const handleGoalEdit = (index, field, value) => {
    const updatedGoals = [...suggestedGoals];
    updatedGoals[index] = {
      ...updatedGoals[index],
      [field]: field === 'target_amount' || field === 'interest_rate' ? parseFloat(value) || 0 : value
    };
    setSuggestedGoals(updatedGoals);
  };

  const addCustomGoal = () => {
    const newGoal = {
      goal_name: '',
      target_amount: 0,
      progress: 0,
      interest_rate: 0,
      interest_type: 'monthly',  // Default to monthly compounding
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      account_id: 'custom',
      account_name: 'Custom Goal',
      minimum_payment: 0,
      current_balance: 0,
      debt_type: 'custom',
      isCustom: true
    };
    setCustomGoals([...customGoals, newGoal]);
  };

  const removeCustomGoal = (index) => {
    const updated = customGoals.filter((_, i) => i !== index);
    setCustomGoals(updated);
  };

  const handleCustomGoalEdit = (index, field, value) => {
    const updated = [...customGoals];
    updated[index] = {
      ...updated[index],
      [field]: field === 'target_amount' || field === 'interest_rate' 
        ? parseFloat(value) || 0 : value
    };
    setCustomGoals(updated);
  };

  const handleFinishOnboarding = async () => {
    try {
      setLoading(true);
      
      // Prepare selected goals for creation
      const goalsToCreate = [];
      
      // Add selected suggested goals
      suggestedGoals.forEach((goal, index) => {
        if (selectedGoals.has(index)) {
          goalsToCreate.push(goal);
        }
      });
      
      // Add custom goals
      customGoals.forEach(goal => {
        if (goal.goal_name.trim()) { // Only add if name is provided
          goalsToCreate.push(goal);
        }
      });

      if (goalsToCreate.length > 0) {
        await apiClient.createDebtGoalsFromSuggestions(goalsToCreate);
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Error creating goals:', err);
      setError('Error saving your goals. Please try again.');
      setLoading(false);
    }
  };

  const skipOnboarding = () => {
    router.push('/dashboard');
  };

  if (loading && suggestedGoals.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Analyzing your financial accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to FreedomLedger!
            </h1>
            <p className="text-lg text-gray-600">
              We&apos;ve analyzed your accounts and found some debt that we can help you pay off faster.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="ml-2 text-sm text-gray-600">Account Linked</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">2</span>
                </div>
                <span className="ml-2 text-sm text-gray-900 font-medium">Set Goals</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm">3</span>
                </div>
                <span className="ml-2 text-sm text-gray-600">Dashboard</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Goals Section */}
          {suggestedGoals.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Suggested Debt Payoff Goals
                </h2>
                <p className="text-gray-600 mb-6">
                  Based on your linked accounts, we suggest these goals to help you become debt-free faster.
                </p>

                <div className="space-y-4">
                  {suggestedGoals.map((goal, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedGoals.has(index)}
                          onChange={() => handleGoalToggle(index)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Goal Name
                              </label>
                              <input
                                type="text"
                                value={goal.goal_name}
                                onChange={(e) => handleGoalEdit(index, 'goal_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Balance
                              </label>
                              <input
                                type="number"
                                value={goal.target_amount}
                                onChange={(e) => handleGoalEdit(index, 'target_amount', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Interest Rate (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={goal.interest_rate}
                                onChange={(e) => handleGoalEdit(index, 'interest_rate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Interest Compounding
                              </label>
                              <select
                                value={goal.interest_type}
                                onChange={(e) => handleGoalEdit(index, 'interest_type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                              </select>
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-gray-600">
                            <span className="font-medium">Account:</span> {goal.account_name} • 
                            <span className="font-medium ml-2">Type:</span> {goal.debt_type} • 
                            <span className="font-medium ml-2">Compounding:</span> {goal.interest_type} • 
                            <span className="font-medium ml-2">Minimum payment:</span> ${goal.minimum_payment.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Debt Payoff Goals
                </h2>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Great news!</h3>
                    <p className="text-gray-600 mb-4">
                      We didn&apos;t find any liability accounts that need debt payoff goals. 
                      You can still add custom financial goals if you&apos;d like.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Goals Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Additional Goals
                </h2>
                <button
                  onClick={addCustomGoal}
                  className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Custom Goal
                </button>
              </div>

              {customGoals.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No additional goals yet. Click &quot;Add Custom Goal&quot; to create one.
                </p>
              ) : (
                <div className="space-y-4">
                  {customGoals.map((goal, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Goal Name
                            </label>
                            <input
                              type="text"
                              value={goal.goal_name}
                              onChange={(e) => handleCustomGoalEdit(index, 'goal_name', e.target.value)}
                              placeholder="e.g., Pay off Credit Card"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Target Amount ($)
                            </label>
                            <input
                              type="number"
                              value={goal.target_amount}
                              onChange={(e) => handleCustomGoalEdit(index, 'target_amount', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Interest Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={goal.interest_rate}
                              onChange={(e) => handleCustomGoalEdit(index, 'interest_rate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Interest Compounding
                            </label>
                            <select
                              value={goal.interest_type}
                              onChange={(e) => handleCustomGoalEdit(index, 'interest_type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={() => removeCustomGoal(index)}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={skipOnboarding}
              className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Skip for now
            </button>
            <div className="flex space-x-3">
              <span className="text-sm text-gray-600">
                {selectedGoals.size + customGoals.filter(g => g.goal_name.trim()).length} goals selected
              </span>
              <button
                onClick={handleFinishOnboarding}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="animate-spin w-4 h-4 mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Continue to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default OnboardingPage;