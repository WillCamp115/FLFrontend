// components/onboarding/OnboardingFlow.jsx
'use client'
import React from 'react';
import { useOnboarding, ONBOARDING_STEPS } from '../../../contexts/OnboardingContext';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

// Import step components
import WelcomeStep from './steps/WelcomeStep';
import GoalsStep from './steps/GoalsStep';
import ExperienceStep from './steps/ExperienceStep';
import BudgetDemoStep from './steps/BudgetDemoStep';
import SuccessStep from './steps/SuccessStep';

const OnboardingFlow = () => {
  const {
    isActive,
    currentStep,
    stepIndex,
    nextStep,
    previousStep,
    skipOnboarding,
    getCurrentStepInfo,
    getProgress
  } = useOnboarding();

  if (!isActive) {
    return null;
  }

  const stepInfo = getCurrentStepInfo();
  const progress = getProgress();

  // Step component mapping
  const getStepComponent = () => {
    switch (currentStep) {
      case ONBOARDING_STEPS.WELCOME:
        return <WelcomeStep onNext={nextStep} />;
      case ONBOARDING_STEPS.GOALS:
        return <GoalsStep onNext={nextStep} onPrevious={previousStep} />;
      case ONBOARDING_STEPS.EXPERIENCE:
        return <ExperienceStep onNext={nextStep} onPrevious={previousStep} />;
      case ONBOARDING_STEPS.BUDGET_DEMO:
        return <BudgetDemoStep onNext={nextStep} onPrevious={previousStep} />;
      case ONBOARDING_STEPS.SUCCESS:
        return <SuccessStep />;
      default:
        return <WelcomeStep onNext={nextStep} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header with progress and close */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Get Started with FreedomLedger
              </h2>
              <span className="text-sm text-gray-500">
                Step {stepInfo.current} of {stepInfo.total}
              </span>
            </div>
            
            <button
              onClick={skipOnboarding}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Skip tour"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {getStepComponent()}
        </div>

        {/* Footer with navigation (hidden on welcome and success steps) */}
        {currentStep !== ONBOARDING_STEPS.WELCOME && currentStep !== ONBOARDING_STEPS.SUCCESS && (
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={previousStep}
                disabled={stepIndex === 0}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={skipOnboarding}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Skip Tour
                </button>
                
                <button
                  onClick={nextStep}
                  className="flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;