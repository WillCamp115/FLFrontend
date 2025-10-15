// contexts/OnboardingContext.js
'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

// Onboarding steps configuration
export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  GOALS: 'goals', 
  EXPERIENCE: 'experience',
  BUDGET_DEMO: 'budget_demo',
  SUCCESS: 'success'
};

const TOTAL_STEPS = Object.keys(ONBOARDING_STEPS).length;

// Default onboarding state
const DEFAULT_STATE = {
  isActive: false,
  currentStep: ONBOARDING_STEPS.WELCOME,
  stepIndex: 0,
  userChoices: {
    primaryGoal: null,
    experienceLevel: null,
    interestedFeatures: [],
    demographicInfo: null
  },
  completed: false,
  skipped: false,
  startedAt: null,
  completedAt: null
};

export const OnboardingProvider = ({ children }) => {
  const [onboardingState, setOnboardingState] = useState(DEFAULT_STATE);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('freedomledger_onboarding');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setOnboardingState(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error parsing saved onboarding state:', error);
        localStorage.removeItem('freedomledger_onboarding');
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (onboardingState.isActive || onboardingState.completed || onboardingState.skipped) {
      localStorage.setItem('freedomledger_onboarding', JSON.stringify(onboardingState));
    }
  }, [onboardingState]);

  // Start onboarding
  const startOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isActive: true,
      currentStep: ONBOARDING_STEPS.WELCOME,
      stepIndex: 0,
      startedAt: new Date().toISOString(),
      completed: false,
      skipped: false
    }));
  };

  // Go to next step
  const nextStep = () => {
    const steps = Object.values(ONBOARDING_STEPS);
    const currentIndex = steps.indexOf(onboardingState.currentStep);
    
    if (currentIndex < steps.length - 1) {
      const nextStepName = steps[currentIndex + 1];
      setOnboardingState(prev => ({
        ...prev,
        currentStep: nextStepName,
        stepIndex: currentIndex + 1
      }));
    } else {
      // Reached the end
      completeOnboarding();
    }
  };

  // Go to previous step
  const previousStep = () => {
    const steps = Object.values(ONBOARDING_STEPS);
    const currentIndex = steps.indexOf(onboardingState.currentStep);
    
    if (currentIndex > 0) {
      const prevStepName = steps[currentIndex - 1];
      setOnboardingState(prev => ({
        ...prev,
        currentStep: prevStepName,
        stepIndex: currentIndex - 1
      }));
    }
  };

  // Skip onboarding
  const skipOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isActive: false,
      skipped: true,
      completedAt: new Date().toISOString()
    }));
  };

  // Complete onboarding successfully
  const completeOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      isActive: false,
      completed: true,
      completedAt: new Date().toISOString()
    }));
  };

  // Save user choice
  const saveUserChoice = (key, value) => {
    setOnboardingState(prev => ({
      ...prev,
      userChoices: {
        ...prev.userChoices,
        [key]: value
      }
    }));
  };

  // Reset onboarding (for testing or restart)
  const resetOnboarding = () => {
    localStorage.removeItem('freedomledger_onboarding');
    setOnboardingState(DEFAULT_STATE);
  };

  // Check if should show onboarding (new user who hasn't completed or skipped)
  const shouldShowOnboarding = () => {
    return !onboardingState.completed && !onboardingState.skipped;
  };

  // Get progress percentage
  const getProgress = () => {
    return Math.round((onboardingState.stepIndex / (TOTAL_STEPS - 1)) * 100);
  };

  // Get current step info
  const getCurrentStepInfo = () => {
    return {
      current: onboardingState.stepIndex + 1,
      total: TOTAL_STEPS,
      percentage: getProgress(),
      stepName: onboardingState.currentStep
    };
  };

  const value = {
    // State
    ...onboardingState,
    
    // Actions
    startOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    saveUserChoice,
    resetOnboarding,
    
    // Helpers
    shouldShowOnboarding,
    getProgress,
    getCurrentStepInfo,
    
    // Constants
    STEPS: ONBOARDING_STEPS,
    TOTAL_STEPS
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingProvider;