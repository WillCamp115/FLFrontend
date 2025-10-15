// components/onboarding/steps/ExperienceStep.jsx
'use client'
import React, { useState } from 'react';
import { useOnboarding } from '../../../../contexts/OnboardingContext';
import { 
  BookOpen, 
  TrendingUp, 
  Crown, 
  Check,
  Lightbulb,
  Target,
  Calculator,
  Users,
  ChartBar,
  Shield
} from 'lucide-react';

const ExperienceStep = ({ onNext }) => {
  const { saveUserChoice, userChoices } = useOnboarding();
  const [selectedLevel, setSelectedLevel] = useState(userChoices.experienceLevel || null);

  const experienceLevels = [
    {
      id: 'beginner',
      title: 'Just Getting Started',
      subtitle: 'New to budgeting and financial planning',
      icon: BookOpen,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      description: 'I\'m new to managing money and want to learn the basics',
      features: [
        'Simple budget templates',
        'Basic spending tracking',
        'Educational tips and guides',
        'Step-by-step tutorials'
      ],
      personalizedContent: [
        'We\'ll start with basic budgeting concepts',
        'Simple categories and easy tracking',
        'Helpful tips throughout the app',
        'Focus on building good habits'
      ]
    },
    {
      id: 'intermediate',
      title: 'Some Experience',
      subtitle: 'I have basic budgeting knowledge',
      icon: TrendingUp,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      description: 'I know the basics but want better tools and insights',
      features: [
        'Advanced analytics and charts',
        'Goal tracking and progress',
        'Category customization',
        'Spending trend analysis'
      ],
      personalizedContent: [
        'We\'ll show you advanced features',
        'Detailed analytics and insights',
        'Goal optimization suggestions',
        'Smart spending recommendations'
      ]
    },
    {
      id: 'advanced',
      title: 'Experienced User',
      subtitle: 'I\'m comfortable with financial planning',
      icon: Crown,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:bg-purple-100',
      description: 'I want powerful tools for complex financial management',
      features: [
        'Multi-account tracking',
        'Investment monitoring',
        'Group financial planning',
        'Custom reporting and exports'
      ],
      personalizedContent: [
        'We\'ll unlock all advanced features',
        'Complex multi-account setups',
        'Professional-grade analytics',
        'Group collaboration tools'
      ]
    }
  ];

  const getPersonalizedPreview = (level) => {
    const icons = {
      beginner: [Lightbulb, Target, Calculator, BookOpen],
      intermediate: [ChartBar, Target, TrendingUp, Calculator],
      advanced: [Crown, Users, Shield, ChartBar]
    };

    return {
      features: level.personalizedContent,
      icons: icons[level.id] || icons.beginner
    };
  };

  const handleLevelSelect = (levelId) => {
    setSelectedLevel(levelId);
    saveUserChoice('experienceLevel', levelId);
  };

  const handleContinue = () => {
    if (selectedLevel) {
      // TODO: When backend is ready, save experience level and customize user interface
      // await apiClient.saveOnboardingChoice('experienceLevel', selectedLevel);
      // This will affect:
      // - Dashboard complexity
      // - Feature visibility
      // - Tutorial depth
      // - Recommendation complexity
      onNext();
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What's Your Experience Level?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We'll customize the interface and features to match your comfort level. 
            You can always change this later in your settings.
          </p>
        </div>

        {/* Experience Levels */}
        <div className="space-y-6 mb-8">
          {experienceLevels.map((level) => {
            const Icon = level.icon;
            const isSelected = selectedLevel === level.id;
            const preview = getPersonalizedPreview(level);
            
            return (
              <div
                key={level.id}
                onClick={() => handleLevelSelect(level.id)}
                className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all duration-200 ${
                  isSelected 
                    ? `${level.borderColor} ${level.bgColor} ring-2 ring-blue-500 ring-opacity-50` 
                    : `border-gray-200 bg-white ${level.hoverColor}`
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-6">
                  {/* Icon and Title */}
                  <div className="flex-shrink-0">
                    <div className={`w-16 h-16 ${level.color} rounded-lg flex items-center justify-center mb-4`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{level.title}</h3>
                      <p className="text-gray-600 mb-2">{level.subtitle}</p>
                      <p className="text-sm text-gray-600">{level.description}</p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* What You'll Get */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Features You'll See:</h4>
                        <ul className="space-y-2">
                          {level.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-600">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Personalized Experience */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Your Personalized Experience:</h4>
                        <ul className="space-y-2">
                          {preview.features.map((feature, index) => {
                            const FeatureIcon = preview.icons[index];
                            return (
                              <li key={index} className="flex items-center text-sm text-gray-600">
                                <FeatureIcon className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                                {feature}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={!selectedLevel}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              selectedLevel 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue with {selectedLevel ? experienceLevels.find(l => l.id === selectedLevel)?.title : 'Selected Level'}
          </button>
          
          {!selectedLevel && (
            <p className="text-sm text-gray-500 mt-2">
              Please select your experience level to continue
            </p>
          )}
        </div>

        {/* Backend Integration Note */}
        <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800">
            <strong>Backend Integration Ready:</strong> Experience level will customize:
          </p>
          <ul className="text-sm text-purple-700 mt-2 ml-4 space-y-1">
            <li>• Dashboard complexity and feature visibility</li>
            <li>• Tutorial depth and educational content</li>
            <li>• Recommendation sophistication</li>
            <li>• Premium feature suggestions based on expertise</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExperienceStep;