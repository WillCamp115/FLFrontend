// components/onboarding/steps/GoalsStep.jsx
'use client'
import React, { useState } from 'react';
import { useOnboarding } from '../../../../contexts/OnboardingContext';
import {
  PiggyBank,
  CreditCard,
  Home,
  GraduationCap,
  Car,
  Plane,
  Heart,
  TrendingUp,
  Users,
  Check,
  Edit3,
  Plus
} from 'lucide-react';

const GoalsStep = ({ onNext }) => {
  const { saveUserChoice, userChoices } = useOnboarding();
  const [selectedGoal, setSelectedGoal] = useState(userChoices.primaryGoal || null);
  const [isCustomGoal, setIsCustomGoal] = useState(false);
  const [customGoalTitle, setCustomGoalTitle] = useState('');
  const [customGoalDescription, setCustomGoalDescription] = useState('');

  const goals = [
    {
      id: 'emergency_fund',
      title: 'Build Emergency Fund',
      description: 'Save 3-6 months of expenses for unexpected situations',
      icon: PiggyBank,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      stats: 'Most popular first goal',
      benefit: '$2,000 average emergency fund built in 6 months'
    },
    {
      id: 'debt_payoff',
      title: 'Pay Off Debt',
      description: 'Eliminate credit cards, loans, and other debts faster',
      icon: CreditCard,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      hoverColor: 'hover:bg-red-100',
      stats: 'Save $1,200+ in interest annually',
      benefit: '40% faster payoff with smart tracking'
    },
    {
      id: 'home_purchase',
      title: 'Buy a Home',
      description: 'Save for down payment and closing costs',
      icon: Home,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      stats: 'Average down payment: $45,000',
      benefit: 'Track progress toward homeownership'
    },
    {
      id: 'education',
      title: 'Education Fund',
      description: 'Save for college, courses, or skill development',
      icon: GraduationCap,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:bg-purple-100',
      stats: 'Invest in your future',
      benefit: 'Plan for education without debt'
    },
    {
      id: 'vehicle',
      title: 'Buy a Vehicle',
      description: 'Save for a car, truck, or other transportation',
      icon: Car,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      hoverColor: 'hover:bg-orange-100',
      stats: 'Avoid high interest auto loans',
      benefit: 'Buy with cash and save thousands'
    },
    {
      id: 'vacation',
      title: 'Dream Vacation',
      description: 'Plan and save for travel and experiences',
      icon: Plane,
      color: 'bg-cyan-500',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      hoverColor: 'hover:bg-cyan-100',
      stats: 'Make memories without debt',
      benefit: 'Enjoy travel stress-free'
    },
    {
      id: 'wedding',
      title: 'Wedding Planning',
      description: 'Budget for your special day without financial stress',
      icon: Heart,
      color: 'bg-pink-500',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      hoverColor: 'hover:bg-pink-100',
      stats: 'Average wedding: $30,000',
      benefit: 'Start your marriage debt-free'
    },
    {
      id: 'retirement',
      title: 'Retirement Savings',
      description: 'Build long-term wealth for your future',
      icon: TrendingUp,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      hoverColor: 'hover:bg-indigo-100',
      stats: 'Compound interest is powerful',
      benefit: 'Retire comfortably on your terms'
    },
    {
      id: 'family_goals',
      title: 'Family Financial Goals',
      description: 'Coordinate savings with spouse or family members',
      icon: Users,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      hoverColor: 'hover:bg-emerald-100',
      stats: 'Teamwork makes it easier',
      benefit: 'Shared goals, shared success'
    },
    {
      id: 'custom',
      title: 'Custom Goal',
      description: 'Define your own unique financial objective',
      icon: Edit3,
      color: 'bg-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      hoverColor: 'hover:bg-gray-100',
      stats: 'Personalized for you',
      benefit: 'Create a goal that fits your needs'
    }
  ];

  const handleGoalSelect = (goalId) => {
    setSelectedGoal(goalId);
    if (goalId === 'custom') {
      setIsCustomGoal(true);
    } else {
      setIsCustomGoal(false);
      setCustomGoalTitle('');
      setCustomGoalDescription('');
    }
    saveUserChoice('primaryGoal', goalId);
  };

  const handleContinue = () => {
    if (selectedGoal) {
      if (isCustomGoal && customGoalTitle.trim()) {
        // Save custom goal details
        saveUserChoice('customGoalTitle', customGoalTitle.trim());
        saveUserChoice('customGoalDescription', customGoalDescription.trim());
      }
      // TODO: When backend is ready, save the goal selection to user profile
      // await apiClient.saveOnboardingChoice('primaryGoal', selectedGoal);
      onNext();
    }
  };

  const canContinue = selectedGoal && (!isCustomGoal || customGoalTitle.trim());

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            What's Your Primary Financial Goal?
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            We'll personalize your experience and provide tailored advice based on your most important financial objective.
            You can always add more goals later.
          </p>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {goals.map((goal) => {
            const Icon = goal.icon;
            const isSelected = selectedGoal === goal.id;
            
            return (
              <div
                key={goal.id}
                onClick={() => handleGoalSelect(goal.id)}
                className={`relative cursor-pointer rounded-lg border-2 p-4 sm:p-6 transition-all duration-200 ${
                  isSelected
                    ? `${goal.borderColor} ${goal.bgColor} ring-2 ring-blue-500 ring-opacity-50`
                    : `border-gray-200 bg-white ${goal.hoverColor}`
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${goal.color} rounded-lg flex items-center justify-center mb-3 sm:mb-4`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">{goal.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{goal.description}</p>

                {/* Stats */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">{goal.stats}</p>
                  <p className="text-xs text-gray-500">{goal.benefit}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Goal Input Form */}
        {isCustomGoal && (
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Create Your Custom Goal</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="customTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Title *
                </label>
                <input
                  id="customTitle"
                  type="text"
                  value={customGoalTitle}
                  onChange={(e) => setCustomGoalTitle(e.target.value)}
                  placeholder="e.g., Save for my small business startup"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customGoalTitle.length}/100 characters
                </p>
              </div>

              <div>
                <label htmlFor="customDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="customDescription"
                  value={customGoalDescription}
                  onChange={(e) => setCustomGoalDescription(e.target.value)}
                  placeholder="Provide more details about your goal..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customGoalDescription.length}/200 characters
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`px-6 sm:px-8 py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              canContinue
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue with {
              selectedGoal
                ? isCustomGoal && customGoalTitle.trim()
                  ? customGoalTitle.trim()
                  : goals.find(g => g.id === selectedGoal)?.title
                : 'Selected Goal'
            }
          </button>

          {!canContinue && (
            <p className="text-sm text-gray-500 mt-2">
              {!selectedGoal
                ? 'Please select a goal to continue'
                : isCustomGoal && !customGoalTitle.trim()
                  ? 'Please enter a title for your custom goal'
                  : 'Please select a goal to continue'
              }
            </p>
          )}
        </div>

        {/* Backend Integration Note */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-800">
            <strong>Backend Integration Ready:</strong> Goal selection will be saved to user profile
            and used to personalize dashboard, recommendations, and premium feature suggestions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoalsStep;