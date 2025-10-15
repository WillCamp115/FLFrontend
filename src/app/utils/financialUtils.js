// src/utils/financialUtils.js

/**
 * Financial calculation utilities for FreedomLedger
 */

// Currency formatting
export const formatCurrency = (amount, options = {}) => {
  const {
    currency = 'USD',
    locale = 'en-US',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount || 0);
};

// Percentage formatting
export const formatPercentage = (value, decimals = 1) => {
  return `${(value || 0).toFixed(decimals)}%`;
};

// Calculate loan payment using PMT formula
export const calculateLoanPayment = (principal, annualRate, years) => {
  if (!principal || !annualRate || !years) return 0;
  
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;
  
  if (monthlyRate === 0) {
    return principal / numberOfPayments;
  }
  
  const monthlyPayment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
  return monthlyPayment;
};

// Calculate time to pay off debt
export const calculatePayoffTime = (principal, monthlyPayment, annualInterestRate) => {
  if (!principal || !monthlyPayment || monthlyPayment <= 0) return 0;
  
  if (annualInterestRate === 0) {
    return Math.ceil(principal / monthlyPayment);
  }
  
  const monthlyRate = annualInterestRate / 100 / 12;
  
  if (monthlyPayment <= principal * monthlyRate) {
    return Infinity; // Payment doesn't cover interest
  }
  
  const months = -Math.log(1 - (principal * monthlyRate) / monthlyPayment) / 
                 Math.log(1 + monthlyRate);
                 
  return Math.ceil(months);
};

// Calculate compound interest
export const calculateCompoundInterest = (principal, annualRate, years, compoundingFrequency = 12) => {
  const rate = annualRate / 100;
  const amount = principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * years);
  return amount;
};

// Calculate savings goal timeline
export const calculateSavingsTimeline = (currentAmount, targetAmount, monthlyContribution, annualInterestRate = 0) => {
  const remaining = targetAmount - currentAmount;
  
  if (remaining <= 0) return 0;
  if (monthlyContribution <= 0) return Infinity;
  
  if (annualInterestRate === 0) {
    return Math.ceil(remaining / monthlyContribution);
  }
  
  const monthlyRate = annualInterestRate / 100 / 12;
  const months = Math.log(1 + (remaining * monthlyRate) / monthlyContribution) / 
                Math.log(1 + monthlyRate);
                
  return Math.ceil(months);
};

// Calculate debt-to-income ratio
export const calculateDebtToIncomeRatio = (monthlyDebtPayments, monthlyIncome) => {
  if (!monthlyIncome || monthlyIncome <= 0) return 0;
  return (monthlyDebtPayments / monthlyIncome) * 100;
};

// Calculate emergency fund target (3-6 months of expenses)
export const calculateEmergencyFundTarget = (monthlyExpenses, months = 6) => {
  return monthlyExpenses * months;
};

// Calculate net worth
export const calculateNetWorth = (assets, liabilities) => {
  const totalAssets = Array.isArray(assets) 
    ? assets.reduce((sum, asset) => sum + (asset.value || 0), 0)
    : assets || 0;
    
  const totalLiabilities = Array.isArray(liabilities)
    ? liabilities.reduce((sum, liability) => sum + (liability.amount || 0), 0)
    : liabilities || 0;
    
  return totalAssets - totalLiabilities;
};

// Calculate budget variance
export const calculateBudgetVariance = (budgeted, actual) => {
  if (!budgeted || budgeted === 0) return 0;
  return ((actual - budgeted) / budgeted) * 100;
};

// Calculate savings rate
export const calculateSavingsRate = (savings, income) => {
  if (!income || income <= 0) return 0;
  return (savings / income) * 100;
};

// Format time periods
export const formatTimePeriod = (months) => {
  if (!months || months <= 0) return 'Complete';
  if (months === Infinity || months > 1200) return 'Never (payment too low)';
  
  if (months === 1) return '1 month';
  if (months < 12) return `${months} months`;
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  } else {
    return `${years}y ${remainingMonths}m`;
  }
};

// Calculate age from date
export const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Calculate retirement savings recommendation (age-based)
export const calculateRetirementSavingsTarget = (age, annualIncome) => {
  // Rule of thumb: save 1x income by 30, 3x by 40, 6x by 50, 8x by 60
  const multipliers = {
    25: 0.5, 30: 1, 35: 2, 40: 3, 45: 4, 50: 6, 55: 7, 60: 8, 65: 10
  };
  
  let multiplier = 0;
  for (const ageThreshold of Object.keys(multipliers).sort((a, b) => a - b)) {
    if (age >= ageThreshold) {
      multiplier = multipliers[ageThreshold];
    }
  }
  
  return annualIncome * multiplier;
};

// Validate financial inputs
export const validateFinancialInput = (value, type = 'currency') => {
  const numericValue = parseFloat(value);
  
  if (isNaN(numericValue)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (numericValue < 0) {
    return { isValid: false, error: 'Value cannot be negative' };
  }
  
  if (type === 'percentage' && numericValue > 100) {
    return { isValid: false, error: 'Percentage cannot exceed 100%' };
  }
  
  if (type === 'currency' && numericValue > 1000000000) {
    return { isValid: false, error: 'Value is too large' };
  }
  
  return { isValid: true, value: numericValue };
};

// Calculate goal progress percentage
export const calculateGoalProgress = (current, target) => {
  if (!target || target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
};

// Get goal status based on progress
export const getGoalStatus = (current, target, type = 'savings') => {
  const progress = calculateGoalProgress(current, target);
  
  if (progress >= 100) {
    return { status: 'complete', color: 'green', label: 'Complete!' };
  }
  
  if (type === 'debt_free') {
    if (progress >= 75) return { status: 'excellent', color: 'green', label: 'Almost Done' };
    if (progress >= 50) return { status: 'good', color: 'yellow', label: 'Good Progress' };
    if (progress >= 25) return { status: 'fair', color: 'orange', label: 'Making Progress' };
    return { status: 'poor', color: 'red', label: 'Just Started' };
  } else {
    if (progress >= 75) return { status: 'excellent', color: 'green', label: 'Nearly There' };
    if (progress >= 50) return { status: 'good', color: 'blue', label: 'Halfway There' };
    if (progress >= 25) return { status: 'fair', color: 'yellow', label: 'Getting Started' };
    return { status: 'poor', color: 'gray', label: 'Just Started' };
  }
};

// Calculate budget allocation percentages
export const calculateBudgetAllocations = (income, categories) => {
  if (!income || income <= 0) return categories;
  
  return categories.map(category => ({
    ...category,
    percentage: ((category.amount || 0) / income) * 100
  }));
};

// Generate spending insights
export const generateSpendingInsights = (transactions, budget = null) => {
  if (!transactions || transactions.length === 0) {
    return { insights: [], totalSpent: 0, categoryBreakdown: [] };
  }

  // Filter out transfers before generating insights (same logic as backend)
  const filteredTransactions = transactions.filter(transaction => {
    const pfc = transaction.personal_finance_category;
    const primaryCategory = pfc?.primary;
    const detailedCategory = pfc?.detailed;

    const isTransfer = (
      primaryCategory === 'TRANSFER_IN' ||  // All inbound transfers (deposits, account transfers)
      primaryCategory === 'TRANSFER_OUT' ||  // All outbound transfers (withdrawals, account transfers)
      detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'  // Credit card payments
    );

    return !isTransfer;
  });

  const insights = [];
  const totalSpent = filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  // Group by category
  const categorySpending = {};
  filteredTransactions.forEach(transaction => {
    const category = transaction.category?.[0] || 'Other';
    const amount = Math.abs(transaction.amount || 0);
    
    if (!categorySpending[category]) {
      categorySpending[category] = { amount: 0, count: 0 };
    }
    
    categorySpending[category].amount += amount;
    categorySpending[category].count += 1;
  });
  
  const categoryBreakdown = Object.entries(categorySpending)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: (data.amount / totalSpent) * 100
    }))
    .sort((a, b) => b.amount - a.amount);
  
  // Generate insights
  const topCategory = categoryBreakdown[0];
  if (topCategory && topCategory.percentage > 30) {
    insights.push({
      type: 'warning',
      title: 'High Spending Category',
      message: `${topCategory.category} accounts for ${topCategory.percentage.toFixed(1)}% of your spending`
    });
  }
  
  if (budget) {
    const budgetTotal = (budget.fixed_costs || []).concat(budget.variable_expenses || [])
      .reduce((sum, item) => sum + (item.limit || 0), 0);
    
    if (totalSpent > budgetTotal) {
      insights.push({
        type: 'error',
        title: 'Over Budget',
        message: `You've spent ${formatCurrency(totalSpent - budgetTotal)} more than budgeted`
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Under Budget',
        message: `You're ${formatCurrency(budgetTotal - totalSpent)} under budget`
      });
    }
  }
  
  return { insights, totalSpent, categoryBreakdown };
};

// Default export with all utilities
const financialUtils = {
  formatCurrency,
  formatPercentage,
  calculateLoanPayment,
  calculatePayoffTime,
  calculateCompoundInterest,
  calculateSavingsTimeline,
  calculateDebtToIncomeRatio,
  calculateEmergencyFundTarget,
  calculateNetWorth,
  calculateBudgetVariance,
  calculateSavingsRate,
  formatTimePeriod,
  calculateAge,
  calculateRetirementSavingsTarget,
  validateFinancialInput,
  calculateGoalProgress,
  getGoalStatus,
  calculateBudgetAllocations,
  generateSpendingInsights
};

export default financialUtils;