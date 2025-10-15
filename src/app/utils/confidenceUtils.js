// src/utils/confidenceUtils.js

/**
 * Utilities for handling transaction confidence levels and low-confidence detection
 */

// Define confidence levels in order of quality (highest to lowest)
export const CONFIDENCE_LEVELS = {
  VERY_HIGH: 'VERY_HIGH',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

// Define what constitutes "low confidence" for user review
export const LOW_CONFIDENCE_THRESHOLD = [
  CONFIDENCE_LEVELS.MEDIUM,
  CONFIDENCE_LEVELS.LOW
];

/**
 * Check if a transaction has low confidence in its categorization
 * @param {Object} transaction - The transaction object
 * @returns {boolean} - True if confidence is below threshold
 */
export const hasLowConfidence = (transaction) => {
  // Check personal finance category confidence
  const categoryConfidence = transaction?.personal_finance_category?.confidence_level;

  if (!categoryConfidence) {
    // If no confidence level provided, treat as HIGH confidence (Plaid default)
    // Most transactions don't have explicit confidence levels, so we assume they're correct
    return false;
  }

  return LOW_CONFIDENCE_THRESHOLD.includes(categoryConfidence);
};

/**
 * Check if a transaction has low merchant identification confidence
 * @param {Object} transaction - The transaction object
 * @returns {boolean} - True if merchant identification confidence is low
 */
export const hasLowMerchantConfidence = (transaction) => {
  if (!transaction?.counterparties || transaction.counterparties.length === 0) {
    // If no counterparty data, don't flag as low confidence
    // Plaid doesn't always provide counterparty info, especially for older transactions
    return false;
  }

  // Check if any counterparty has low confidence
  return transaction.counterparties.some(counterparty =>
    LOW_CONFIDENCE_THRESHOLD.includes(counterparty.confidence_level)
  );
};

/**
 * Get all low-confidence transactions that need user review
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} categoryOverrides - Existing category overrides (transactions already manually categorized)
 * @param {boolean} currentMonthOnly - Whether to filter to current month only
 * @returns {Array} - Array of low-confidence transactions needing review
 */
export const getLowConfidenceTransactions = (transactions, categoryOverrides = {}, currentMonthOnly = true) => {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }

  let filteredTransactions = transactions;

  // Filter to current month if requested
  if (currentMonthOnly) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date || new Date());
      return transactionDate.getMonth() === currentMonth &&
             transactionDate.getFullYear() === currentYear;
    });
  }

  console.log('🔍 Filtering uncertain transactions from', filteredTransactions.length, 'transactions');
  console.log('📋 Category overrides:', Object.keys(categoryOverrides).length, 'transactions');

  // Filter to low-confidence transactions that haven't been manually overridden
  const result = filteredTransactions.filter(transaction => {
    // Skip if already manually categorized
    const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
    if (categoryOverrides[transactionId]) {
      console.log('⏭️ Skipping already categorized:', transaction.merchant_name || transaction.name);
      return false;
    }

    const pfc = transaction.personal_finance_category;
    const primaryCategory = pfc?.primary;
    const detailedCategory = pfc?.detailed;
    const confidenceLevel = pfc?.confidence_level;

    // Skip credit card payments (they're true transfers)
    const isCreditCardPayment = detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT';
    if (isCreditCardPayment) {
      return false;
    }

    // Include TRANSFER_OUT transactions so users can categorize Venmo/Zelle payments for rent/utilities
    const isTransferOut = primaryCategory === 'TRANSFER_OUT';
    if (isTransferOut) {
      console.log('💸 Including TRANSFER_OUT:', transaction.merchant_name || transaction.name, primaryCategory);
      return true; // Always include transfer out for manual categorization
    }

    const lowCategoryConfidence = hasLowConfidence(transaction);
    const lowMerchantConfidence = hasLowMerchantConfidence(transaction);

    if (lowCategoryConfidence || lowMerchantConfidence) {
      console.log('⚠️ Low confidence:', transaction.merchant_name || transaction.name, {
        confidenceLevel,
        lowCategoryConfidence,
        lowMerchantConfidence,
        primaryCategory
      });
    }

    // Include if either category or merchant confidence is low
    return lowCategoryConfidence || lowMerchantConfidence;
  });

  console.log('✅ Found', result.length, 'uncertain transactions');
  return result;
};

