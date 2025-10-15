// timeUtils.js - Centralized time period filtering and budget pro-rating utilities

/**
 * Available time period options for spending analysis
 */
export const TIME_PERIODS = [
  { id: 'current_week', label: 'Current Week', description: 'Sunday - Today' },
  { id: 'last_week', label: 'Last Week', description: 'Previous Sunday - Saturday' },
  { id: 'current_month', label: 'Current Month', description: 'Month to date' },
  { id: 'last_month', label: 'Last Month', description: 'Previous calendar month' },
  { id: 'last_3_months', label: 'Last 3 Months', description: 'Last 90 days' },
  { id: 'last_6_months', label: 'Last 6 Months', description: 'Last 180 days' },
  { id: 'year_to_date', label: 'Year to Date', description: 'January 1 - Today' }
];

/**
 * Get start and end dates for a given time period
 * @param {string} periodId - The time period identifier
 * @returns {Object} Object with startDate and endDate as Date objects
 */
export function getDateRangeForPeriod(periodId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today

  switch (periodId) {
    case 'current_week': {
      // Current week: Sunday to today
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
      return { startDate, endDate: today };
    }

    case 'last_week': {
      // Last week: Previous Sunday to Saturday
      const dayOfWeek = now.getDay();
      const lastSunday = new Date(today);
      lastSunday.setDate(today.getDate() - dayOfWeek - 7); // Go back to last Sunday
      const lastSaturday = new Date(lastSunday);
      lastSaturday.setDate(lastSunday.getDate() + 6); // Go forward to Saturday
      return { startDate: lastSunday, endDate: lastSaturday };
    }

    case 'current_month': {
      // Current month: 1st of current month to today
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate, endDate: today };
    }

    case 'last_month': {
      // Last month: 1st to last day of previous month
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0); // 0th day = last day of previous month
      return { startDate, endDate };
    }

    case 'last_3_months': {
      // Last 3 months: 90 days ago to today
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 90);
      return { startDate, endDate: today };
    }

    case 'last_6_months': {
      // Last 6 months: 180 days ago to today
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 180);
      return { startDate, endDate: today };
    }

    case 'year_to_date': {
      // Year to date: January 1 to today
      const startDate = new Date(now.getFullYear(), 0, 1); // January 1st
      return { startDate, endDate: today };
    }

    default:
      // Default to current month
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate, endDate: today };
  }
}

/**
 * Filter transactions by time period
 * @param {Array} transactions - Array of transaction objects with date field
 * @param {string} periodId - The time period identifier
 * @returns {Array} Filtered transactions
 */
export function filterTransactionsByPeriod(transactions, periodId = 'current_month') {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }

  const { startDate, endDate } = getDateRangeForPeriod(periodId);

  return transactions.filter(transaction => {
    // Parse transaction date (format: YYYY-MM-DD)
    const dateParts = transaction.date?.split('-');
    if (!dateParts || dateParts.length !== 3) {
      return false;
    }

    const transactionDate = new Date(
      parseInt(dateParts[0]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[2])
    );

    // Check if transaction is within period range (inclusive)
    return transactionDate >= startDate && transactionDate <= endDate;
  });
}

/**
 * Calculate pro-rated budget limit for a time period
 * @param {number} monthlyBudgetLimit - The monthly budget limit
 * @param {string} periodId - The time period identifier
 * @returns {number} Pro-rated budget limit
 */
export function calculateProRatedBudget(monthlyBudgetLimit, periodId) {
  if (!monthlyBudgetLimit || monthlyBudgetLimit <= 0) {
    return 0;
  }

  const AVERAGE_WEEKS_PER_MONTH = 4.33; // 52 weeks / 12 months

  switch (periodId) {
    case 'current_week':
    case 'last_week':
      // Weekly budget = monthly / 4.33
      return monthlyBudgetLimit / AVERAGE_WEEKS_PER_MONTH;

    case 'current_month':
    case 'last_month':
      // Monthly budget = no change
      return monthlyBudgetLimit;

    case 'last_3_months':
      // 3 months = monthly * 3
      return monthlyBudgetLimit * 3;

    case 'last_6_months':
      // 6 months = monthly * 6
      return monthlyBudgetLimit * 6;

    case 'year_to_date': {
      // YTD = monthly * number of months so far this year
      const now = new Date();
      const monthsElapsed = now.getMonth() + 1; // 0-indexed, so add 1
      return monthlyBudgetLimit * monthsElapsed;
    }

    default:
      return monthlyBudgetLimit;
  }
}

/**
 * Get display text for budget comparison based on period
 * @param {string} periodId - The time period identifier
 * @param {number} monthlyBudget - The monthly budget amount
 * @returns {Object} Object with title and subtitle for display
 */
export function getBudgetComparisonText(periodId, monthlyBudget) {
  const period = TIME_PERIODS.find(p => p.id === periodId);
  const periodLabel = period ? period.label : 'Current Month';

  switch (periodId) {
    case 'current_week':
    case 'last_week':
      return {
        title: `${periodLabel} Spending vs Weekly Budget`,
        subtitle: `Based on monthly budget of $${monthlyBudget.toFixed(2)} ÷ 4.33 weeks`
      };

    case 'current_month':
    case 'last_month':
      return {
        title: `${periodLabel} Spending vs Monthly Budget`,
        subtitle: null // No subtitle needed for 1:1 comparison
      };

    case 'last_3_months':
      return {
        title: `${periodLabel} Spending vs 3-Month Budget`,
        subtitle: `Based on monthly budget of $${monthlyBudget.toFixed(2)} × 3 months`
      };

    case 'last_6_months':
      return {
        title: `${periodLabel} Spending vs 6-Month Budget`,
        subtitle: `Based on monthly budget of $${monthlyBudget.toFixed(2)} × 6 months`
      };

    case 'year_to_date': {
      const now = new Date();
      const monthsElapsed = now.getMonth() + 1;
      return {
        title: `${periodLabel} Spending vs Year-to-Date Budget`,
        subtitle: `Based on monthly budget of $${monthlyBudget.toFixed(2)} × ${monthsElapsed} months`
      };
    }

    default:
      return {
        title: `${periodLabel} Spending vs Budget`,
        subtitle: null
      };
  }
}

/**
 * Calculate the number of days in a time period
 * @param {string} periodId - The time period identifier
 * @returns {number} Number of days in the period
 */
export function getDaysInPeriod(periodId) {
  const { startDate, endDate } = getDateRangeForPeriod(periodId);
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
  return diffDays;
}

/**
 * Check if sufficient transaction data exists for a time period
 * @param {Array} transactions - Array of all available transactions
 * @param {string} periodId - The time period identifier
 * @returns {Object} Object with hasData boolean and message string
 */
export function checkDataAvailability(transactions, periodId) {
  if (!transactions || transactions.length === 0) {
    return {
      hasData: false,
      message: 'No transaction data available'
    };
  }

  // Find oldest transaction date
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB;
  });

  const oldestTransaction = sortedTransactions[0];
  const oldestDate = new Date(oldestTransaction.date);
  const { startDate } = getDateRangeForPeriod(periodId);

  if (oldestDate > startDate) {
    const daysAvailable = Math.ceil((new Date() - oldestDate) / (1000 * 60 * 60 * 24));
    const daysRequested = getDaysInPeriod(periodId);

    return {
      hasData: true,
      isPartial: true,
      message: `Showing ${daysAvailable} days of data (${daysRequested} days requested)`,
      availableDays: daysAvailable,
      requestedDays: daysRequested
    };
  }

  return {
    hasData: true,
    isPartial: false,
    message: null
  };
}
