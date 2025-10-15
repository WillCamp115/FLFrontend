// src/utils/dashboardUtils.js

/**
 * Helper functions for dashboard calculations and data processing
 */

export const getTopLevelCategory = (financeCategory) => {
  if (financeCategory && typeof financeCategory === "object") {
    return financeCategory.primary || "Uncategorized";
  } else if (typeof financeCategory === "string") {
    const parts = financeCategory.split("_");
    return parts[0];
  }
  return "Uncategorized";
};

export const calculateTotalSpending = (transactions) => {
  return transactions.reduce((total, transaction) => total + transaction.amount, 0);
};

export const calculateCategorySpending = (transactions, limit = 5) => {
  const categoryTotals = {};
  transactions.forEach(transaction => {
    const category = transaction.personal_finance_category?.primary || 'Other';
    categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
  });
  
  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

export const getRecentTransactions = (transactions, limit = 5) => {
  return transactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
};

export const getDefaultFilterForView = (view, transactions) => {
  if (transactions.length) {
    const latest = new Date(
      Math.max(...transactions.map((tx) => new Date(tx.date)))
    );
    if (view === "Weekly Spending") {
      const start = new Date(latest);
      start.setDate(latest.getDate() - 6);
      return { start, end: latest };
    }
    if (view === "Monthly Spending") return latest.toISOString().slice(0, 7);
    if (view === "Yearly Spending") return String(latest.getFullYear());
  }
  const today = new Date();
  if (view === "Weekly Spending") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { start, end: today };
  }
  if (view === "Monthly Spending") return today.toISOString().slice(0, 7);
  if (view === "Yearly Spending") return String(today.getFullYear());
  return null;
};

export const computeTreemapData = (transactions, filter = null) => {
  let filtered = transactions;
  if (filter) {
    if (filter.start && filter.end) {
      filtered = transactions.filter((tx) => {
        const d = new Date(tx.date);
        return d >= filter.start && d <= filter.end;
      });
    } else if (typeof filter === "string") {
      filtered = transactions.filter((tx) => {
        const iso = new Date(tx.date).toISOString();
        if (filter.length === 10) return iso.startsWith(filter);
        if (filter.length === 7) return iso.slice(0, 7) === filter;
        if (filter.length === 4) return String(new Date(tx.date).getFullYear()) === filter;
        return false;
      });
    }
  }
  const map = {};
  filtered.forEach((tx) => {
    const amt = Math.abs(tx.amount);
    const cat = getTopLevelCategory(tx.personal_finance_category);
    map[cat] = (map[cat] || 0) + amt;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatPercentage = (value, total) => {
  if (total === 0) return '0.0%';
  return ((value / total) * 100).toFixed(1) + '%';
};