/**
 * Get confidence level display information
 * @param {string} confidenceLevel - The confidence level string
 * @returns {Object} - Display information with color, label, and description
 */
export const getConfidenceDisplay = (confidenceLevel) => {
  switch (confidenceLevel) {
    case CONFIDENCE_LEVELS.VERY_HIGH:
      return {
        color: 'green',
        label: 'Very High Confidence',
        description: 'Plaid is very confident about this categorization',
        icon: '✓'
      };
    case CONFIDENCE_LEVELS.HIGH:
      return {
        color: 'blue',
        label: 'High Confidence',
        description: 'Plaid is confident about this categorization',
        icon: '✓'
      };
    case CONFIDENCE_LEVELS.MEDIUM:
      return {
        color: 'yellow',
        label: 'Medium Confidence',
        description: 'Plaid is somewhat unsure about this categorization',
        icon: '?'
      };
    case CONFIDENCE_LEVELS.LOW:
      return {
        color: 'red',
        label: 'Low Confidence',
        description: 'Plaid is unsure about this categorization - please review',
        icon: '!'
      };
    default:
      return {
        color: 'gray',
        label: 'Unknown Confidence',
        description: 'Confidence level not provided',
        icon: '?'
      };
  }
};

/**
 * Group low-confidence transactions by similar characteristics for batch processing
 * @param {Array} lowConfidenceTransactions - Array of low-confidence transactions
 * @returns {Array} - Array of transaction groups with suggested categories
 */
export const groupSimilarTransactions = (lowConfidenceTransactions) => {
  const groups = new Map();

  lowConfidenceTransactions.forEach(transaction => {
    // Group by merchant name or transaction description
    const merchantName = transaction.merchant_name ||
                         transaction.counterparties?.[0]?.name ||
                         transaction.name ||
                         'Unknown Merchant';

    const key = merchantName.toLowerCase().trim();

    if (!groups.has(key)) {
      groups.set(key, {
        merchantName,
        transactions: [],
        totalAmount: 0,
        suggestedCategory: transaction.personal_finance_category?.primary,
        confidence: transaction.personal_finance_category?.confidence_level
      });
    }

    const group = groups.get(key);
    group.transactions.push(transaction);
    group.totalAmount += Math.abs(transaction.amount || 0);
  });

  return Array.from(groups.values())
    .sort((a, b) => b.totalAmount - a.totalAmount); // Sort by total amount descending
};

/**
 * Format confidence statistics for display
 * @param {Array} transactions - All transactions
 * @returns {Object} - Statistics object with counts and percentages
 */
export const getConfidenceStats = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return {
      total: 0,
      veryHigh: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
      lowConfidencePercentage: 0
    };
  }

  const stats = {
    total: transactions.length,
    veryHigh: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0
  };

  transactions.forEach(transaction => {
    const confidence = transaction?.personal_finance_category?.confidence_level;

    switch (confidence) {
      case CONFIDENCE_LEVELS.VERY_HIGH:
        stats.veryHigh++;
        break;
      case CONFIDENCE_LEVELS.HIGH:
        stats.high++;
        break;
      case CONFIDENCE_LEVELS.MEDIUM:
        stats.medium++;
        break;
      case CONFIDENCE_LEVELS.LOW:
        stats.low++;
        break;
      default:
        stats.unknown++;
    }
  });

  stats.lowConfidencePercentage = ((stats.medium + stats.low + stats.unknown) / stats.total) * 100;

  return stats;
};