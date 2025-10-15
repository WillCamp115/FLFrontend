import React, { useState } from 'react';
import { Crown, Users, Shield, Check, X, Star } from 'lucide-react';
import Modal from './Modal';

const SubscriptionModal = ({ isOpen, onClose, groupId = null }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  // HARDCODED PLANS - Replace with API call when backend is ready
  const plans = [
    {
      id: 1,
      name: "Free",
      price: 0,
      interval: "forever",
      description: "Perfect for individuals getting started",
      features: [
        "Create 1 group",
        "Basic budgeting tools",
        "Transaction tracking",
        "Email support"
      ],
      maxGroups: 1,
      popular: false
    },
    {
      id: 2,
      name: "Group Premium",
      price: 9.99,
      interval: "month",
      description: "Ideal for families and small groups",
      features: [
        "Create up to 5 groups",
        "Advanced analytics",
        "Group sharing features",
        "Data export",
        "Priority support",
        "Custom categories"
      ],
      maxGroups: 5,
      popular: true
    },
    {
      id: 3,
      name: "Advisor Pro",
      price: 29.99,
      interval: "month",
      description: "For financial advisors and professionals",
      features: [
        "Unlimited groups",
        "Client management tools",
        "White-label options",
        "Advanced reporting",
        "API access",
        "24/7 support"
      ],
      maxGroups: "Unlimited",
      popular: false
    }
  ];

  const getPlanIcon = (planName) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return Users;
      case 'group premium':
        return Crown;
      case 'advisor pro':
        return Shield;
      default:
        return Users;
    }
  };

  const handleSelectPlan = (plan) => {
    if (plan.name === "Free") {
      // Free plan is already active, just close modal
      onClose();
      return;
    }
    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    
    try {
      // TODO: Replace with actual Stripe integration when backend is ready
      // const result = await apiClient.createSubscription(selectedPlan.id, paymentMethodId);
      
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Successfully upgraded to ${selectedPlan.name}! 🎉\n\nYou can now create up to ${selectedPlan.maxGroups} groups with premium features.`);
      
      onClose();
      // Refresh the page to update the UI
      window.location.reload();
      
    } catch (error) {
      console.error('Subscription failed:', error);
      alert('Subscription failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPlans = () => {
    setSelectedPlan(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Your Plan" size="large">
      <div className="space-y-6">
        {!selectedPlan ? (
          <>
            {/* Plan Selection */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upgrade Your Account
              </h3>
              <p className="text-gray-600">
                Choose the plan that best fits your needs
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => {
                const PlanIcon = getPlanIcon(plan.name);
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                      plan.popular
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                          <Star className="h-3 w-3 mr-1" />
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center">
                      <div className={`inline-flex p-3 rounded-lg mb-4 ${
                        plan.popular ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <PlanIcon className={`h-6 w-6 ${
                          plan.popular ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {plan.name}
                      </h3>

                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">
                          ${plan.price}
                        </span>
                        <span className="text-gray-600">/{plan.interval}</span>
                      </div>

                      <p className="text-sm text-gray-600 mb-6">
                        {plan.description}
                      </p>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-600">
                            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <button
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          plan.name === "Free"
                            ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                            : plan.popular
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                        disabled={plan.name === "Free"}
                      >
                        {plan.name === "Free" ? "Current Plan" : "Select Plan"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>All plans include a 7-day free trial. Cancel anytime.</p>
            </div>
          </>
        ) : (
          <>
            {/* Payment Form Placeholder */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Complete Your Subscription
              </h3>
              <p className="text-gray-600">
                You've selected the {selectedPlan.name} plan
              </p>
            </div>

            {/* Selected Plan Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedPlan.name}</h4>
                  <p className="text-sm text-gray-600">{selectedPlan.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ${selectedPlan.price}
                  </p>
                  <p className="text-sm text-gray-600">per {selectedPlan.interval}</p>
                </div>
              </div>
            </div>

            {/* Payment Form Placeholder */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Payment Integration Coming Soon
                </h4>
                <p className="text-gray-600 mb-4">
                  Stripe payment processing will be integrated once the backend tables are set up.
                </p>
                <div className="bg-white rounded border border-blue-200 p-4 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>What happens next:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Database tables for subscriptions will be created</li>
                    <li>• Stripe payment processing will be integrated</li>
                    <li>• Group creation limits will be enforced</li>
                    <li>• Premium features will be unlocked</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? 'Processing...' : `Subscribe to ${selectedPlan.name}`}
                </button>
                <button
                  onClick={handleBackToPlans}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Back
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default SubscriptionModal;