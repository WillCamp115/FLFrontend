// components/onboarding/steps/SuccessStep.jsx
'use client'
import React, { useState } from 'react';
import { useOnboarding } from '../../../../contexts/OnboardingContext';
import { 
  CheckCircle, 
  Target, 
  TrendingUp, 
  Users, 
  Calendar,
  Crown,
  Sparkles,
  ArrowRight,
  Gift,
  Star,
  Zap,
  ChartBar
} from 'lucide-react';

const SuccessStep = () => {
  const { userChoices, completeOnboarding } = useOnboarding();
  const [showPremiumFeatures, setShowPremiumFeatures] = useState(false);

  // Get personalized content based on user choices
  const getPersonalizedContent = () => {
    const goal = userChoices.primaryGoal;
    const experience = userChoices.experienceLevel;
    const budget = userChoices.demoBudget;

    const goalMessages = {
      emergency_fund: {
        title: "Your Emergency Fund Journey Begins!",
        tip: "Start with just $25/week to build your safety net",
        icon: Target,
        color: "text-green-600"
      },
      debt_payoff: {
        title: "Debt Freedom is Within Reach!",
        tip: "Focus on highest interest debts first for maximum savings",
        icon: TrendingUp,
        color: "text-red-600"
      },
      home_purchase: {
        title: "Your Dream Home Awaits!",
        tip: "Track down payment progress with automated savings goals",
        icon: Target,
        color: "text-blue-600"
      },
      family_goals: {
        title: "Stronger Finances Together!",
        tip: "Invite family members to collaborate on shared goals",
        icon: Users,
        color: "text-purple-600"
      }
    };

    return goalMessages[goal] || goalMessages.emergency_fund;
  };

  const personalizedContent = getPersonalizedContent();
  const PersonalizedIcon = personalizedContent.icon;

  const nextSteps = [
    {
      id: 'connect_bank',
      title: 'Connect Your Bank Account',
      description: 'Securely link accounts to track spending automatically',
      icon: ChartBar,
      action: 'Set up in Settings → Bank Accounts',
      priority: 'High'
    },
    {
      id: 'first_goal',
      title: 'Create Your First Goal',
      description: `Set up your ${userChoices.primaryGoal?.replace('_', ' ')} goal with target amounts`,
      icon: Target,
      action: 'Go to Goals section',
      priority: 'High'
    },
    {
      id: 'refine_budget',
      title: 'Refine Your Budget',
      description: 'Adjust categories based on real spending patterns',
      icon: TrendingUp,
      action: 'Update in Budget section',
      priority: 'Medium'
    },
    {
      id: 'explore_groups',
      title: 'Explore Group Features',
      description: 'Invite family or roommates to collaborate on finances',
      icon: Users,
      action: 'Visit Groups page',
      priority: userChoices.primaryGoal === 'family_goals' ? 'High' : 'Low'
    }
  ];

  const achievements = [
    {
      title: 'Account Created',
      description: 'Welcome to FreedomLedger!',
      icon: CheckCircle,
      completed: true
    },
    {
      title: 'Goal Selected',
      description: `Chose ${userChoices.primaryGoal?.replace('_', ' ')} as primary focus`,
      icon: Target,
      completed: true
    },
    {
      title: 'Experience Set',
      description: `Configured for ${userChoices.experienceLevel} level`,
      icon: Star,
      completed: true
    },
    {
      title: 'Budget Created',
      description: `Built ${userChoices.demoBudget ? '$' + userChoices.demoBudget.monthlyIncome?.toLocaleString() : 'your first'} monthly budget`,
      icon: TrendingUp,
      completed: true
    }
  ];

  const premiumFeatures = [
    {
      title: 'Advanced Analytics',
      description: 'Detailed spending insights and trend analysis',
      icon: ChartBar
    },
    {
      title: 'Group Collaboration',
      description: 'Share budgets and goals with family members',
      icon: Users
    },
    {
      title: 'Premium Support',
      description: 'Priority customer support and personalized advice',
      icon: Crown
    },
    {
      title: 'Data Export',
      description: 'Export your financial data for tax prep and analysis',
      icon: Gift
    }
  ];

  const handleGetStarted = () => {
    // TODO: When backend is ready, save onboarding completion and redirect
    // await apiClient.completeOnboarding({
    //   completedAt: new Date().toISOString(),
    //   userChoices: userChoices,
    //   shouldApplyBudget: true,
    //   shouldCreateInitialGoal: true
    // });
    
    completeOnboarding();
    
    // Simulate applying the onboarding results
    setTimeout(() => {
      window.location.reload(); // In real app, this would redirect to dashboard with new data
    }, 500);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 You're All Set Up!
          </h1>
          
          <div className={`inline-flex items-center px-4 py-2 rounded-full bg-gray-50 mb-4`}>
            <PersonalizedIcon className={`h-5 w-5 mr-2 ${personalizedContent.color}`} />
            <span className="font-semibold text-gray-900">{personalizedContent.title}</span>
          </div>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome to your financial freedom journey! We've personalized your experience based on your goals and preferences.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Achievements */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
              What You've Accomplished
            </h3>
            
            <div className="space-y-4">
              {achievements.map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                  <div key={index} className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Icon className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{achievement.title}</p>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Pro Tip:</strong> {personalizedContent.tip}
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ArrowRight className="h-6 w-6 text-blue-500 mr-2" />
              Your Next Steps
            </h3>
            
            <div className="space-y-4">
              {nextSteps
                .sort((a, b) => {
                  const priorityOrder = { High: 3, Medium: 2, Low: 1 };
                  return priorityOrder[b.priority] - priorityOrder[a.priority];
                })
                .map((step, index) => {
                  const Icon = step.icon;
                  const priorityColors = {
                    High: 'bg-red-100 text-red-700',
                    Medium: 'bg-yellow-100 text-yellow-700', 
                    Low: 'bg-gray-100 text-gray-700'
                  };
                  
                  return (
                    <div key={step.id} className="flex items-start">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{step.title}</p>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColors[step.priority]}`}>
                            {step.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{step.description}</p>
                        <p className="text-xs text-blue-600">{step.action}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Premium Features Teaser */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Crown className="h-6 w-6 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Unlock Premium Features
              </h3>
            </div>
            <button
              onClick={() => setShowPremiumFeatures(!showPremiumFeatures)}
              className="text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              {showPremiumFeatures ? 'Hide' : 'Learn More'}
            </button>
          </div>

          {showPremiumFeatures && (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {premiumFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-center bg-white rounded-lg p-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <Icon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{feature.title}</p>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600 mb-3">
              Get started for free, upgrade anytime for advanced features
            </p>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
              Explore Premium Plans
            </button>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            <Zap className="h-5 w-5 mr-2" />
            Start Your Financial Journey
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            Your personalized dashboard is ready with your budget and goal preferences applied
          </p>
        </div>

        {/* Backend Integration Note */}
        <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-800">
            <strong>Backend Integration Ready:</strong> Upon completion, the system will:
          </p>
          <ul className="text-sm text-emerald-700 mt-2 ml-4 space-y-1">
            <li>• Save user onboarding preferences to profile</li>
            <li>• Create initial budget from demo builder</li>
            <li>• Set up first goal based on selection</li>
            <li>• Configure dashboard for experience level</li>
            <li>• Track onboarding completion analytics</li>
            <li>• Enable personalized recommendations</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SuccessStep;