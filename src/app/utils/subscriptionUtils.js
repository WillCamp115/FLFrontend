// Subscription utility functions
// This file will help manage subscription limits and features throughout the app

/**
 * Get user's current subscription plan (hardcoded for now)
 * TODO: Replace with actual API call when backend is ready
 */
export const getUserSubscriptionPlan = async (userId) => {
  // Hardcoded for now - will be replaced with API call
  return {
    name: "Free",
    max_groups: 1,
    features: ["Basic budgeting", "Transaction tracking", "1 group"],
    price: 0,
    status: "active"
  };
};

/**
 * Check if user can create a new group based on their subscription
 */
export const canCreateGroup = async (userId, currentGroupCount) => {
  try {
    const subscription = await getUserSubscriptionPlan(userId);
    
    // Free users can only create 1 group
    if (subscription.name.toLowerCase() === 'free') {
      return {
        canCreate: currentGroupCount < 1,
        reason: currentGroupCount >= 1 ? 'Free plan allows only 1 group. Upgrade to Premium for more groups.' : null,
        upgradeRequired: currentGroupCount >= 1
      };
    }
    
    // Premium users can create up to 5 groups
    if (subscription.name.toLowerCase().includes('premium')) {
      return {
        canCreate: currentGroupCount < 5,
        reason: currentGroupCount >= 5 ? 'Premium plan allows up to 5 groups. Upgrade to Pro for unlimited groups.' : null,
        upgradeRequired: currentGroupCount >= 5
      };
    }
    
    // Pro users have unlimited groups
    return {
      canCreate: true,
      reason: null,
      upgradeRequired: false
    };
    
  } catch (error) {
    console.error('Error checking group creation limits:', error);
    // Default to allowing creation if check fails
    return {
      canCreate: true,
      reason: null,
      upgradeRequired: false
    };
  }
};

/**
 * Get subscription plan limits and features
 */
export const getSubscriptionLimits = (planName) => {
  const plans = {
    'free': {
      max_groups: 1,
      max_members_per_group: 5,
      features: ['Basic budgeting', 'Transaction tracking', '1 group'],
      price: 0
    },
    'premium': {
      max_groups: 5,
      max_members_per_group: 50,
      features: ['Advanced analytics', 'Up to 5 groups', 'Data export', 'Priority support'],
      price: 9.99
    },
    'pro': {
      max_groups: 'unlimited',
      max_members_per_group: 'unlimited',
      features: ['Unlimited groups', 'Client management', 'White-label', 'API access'],
      price: 29.99
    }
  };
  
  return plans[planName?.toLowerCase()] || plans['free'];
};

/**
 * Format subscription status for display
 */
export const formatSubscriptionStatus = (subscription) => {
  if (!subscription) {
    return {
      displayName: 'Free',
      statusColor: 'gray',
      description: 'Basic features'
    };
  }
  
  const planName = subscription.plan?.name?.toLowerCase() || 'free';
  
  switch (planName) {
    case 'free':
      return {
        displayName: 'Free',
        statusColor: 'gray',
        description: 'Basic financial tracking'
      };
    case 'premium':
    case 'group premium':
      return {
        displayName: 'Premium',
        statusColor: 'blue',
        description: 'Enhanced group features'
      };
    case 'pro':
    case 'advisor pro':
      return {
        displayName: 'Pro',
        statusColor: 'purple',
        description: 'Professional advisor tools'
      };
    default:
      return {
        displayName: 'Free',
        statusColor: 'gray',
        description: 'Basic features'
      };
  }
};

/**
 * Show subscription upgrade modal if needed
 * This is a helper function that components can use
 */
export const checkAndPromptUpgrade = async (userId, currentGroupCount, onUpgradeNeeded) => {
  const canCreate = await canCreateGroup(userId, currentGroupCount);
  
  if (!canCreate.canCreate && canCreate.upgradeRequired) {
    if (onUpgradeNeeded) {
      onUpgradeNeeded(canCreate.reason);
    }
    return false;
  }
  
  return true;
};

/**
 * Get appropriate plan recommendations based on current usage
 */
export const getRecommendedPlan = (currentGroupCount, userType = 'individual') => {
  if (userType === 'advisor') {
    return 'pro';
  }
  
  if (currentGroupCount >= 2) {
    return 'premium';
  }
  
  return 'free';
};

// Export all functions as default object as well for easier importing
export default {
  getUserSubscriptionPlan,
  canCreateGroup,
  getSubscriptionLimits,
  formatSubscriptionStatus,
  checkAndPromptUpgrade,
  getRecommendedPlan
};