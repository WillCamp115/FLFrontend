// dataTransform.ts - Shared data transformation utilities for budget visualizations

import { filterTransactionsByPeriod, calculateProRatedBudget } from '../../utils/timeUtils';

export interface FinalCategoryData {
  name: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  mappedCategory: string;
  hasDetailedCategories?: boolean;
  detailedBreakdown?: DetailedCategoryData[];
}

export interface DetailedCategoryData {
  name: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  mappedCategory: string;
}

export function computeFinalCategoryData(
  budgetData: any,
  transactionData: any[],
  categoryOverrides: Record<string, any> = {},
  timePeriod: string = 'current_month'
): FinalCategoryData[] {
  // Basic data validation
  if (!budgetData?.data?.[0]?.budget || !transactionData || !Array.isArray(transactionData)) {
    console.error('computeFinalCategoryData: Invalid or missing data');
    return [];
  }

  const budget = budgetData.data[0].budget;

  // Filter transactions by selected time period using centralized utility
  const filteredTransactions = filterTransactionsByPeriod(transactionData, timePeriod);

  console.log(`📊 Filtered ${filteredTransactions.length} transactions for period '${timePeriod}' from ${transactionData.length} total`);

  const transactions = filteredTransactions;

  // Build a mapping of detailed categories to budget category names for matching
  const budgetCategories = [
    ...(budget.fixed_costs || []),
    ...(budget.variable_expenses || [])
  ];

  console.log('🔍 Budget categories:', budgetCategories.map(c => c.name));

  // Create a map of detailed Plaid categories to specific budget category names
  const detailedCategoryToBudgetMap: Record<string, string> = {};
  budgetCategories.forEach(budgetCat => {
    if (budgetCat.detailed_categories && budgetCat.detailed_categories.length > 0) {
      budgetCat.detailed_categories.forEach(detailedCat => {
        // Extract the detailed category ID from names like "Food and Drink - Groceries"
        const categoryNameParts = detailedCat.name.split(' - ');
        const detailedName = categoryNameParts.length > 1 ? categoryNameParts[1] : detailedCat.name;

        // Map the detailed Plaid category to this specific budget category name
        const normalizedDetailedName = detailedName.toUpperCase().replace(/\s+/g, '_');
        detailedCategoryToBudgetMap[normalizedDetailedName] = budgetCat.name;
      });
    }
  });

  console.log('🗺️ Detailed category map:', detailedCategoryToBudgetMap);

  // Calculate spending by budget category (not just Plaid primary category)
  // This now supports matching to detailed budget categories
  const categorySpending: Record<string, number> = {};
  transactions.forEach(transaction => {
    const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
    const override = categoryOverrides[transactionId];

    let budgetCategoryName: string | undefined;

    // Check for category override first - if manually categorized, always include it
    if (override) {
      // Override already contains the budget category name
      budgetCategoryName = override.categoryName || override.mappedCategory;
    } else {
      // Skip transfer transactions ONLY if not manually categorized
      const pfc = transaction.personal_finance_category;
      const primaryCategory = pfc?.primary;
      const detailedCategory = pfc?.detailed;

      const isTransfer = (
        primaryCategory === 'TRANSFER_IN' ||  // All inbound transfers
        primaryCategory === 'TRANSFER_OUT' ||  // All outbound transfers
        detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'  // Credit card payments
      );

      if (isTransfer) {
        console.debug(`Filtering out uncategorized transfer: ${transaction.merchant_name || 'Unknown'} (${primaryCategory}/${detailedCategory})`);
        return; // Skip this transaction
      }

      // NEW: Try to match detailed category first
      if (detailedCategory) {
        // Normalize the detailed category - handle both formats:
        // Format 1: "GROCERIES" (short form)
        // Format 2: "FOOD_AND_DRINK_GROCERIES" (full form from taxonomy)
        let normalizedDetailed = detailedCategory.toUpperCase().replace(/\s+/g, '_');

        // Extract just the last part if it's in full format
        // e.g., "FOOD_AND_DRINK_GROCERIES" -> "GROCERIES"
        const detailedParts = normalizedDetailed.split('_');
        const shortDetailed = detailedParts[detailedParts.length - 1];

        // First, check if detailed category maps to a budget via detailed_categories array
        budgetCategoryName = detailedCategoryToBudgetMap[normalizedDetailed] || detailedCategoryToBudgetMap[shortDetailed];

        // If not found in detailed map, check if there's a budget category directly named like the detailed category
        if (!budgetCategoryName) {
          const matchingBudgetCat = budgetCategories.find(budgetCat => {
            const budgetNameNormalized = budgetCat.name.toUpperCase().replace(/\s+/g, '_');
            // Match against both full and short forms
            return budgetNameNormalized === normalizedDetailed || budgetNameNormalized === shortDetailed;
          });
          budgetCategoryName = matchingBudgetCat?.name;
        }

        if (budgetCategoryName) {
          console.log(`✅ Matched detailed category: ${transaction.merchant_name || 'Unknown'} ($${transaction.amount}) -> ${budgetCategoryName} (detailed: ${detailedCategory})`);
        }
      }

      // Fallback to primary category matching if no detailed match
      if (!budgetCategoryName && primaryCategory) {
        // Try to find a budget category that matches this primary category
        // Match by comparing normalized names (e.g., "RENT_AND_UTILITIES" matches "Rent and Utilities" or "Rent")

        const matchingBudgetCat = budgetCategories.find(budgetCat => {
          const budgetNameNormalized = budgetCat.name.toUpperCase().replace(/\s+/g, '_').replace(/AND_/g, '');
          const primaryNormalized = primaryCategory.toUpperCase().replace(/\s+/g, '_').replace(/AND_/g, '');

          // Direct match
          if (budgetCat.name.toUpperCase().replace(/\s+/g, '_') === primaryCategory) {
            return true;
          }

          // Partial match (e.g., "Rent" matches "RENT_AND_UTILITIES")
          if (primaryNormalized.includes(budgetNameNormalized) || budgetNameNormalized.includes(primaryNormalized)) {
            return true;
          }

          // Check if budget category name appears in primary category
          const budgetWords = budgetCat.name.toUpperCase().split(/\s+/);
          const primaryWords = primaryCategory.split('_');

          return budgetWords.some(word => primaryWords.includes(word) && word.length > 3);
        });

        if (matchingBudgetCat) {
          budgetCategoryName = matchingBudgetCat.name;
          console.log(`✅ Matched primary category: ${transaction.merchant_name || 'Unknown'} ($${transaction.amount}) -> ${budgetCategoryName} (primary: ${primaryCategory})`);
        } else {
          console.warn(`❌ No match for: ${transaction.merchant_name || 'Unknown'} ($${transaction.amount}) - primary: ${primaryCategory}, detailed: ${detailedCategory}`);
        }
      }
    }

    if (budgetCategoryName) {
      const amount = Math.abs(transaction.amount);
      categorySpending[budgetCategoryName] = (categorySpending[budgetCategoryName] || 0) + amount;

      // Log rent transactions specifically
      if (budgetCategoryName.toLowerCase().includes('rent') || budgetCategoryName.toLowerCase().includes('utilities')) {
        const pfc = transaction.personal_finance_category;
        console.log(`💰 Adding to ${budgetCategoryName}: ${transaction.merchant_name || transaction.name} = $${amount} (primary: ${pfc?.primary}, detailed: ${pfc?.detailed})`);
      }
    } else {
      console.warn(`⚠️ Unmatched transaction: ${transaction.merchant_name || 'Unknown'} ($${transaction.amount}) - will go to Other category`);
      // Fallback to category array if no match found
      const fallbackCategory = transaction.category?.[0];
      if (fallbackCategory) {
        categorySpending[fallbackCategory] = (categorySpending[fallbackCategory] || 0) + Math.abs(transaction.amount);
      }
    }
  });

  console.log('💰 Category spending summary:', categorySpending);

  // Map budget categories to spending data (budgetCategories already defined above)
  // Now using direct lookup by budget category name since categorySpending is keyed by budget category name

  const chartData = budgetCategories.map(category => {
    // Get spending directly from the budget category name
    const spent = categorySpending[category.name] || 0;

    console.log(`📊 Budget category "${category.name}" -> spending: $${spent}`);

    // Pro-rate the budget limit based on time period
    const monthlyLimit = parseFloat(category.limit) || 0;
    const proRatedLimit = calculateProRatedBudget(monthlyLimit, timePeriod);

    // Determine the mapped Plaid category for this budget category (for compatibility)
    const categoryMap: Record<string, string> = {
      "Food and Drink": "FOOD_AND_DRINK",
      "Entertainment": "ENTERTAINMENT",
      "Travel": "TRAVEL",
      "Transportation": "TRANSPORTATION",
      "Shops": "GENERAL_MERCHANDISE",
      "Shopping": "GENERAL_MERCHANDISE",
      "Rent": "RENT_AND_UTILITIES",
      "Utilities": "RENT_AND_UTILITIES",
      "Rent and Utilities": "RENT_AND_UTILITIES",
      "Internet": "RENT_AND_UTILITIES",
      "Electric": "RENT_AND_UTILITIES",
      "Healthcare": "MEDICAL",
      "Insurance": "LOAN_PAYMENTS",
      "Streaming Services": "ENTERTAINMENT",
      "Groceries": "FOOD_AND_DRINK" // Add explicit mapping for Groceries
    };

    let mappedCategory = categoryMap[category.name];
    if (!mappedCategory) {
      const lowerName = category.name.toLowerCase();
      if (lowerName.includes('rent') || lowerName.includes('utilities')) mappedCategory = 'RENT_AND_UTILITIES';
      else if (lowerName.includes('food') || lowerName.includes('dining') || lowerName.includes('groceries')) mappedCategory = 'FOOD_AND_DRINK';
      else if (lowerName.includes('transport') || lowerName.includes('gas')) mappedCategory = 'TRANSPORTATION';
      else if (lowerName.includes('shop')) mappedCategory = 'GENERAL_MERCHANDISE';
      else if (lowerName.includes('streaming')) mappedCategory = 'ENTERTAINMENT';
      else mappedCategory = category.name.toUpperCase().replace(/\s+/g, '_');
    }

    return {
      name: category.name,
      limit: proRatedLimit,
      spent,
      remaining: Math.max(0, proRatedLimit - spent),
      percentage: proRatedLimit > 0 ? (spent / proRatedLimit) * 100 : 0,
      mappedCategory
    };
  });

  const validChartData = chartData.filter(item => item.limit > 0);

  if (validChartData.length === 0) {
    console.error('No valid chart data');
    return [];
  }

  // NOTE: We no longer combine categories that map to the same Plaid category
  // because we want each budget category to be shown separately when users have detailed categories
  // For example, if a user has both "Food and Drink" and "Groceries" as separate budget categories,
  // they should see them separately in the visualization

  // Simply use the validChartData as-is, since each item represents a distinct budget category
  const finalChartData: FinalCategoryData[] = validChartData;

  // Calculate total spending from all current month transactions
  let totalSpending = 0;
  transactions.forEach(transaction => {
    const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
    const override = categoryOverrides[transactionId];

    // If manually categorized, always include in spending
    if (override) {
      totalSpending += Math.abs(transaction.amount);
      return;
    }

    // Skip uncategorized transfers (same logic as above)
    const pfc = transaction.personal_finance_category;
    const primaryCategory = pfc?.primary;
    const detailedCategory = pfc?.detailed;

    const isTransfer = (
      primaryCategory === 'TRANSFER_IN' ||  // All inbound transfers
      primaryCategory === 'TRANSFER_OUT' ||  // All outbound transfers
      detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'  // Credit card payments
    );

    if (!isTransfer) {
      totalSpending += Math.abs(transaction.amount);
    }
  });

  // Calculate total allocated spending from all categories
  const totalAllocatedSpending = finalChartData.reduce((sum, item) => sum + item.spent, 0);

  // Calculate unallocated spending
  const unallocatedSpending = totalSpending - totalAllocatedSpending;

  // Add "Other" category if there's unallocated spending
  if (unallocatedSpending > 0.01) { // Use small threshold to avoid floating point issues
    console.log('⚠️ Unallocated spending detected:', {
      totalSpending,
      totalAllocatedSpending,
      unallocatedSpending,
      categorySpending
    });
    const otherCategory: FinalCategoryData = {
      name: "Other",
      limit: unallocatedSpending, // Set limit to actual spending so percentage shows as 100%
      spent: unallocatedSpending,
      remaining: 0,
      percentage: 100,
      mappedCategory: "OTHER"
    };

    finalChartData.push(otherCategory);
  }

  return finalChartData;
}

// Function to get detailed category breakdown for a specific main category
export function getDetailedCategoryBreakdown(
  budgetData: any,
  transactionData: any[],
  mainCategoryName: string,
  categoryOverrides: Record<string, any> = {},
  timePeriod: string = 'current_month'
): DetailedCategoryData[] {
  if (!budgetData?.data?.[0]?.budget || !transactionData || !Array.isArray(transactionData)) {
    return [];
  }

  const budget = budgetData.data[0].budget;

  // Filter transactions by selected time period
  const filteredTransactions = filterTransactionsByPeriod(transactionData, timePeriod);
  const transactions = filteredTransactions;

  // Find the main category in the budget
  const allCategories = [
    ...(budget.fixed_costs || []),
    ...(budget.variable_expenses || [])
  ];

  const mainCategory = allCategories.find(cat => cat.name === mainCategoryName);
  if (!mainCategory || !mainCategory.detailed_categories || mainCategory.detailed_categories.length === 0) {
    return [];
  }

  // Calculate spending by detailed category
  const categorySpending: Record<string, number> = {};
  transactions.forEach(transaction => {
    // Skip transfer transactions (backup filter)
    const pfc = transaction.personal_finance_category;
    const primaryCategory = pfc?.primary;
    const detailedCategory = pfc?.detailed;

    const isTransfer = (
      primaryCategory === 'TRANSFER_IN' ||  // All inbound transfers
      primaryCategory === 'TRANSFER_OUT' ||  // All outbound transfers
      detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'  // Credit card payments
    );

    if (isTransfer) {
      return; // Skip this transaction
    }

    if (detailedCategory) {
      categorySpending[detailedCategory] = (categorySpending[detailedCategory] || 0) + Math.abs(transaction.amount);
    }
  });

  // Map detailed categories to spending
  const detailedBreakdown: DetailedCategoryData[] = mainCategory.detailed_categories.map(detailedCat => {
    // Extract the detailed category ID from the full name (e.g., "Entertainment - Video Games" -> find matching ID)
    const categoryNameParts = detailedCat.name.split(' - ');
    const detailedName = categoryNameParts.length > 1 ? categoryNameParts[1] : detailedCat.name;
    
    // Try to match with transaction detailed categories
    let spent = 0;
    const detailedKeys = Object.keys(categorySpending);
    const matchingKey = detailedKeys.find(key => 
      key.toLowerCase().includes(detailedName.toLowerCase()) ||
      detailedName.toLowerCase().includes(key.toLowerCase())
    );
    
    if (matchingKey) {
      spent = categorySpending[matchingKey];
    }

    // Pro-rate the detailed category limit based on time period
    const monthlyLimit = parseFloat(detailedCat.limit) || 0;
    const proRatedLimit = calculateProRatedBudget(monthlyLimit, timePeriod);

    return {
      name: detailedCat.name,
      limit: proRatedLimit,
      spent,
      remaining: Math.max(0, proRatedLimit - spent),
      percentage: proRatedLimit > 0 ? (spent / proRatedLimit) * 100 : 0,
      mappedCategory: detailedCat.name
    };
  });

  return detailedBreakdown.filter(item => item.limit > 0);
}

// Enhanced function that includes detailed category information
export function computeFinalCategoryDataWithDetails(
  budgetData: any,
  transactionData: any[],
  categoryOverrides: Record<string, any> = {},
  timePeriod: string = 'current_month'
): FinalCategoryData[] {
  const baseData = computeFinalCategoryData(budgetData, transactionData, categoryOverrides, timePeriod);
  
  if (!budgetData?.data?.[0]?.budget) {
    return baseData;
  }

  const budget = budgetData.data[0].budget;
  const allCategories = [
    ...(budget.fixed_costs || []),
    ...(budget.variable_expenses || [])
  ];

  // Enhance the data with detailed category information
  return baseData.map(categoryData => {
    const originalCategory = allCategories.find(cat => cat.name === categoryData.name);
    if (originalCategory && originalCategory.detailed_categories && originalCategory.detailed_categories.length > 0) {
      const detailedBreakdown = getDetailedCategoryBreakdown(budgetData, transactionData, categoryData.name, categoryOverrides, timePeriod);
      return {
        ...categoryData,
        hasDetailedCategories: true,
        detailedBreakdown
      };
    }
    return {
      ...categoryData,
      hasDetailedCategories: false
    };
  });
}