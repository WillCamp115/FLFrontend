// components/onboarding/steps/WelcomeStep.jsx
'use client'
import React from 'react';
import { TrendingUp, Users, Shield, Zap, ArrowRight, Star } from 'lucide-react';

const WelcomeStep = ({ onNext }) => {
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto text-center">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="h-10 w-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Your Financial Freedom Journey
          </h1>
          
          <p className="text-xl text-gray-600 mb-6">
            Take control of your finances with smart budgeting, goal tracking, and group collaboration. 
            We'll help you build better money habits in just a few minutes.
          </p>

          {/* Success Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">$2,400</div>
              <div className="text-sm text-gray-600">Average annual savings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">87%</div>
              <div className="text-sm text-gray-600">Reach their goals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">5 min</div>
              <div className="text-sm text-gray-600">Setup time</div>
            </div>
          </div>
        </div>

        {/* Key Features Preview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Budgeting</h3>
            <p className="text-sm text-gray-600">AI-powered insights help you spend smarter and save more</p>
          </div>

          <div className="bg-green-50 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Group Finances</h3>
            <p className="text-sm text-gray-600">Collaborate on budgets with family, roommates, or partners</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Bank-Level Security</h3>
            <p className="text-sm text-gray-600">Your data is encrypted and protected with industry standards</p>
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
            ))}
            <span className="ml-2 text-gray-600 font-medium">4.9/5</span>
          </div>
          <p className="text-gray-600 italic">
            "FreedomLedger helped me pay off $15,000 in debt and build my emergency fund. The group features kept my family motivated!"
          </p>
          <p className="text-sm text-gray-500 mt-2">- Sarah M., Teacher</p>
        </div>

        {/* CTA Section */}
        <div className="space-y-4">
          <button
            onClick={onNext}
            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            <Zap className="h-5 w-5 mr-2" />
            Let's Get Started
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
          
          <p className="text-sm text-gray-500">
            This quick setup takes about 3 minutes and you can skip any step
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeStep;