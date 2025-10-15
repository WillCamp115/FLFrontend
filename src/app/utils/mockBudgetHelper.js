// src/utils/mockBudgetHelper.js
// This file provides properly structured mock data for testing the budget visualization

export const createMockBudgetData = () => {
  return {
    income: 4000, // This will be replaced by calculated average from backend
    goal_name: "Emergency Fund", 
    monthly_contribution: 500,
    fixed_costs: [
      { name: "Rent and Utilities", limit: 1200 },
      { name: "Transportation", limit: 300 },
      { name: "Insurance", limit: 150 }
    ],
    variable_expenses: [
      { name: "Food and Drink", limit: 400 },
      { name: "Entertainment", limit: 200 },
      { name: "Shopping", limit: 300 },
      { name: "Healthcare", limit: 100 }
    ]
  };
};

export const createMockTransactionData = () => {
  return [
    {
      transaction_id: "1",
      amount: 15.50,
      date: "2024-01-15",
      merchant_name: "Starbucks",
      category: ["Food and Drink", "Coffee"],
      personal_finance_category: {
        primary: "FOOD_AND_DRINK",
        detailed: "FOOD_AND_DRINK_COFFEE"
      }
    },
    {
      transaction_id: "2", 
      amount: 89.99,
      date: "2024-01-14",
      merchant_name: "Whole Foods",
      category: ["Food and Drink", "Groceries"],
      personal_finance_category: {
        primary: "FOOD_AND_DRINK",
        detailed: "FOOD_AND_DRINK_GROCERIES"
      }
    },
    {
      transaction_id: "3",
      amount: 45.00,
      date: "2024-01-13", 
      merchant_name: "Shell Gas Station",
      category: ["Transportation", "Gas"],
      personal_finance_category: {
        primary: "TRANSPORTATION",
        detailed: "TRANSPORTATION_GAS"
      }
    },
    {
      transaction_id: "4",
      amount: 1200.00,
      date: "2024-01-01",
      merchant_name: "Rent Payment",
      category: ["Housing", "Rent"],
      personal_finance_category: {
        primary: "RENT_AND_UTILITIES", 
        detailed: "RENT_AND_UTILITIES_RENT"
      }
    },
    {
      transaction_id: "5",
      amount: 25.99,
      date: "2024-01-12",
      merchant_name: "Netflix",
      category: ["Entertainment", "Streaming"],
      personal_finance_category: {
        primary: "ENTERTAINMENT",
        detailed: "ENTERTAINMENT_TV_AND_MOVIES"
      }
    },
    {
      transaction_id: "6",
      amount: 129.99,
      date: "2024-01-10",
      merchant_name: "Amazon",
      category: ["Shopping", "General"],
      personal_finance_category: {
        primary: "GENERAL_MERCHANDISE",
        detailed: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES"
      }
    }
  ];
};

// Helper function to validate budget data structure
export const validateBudgetData = (budgetData) => {
  const required = ['income', 'fixed_costs', 'variable_expenses'];
  const missing = required.filter(field => !budgetData || !budgetData.hasOwnProperty(field));
  
  if (missing.length > 0) {
    console.error('Missing required budget fields:', missing);
    return false;
  }

  // Validate categories have name and limit
  const allCategories = [...(budgetData.fixed_costs || []), ...(budgetData.variable_expenses || [])];
  const invalidCategories = allCategories.filter(cat => !cat.name || typeof cat.limit !== 'number');
  
  if (invalidCategories.length > 0) {
    console.error('Invalid category data:', invalidCategories);
    return false;
  }

  return true;
};

// Helper function to validate transaction data structure  
export const validateTransactionData = (transactions) => {
  if (!Array.isArray(transactions)) {
    console.error('Transactions must be an array, received:', typeof transactions, transactions);
    return false;
  }

  const invalidTransactions = transactions.filter(t => 
    !t.amount || !t.date || (!t.personal_finance_category?.primary && !t.category)
  );

  if (invalidTransactions.length > 0) {
    console.error('Invalid transaction data:', invalidTransactions);
    return false;
  }

  return true;
};