import React, { useState } from 'react';
import { Crown, Users, Shield, AlertCircle, Zap, Plus } from 'lucide-react';
import SubscriptionModal from '../modals/SubscriptionModal';
import { canCreateGroup } from '../../utils/subscriptionUtils';

const SubscriptionStatus = ({ userId, groupCount = 0 }) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // TODO: Replace with actual API call when backend is ready
  // const [userSubscription, setUserSubscription] = useState(null);
  // const [loading, setLoading] = useState(true);
  
  // HARDCODED VALUES - Replace when backend is implemented
  const userSubscription = {
    plan: {
      name: "Free",
      max_groups: 1,
      features: ["Basic budgeting", "Transaction tracking", "1 group"],
      price: 0
    },
    status: "active", 
    groups_created: groupCount
  };

  // TODO: Uncomment when backend is ready
  // useEffect(() => {
  //   const fetchSubscription = async () => {
  //     try {
  //       const response = await apiClient.getUserSubscription();
  //       setUserSubscription(response.subscription);
  //     } catch (error) {
  //       console.error('Failed to fetch subscription:', error);
  //       // Set free tier as default
  //       setUserSubscription({
  //         plan: { name: "Free", max_groups: 1, features: ["Basic features"], price: 0 },
  //         status: "active",
  //         groups_created: 0
  //       });
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   fetchSubscription();
  // }, []);

  const getPlanInfo = (planName) => {
    switch (planName?.toLowerCase()) {
      case 'free':
        return {
          icon: Users,
          color: 'bg-gray-100 text-gray-800',
          badgeColor: 'bg-gray-500',
          description: 'Basic financial tracking'
        };
      case 'premium':
      case 'group premium':
        return {
          icon: Crown,
          color: 'bg-blue-100 text-blue-800',
          badgeColor: 'bg-blue-500',
          description: 'Enhanced group features'
        };
      case 'pro':
      case 'advisor pro':
        return {
          icon: Shield,
          color: 'bg-purple-100 text-purple-800',
          badgeColor: 'bg-purple-500',
          description: 'Professional advisor tools'
        };
      default:
        return {
          icon: Users,
          color: 'bg-gray-100 text-gray-800',
          badgeColor: 'bg-gray-500',
          description: 'Financial tracking'
        };
    }
  };

  const planInfo = getPlanInfo(userSubscription?.plan?.name);
  const PlanIcon = planInfo.icon;

  // Determine if user is approaching limits
  const isApproachingGroupLimit = userSubscription?.plan?.max_groups && 
    userSubscription.groups_created >= userSubscription.plan.max_groups;

  const needsUpgrade = userSubscription?.plan?.name?.toLowerCase() === 'free' && 
    userSubscription.groups_created >= 1;

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  const handleCreateGroup = async () => {
    const canCreate = await canCreateGroup(userId, userSubscription.groups_created);
    
    if (!canCreate.canCreate && canCreate.upgradeRequired) {
      alert(`${canCreate.reason}\n\nClick "Upgrade" to unlock more groups with premium features.`);
      setShowUpgradeModal(true);
      return;
    }
    
    // Simulate group creation
    const groupName = prompt('Enter group name:');
    if (groupName) {
      alert(`Group "${groupName}" created successfully! 🎉\n\nIn the real app, this would create a group and redirect you to the group dashboard.`);
      // In a real app, this would call the API and update the UI
      // For now, we'll just reload to simulate updating the group count
      window.location.reload();
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Subscription & Access</h3>
          {userSubscription?.plan?.name?.toLowerCase() === 'free' && (
            <button
              onClick={handleUpgradeClick}
              className="flex items-center bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Zap className="h-4 w-4 mr-1" />
              Upgrade
            </button>
          )}
        </div>

        {/* Current Plan Status */}
        <div className="space-y-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${planInfo.color} mr-3`}>
              <PlanIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <h4 className="font-medium text-gray-900 mr-2">
                  {userSubscription?.plan?.name || 'Free'} Plan
                </h4>
                <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${planInfo.badgeColor}`}>
                  {userSubscription?.status?.toUpperCase() || 'ACTIVE'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{planInfo.description}</p>
              {userSubscription?.plan?.price > 0 && (
                <p className="text-sm text-gray-500">
                  ${userSubscription.plan.price}/month
                </p>
              )}
            </div>
          </div>

          {/* Usage Limits */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Current Usage</h5>
            
            {/* Group Creation Limit */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Groups Created</span>
              <span className={`text-sm font-medium ${isApproachingGroupLimit ? 'text-red-600' : 'text-gray-900'}`}>
                {userSubscription?.groups_created || 0} / {userSubscription?.plan?.max_groups || 1}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all ${
                  isApproachingGroupLimit ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ 
                  width: `${Math.min(100, (userSubscription?.groups_created / userSubscription?.plan?.max_groups) * 100)}%` 
                }}
              />
            </div>

            {/* Warning for limit reached */}
            {needsUpgrade && (
              <div className="flex items-center bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                <AlertCircle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-800 font-medium">Group limit reached</p>
                  <p className="text-amber-700">
                    Upgrade to Premium to create more groups with advanced features.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Current Features */}
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Current Features</h5>
            <div className="space-y-1">
              {userSubscription?.plan?.features?.map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                  {feature}
                </div>
              )) || (
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                  Basic features included
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            {/* Test Create Group Button */}
            <button
              onClick={handleCreateGroup}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Test Create Group
            </button>
            
            {/* Upgrade CTA for Free Users */}
            {userSubscription?.plan?.name?.toLowerCase() === 'free' && (
              <>
                <button
                  onClick={handleUpgradeClick}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
                >
                  Upgrade to Premium - $9.99/month
                </button>
                <p className="text-xs text-gray-500 text-center">
                  Unlock unlimited groups, advanced analytics, and priority support
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
};

export default SubscriptionStatus;