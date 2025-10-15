// src/components/sections/BudgetSection.jsx
import React, { useState, useEffect } from 'react';
import { DollarSign, Edit, Plus, TrendingUp, AlertTriangle, PieChart, Sparkles, ChevronDown, Search, Calendar } from 'lucide-react';
import BudgetDonutChart from '../visuals/BudgetDonutChart';
import CategoryBreakdownChart from '../visuals/CategoryBreakdownChart';
import DumbbellBudgetChart from '../visuals/DumbbellBudgetChart';
import BudgetDumbbellChart from '../visuals/BudgetDumbellChart';
import BudgetBulletChart from '../visuals/BudgetBulletChart';
import BudgetRadarChart from '../visuals/BudgetRadarVis';
import DetailedBudgetBreakdownModal from '../modals/DetailedBudgetBreakdownModal';
import LowConfidenceTransactionModal from '../modals/LowConfidenceTransactionModal';
import { apiClient } from '../../../lib/apiClient';
import { computeFinalCategoryDataWithDetails, getDetailedCategoryBreakdown } from '../visuals/dataTransform';
import { getLowConfidenceTransactions, getConfidenceStats } from '../../utils/confidenceUtils';
import { TIME_PERIODS, filterTransactionsByPeriod, calculateProRatedBudget, getBudgetComparisonText } from '../../utils/timeUtils';

const BudgetSection = ({
  userId,
  budgets,
  budgetTemplates,
  transactions,
  onEditBudget,
  onCreateBudget,
  onViewTemplates, // Add this new prop
  isAdvisorView = false // Add advisor view prop
}) => {
  // Debug logging for transactions
  console.log(`🔍 BudgetSection received ${transactions?.length || 0} transactions`);
  const rentTransactions = transactions?.filter(t => t.name?.toLowerCase().includes('rent')) || [];
  console.log(`🏠 Rent transactions in BudgetSection:`, rentTransactions.map(t => ({ name: t.name, date: t.date, amount: t.amount })));

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);
  const [selectedVisualization, setSelectedVisualization] = useState(1); // Default to BudgetDonutChart
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingPreference, setLoadingPreference] = useState(true);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('current_month'); // Time period filter (session only)
  const [isDetailedBreakdownOpen, setIsDetailedBreakdownOpen] = useState(false);
  const [selectedDetailedCategory, setSelectedDetailedCategory] = useState(null);
  const [detailedBreakdownData, setDetailedBreakdownData] = useState([]);
  const [transactionCategoryOverrides, setTransactionCategoryOverrides] = useState({});
  // Format: { transactionId: { categoryName: "Food and Drink", mappedCategory: "FOOD_AND_DRINK", type: "variable" } }

  // Low-confidence transaction modal state
  const [showLowConfidenceModal, setShowLowConfidenceModal] = useState(false);
  const [lowConfidenceTransactions, setLowConfidenceTransactions] = useState([]);

  const userHasBudget = budgets && budgets.length > 0;
  const currentBudget = userHasBudget ? budgets[0]?.budget || budgets[0] : null;

  // Available visualizations
  const visualizations = [
    { id: 1, name: 'Donut Chart', component: BudgetDonutChart },
    { id: 2, name: 'Dumbbell Chart', component: DumbbellBudgetChart },
    { id: 4, name: 'Bullet Chart', component: BudgetBulletChart },
    { id: 5, name: 'Radar Chart', component: BudgetRadarChart },
  ];

  const currentVisualization = visualizations.find(v => v.id === selectedVisualization) || visualizations[0];
  const VisualizationComponent = currentVisualization.component;

  // Load user's preferred visualization and category corrections on component mount
  useEffect(() => {
    const loadPreferredVisualization = async () => {
      try {
        setLoadingPreference(true);
        const preferredVis = await apiClient.getPreferredVisualization();
        if (preferredVis && preferredVis.length > 0) {
          setSelectedVisualization(preferredVis[0]); // Get the first (most recent) preference
        }
      } catch (error) {
        console.log('No saved visualization preference or error loading:', error.message);
        // Default to first visualization if no preference is saved
      } finally {
        setLoadingPreference(false);
      }
    };

    const loadCategoryCorrections = async () => {
      try {
        const corrections = await apiClient.getAllCategoryCorrections();
        // Convert array of corrections to the format expected by transactionCategoryOverrides
        if (Array.isArray(corrections) && corrections.length > 0) {
          const correctionsMap = {};
          corrections.forEach(correction => {
            if (correction.transaction_id && correction.corrected_categroy) {
              correctionsMap[correction.transaction_id] = {
                categoryName: correction.corrected_categroy.categoryName,
                mappedCategory: correction.corrected_categroy.mappedCategory,
                type: correction.corrected_categroy.type
              };
            }
          });
          setTransactionCategoryOverrides(correctionsMap);
          console.log('Loaded category corrections:', correctionsMap);
        } else {
          console.log('No category corrections found, starting fresh');
          setTransactionCategoryOverrides({});
        }
      } catch (error) {
        console.error('Error loading category corrections:', error);
        // Don't let this break the page - just use empty overrides
        setTransactionCategoryOverrides({});
      }
    };

    loadPreferredVisualization();
    loadCategoryCorrections();
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('=== BudgetSection Debug ===');
    console.log('budgets:', budgets);
    console.log('currentBudget:', currentBudget);
    console.log('transactions:', transactions);
    console.log('transactions length:', transactions?.length || 0);
    console.log('transactions type:', typeof transactions, Array.isArray(transactions));
    console.log('userHasBudget:', userHasBudget);
    console.log('selectedVisualization:', selectedVisualization);
    console.log('transactionCategoryOverrides:', transactionCategoryOverrides);
  }, [budgets, currentBudget, transactions, userHasBudget, selectedVisualization, transactionCategoryOverrides]);

  // Calculate spending vs budget with time period filtering
  const calculateSpendingVsBudget = () => {
    if (!currentBudget || !transactions) return null;

    // Calculate monthly budget total
    const monthlyBudgetTotal = [
      ...(currentBudget.fixed_costs || []),
      ...(currentBudget.variable_expenses || [])
    ].reduce((sum, item) => sum + (item.limit || 0), 0);

    // Budget should always be for current month only
    const totalBudgeted = calculateProRatedBudget(monthlyBudgetTotal, 'current_month');

    // Filter transactions to current month only for budget comparison
    const filteredTransactions = filterTransactionsByPeriod(transactions, 'current_month');

    const totalSpent = filteredTransactions
      .filter(transaction => {
        const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
        const override = transactionCategoryOverrides[transactionId];

        // If manually categorized, include it in spending
        if (override) {
          return true;
        }

        // Exclude uncategorized transfers
        const pfc = transaction.personal_finance_category;
        const primaryCategory = pfc?.primary;
        const detailedCategory = pfc?.detailed;

        const isTransfer = (
          primaryCategory === 'TRANSFER_OUT' ||
          detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'
        );

        return !isTransfer;
      })
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount || 0), 0);

    const percentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    const remaining = totalBudgeted - totalSpent;

    return {
      totalBudgeted,
      totalSpent,
      percentage,
      remaining,
      isOverBudget: totalSpent > totalBudgeted,
      monthlyBudgetTotal // Keep original monthly budget for display
    };
  };

  const spendingData = calculateSpendingVsBudget();

  // Calculate category spending with detailed category support and overrides
  const getCategorySpending = () => {
    if (!currentBudget || !transactions) return [];

    const allCategories = [
      ...(currentBudget.fixed_costs || []),
      ...(currentBudget.variable_expenses || [])
    ];

    // Build a mapping of detailed categories to budget category names for matching
    const detailedCategoryToBudgetMap = {};
    allCategories.forEach(budgetCat => {
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

    // Filter transactions to current month only for budget comparison
    const filteredTransactions = filterTransactionsByPeriod(transactions, 'current_month');

    // Calculate spending by budget category (not just Plaid primary category)
    const categorySpending = {};
    filteredTransactions.forEach(transaction => {
      const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
      const override = transactionCategoryOverrides[transactionId];

      let budgetCategoryName;

      // Check for category override first
      if (override) {
        budgetCategoryName = override.categoryName || override.mappedCategory;
      } else {
        // Skip transfer transactions
        const pfc = transaction.personal_finance_category;
        const primaryCategory = pfc?.primary;
        const detailedCategory = pfc?.detailed;

        const isTransfer = (
          primaryCategory === 'TRANSFER_OUT' ||
          detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'
        );

        if (isTransfer) {
          return;
        }

        // Try to match detailed category first
        if (detailedCategory) {
          // Normalize the detailed category - handle both formats
          let normalizedDetailed = detailedCategory.toUpperCase().replace(/\s+/g, '_');

          // Extract short form (e.g., "FOOD_AND_DRINK_GROCERIES" -> "GROCERIES")
          const detailedParts = normalizedDetailed.split('_');
          const shortDetailed = detailedParts[detailedParts.length - 1];

          // First, check if detailed category maps to a budget via detailed_categories array
          budgetCategoryName = detailedCategoryToBudgetMap[normalizedDetailed] || detailedCategoryToBudgetMap[shortDetailed];

          // If not found in detailed map, check if there's a budget category directly named like the detailed category
          if (!budgetCategoryName) {
            const matchingBudgetCat = allCategories.find(budgetCat => {
              const budgetNameNormalized = budgetCat.name.toUpperCase().replace(/\s+/g, '_');
              return budgetNameNormalized === normalizedDetailed || budgetNameNormalized === shortDetailed;
            });
            budgetCategoryName = matchingBudgetCat?.name;
          }
        }

        // Fallback to primary category matching if no detailed match
        if (!budgetCategoryName && primaryCategory) {
          // Try to find a budget category that matches this primary category
          const matchingBudgetCat = allCategories.find(budgetCat => {
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
          }
        }
      }

      if (budgetCategoryName) {
        categorySpending[budgetCategoryName] = (categorySpending[budgetCategoryName] || 0) + Math.abs(transaction.amount || 0);
      }
    });

    // Create array of categories with their spending (no consolidation)
    // Each budget category shows separately, even if they map to the same Plaid category
    const categoryData = [];

    allCategories.forEach(category => {
      const spent = categorySpending[category.name] || 0;

      // Calculate monthly budget limit, then pro-rate for time period
      const monthlyLimit = parseFloat(category.limit) || 0;
      const totalLimit = calculateProRatedBudget(monthlyLimit, 'current_month');

      const percentage = totalLimit > 0 ? (spent / totalLimit) * 100 : 0;
      const remaining = totalLimit - spent;

      // Check if this category has detailed categories
      const hasDetailedCategories = category.detailed_categories && category.detailed_categories.length > 0;

      // Determine mapped Plaid category for compatibility
      const categoryMap = {
        "Food and Drink": "FOOD_AND_DRINK",
        "Entertainment": "ENTERTAINMENT",
        "Travel": "TRAVEL",
        "Transportation": "TRANSPORTATION",
        "Shopping": "GENERAL_MERCHANDISE",
        "Rent and Utilities": "RENT_AND_UTILITIES",
        "Healthcare": "MEDICAL",
        "Groceries": "FOOD_AND_DRINK"
      };

      let mappedCategory = categoryMap[category.name];
      if (!mappedCategory) {
        const lowerName = category.name.toLowerCase();
        if (lowerName.includes('rent') || lowerName.includes('utilities')) mappedCategory = 'RENT_AND_UTILITIES';
        else if (lowerName.includes('food') || lowerName.includes('dining') || lowerName.includes('groceries')) mappedCategory = 'FOOD_AND_DRINK';
        else if (lowerName.includes('transport')) mappedCategory = 'TRANSPORTATION';
        else if (lowerName.includes('shop')) mappedCategory = 'GENERAL_MERCHANDISE';
        else mappedCategory = category.name.toUpperCase().replace(/\s+/g, '_');
      }

      categoryData.push({
        name: category.name,
        limit: totalLimit,
        spent,
        percentage,
        remaining,
        isOverBudget: spent > totalLimit,
        hasDetailedCategories,
        mappedCategory,
        originalCategories: [category] // Keep reference to original category
      });
    });

    return categoryData;
  };

  // Handle detailed category breakdown
  const handleDetailedBreakdown = (categoryName) => {
    if (!currentBudget || !transactions) return;

    // Get current category data
    const currentCategoryData = getCategorySpending();

    // Find the category
    const mainCategoryData = currentCategoryData.find(cat => cat.name === categoryName);
    if (!mainCategoryData || !mainCategoryData.originalCategories) return;

    // Create detailed breakdown from the original categories that have detailed_categories
    const detailedBreakdownData = [];
    
    mainCategoryData.originalCategories.forEach(originalCategory => {
      if (originalCategory.detailed_categories && originalCategory.detailed_categories.length > 0) {
        // Get spending for each detailed category using the same transaction matching logic with overrides
        originalCategory.detailed_categories.forEach(detailedCat => {
          const filteredTransactions = filterTransactionsByPeriod(transactions, 'current_month');
          const matchingTransactions = filteredTransactions.filter(transaction => {
            const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
            const override = transactionCategoryOverrides[transactionId];

            // If there's an override, check if it matches this detailed category's parent
            if (override) {
              // For detailed categories, we need to check if the override category matches the parent
              return override.categoryName === originalCategory.name;
            }

            // Original logic for non-overridden transactions
            const transactionDetailed = transaction.personal_finance_category?.detailed;
            if (transactionDetailed) {
              // Try to match the detailed category name with transaction detailed category
              const categoryParts = detailedCat.name.split(' - ');
              const detailedName = categoryParts.length > 1 ? categoryParts[1] : detailedCat.name;
              return transactionDetailed.toLowerCase().includes(detailedName.toLowerCase()) ||
                     detailedName.toLowerCase().includes(transactionDetailed.toLowerCase());
            }
            return false;
          });

          const spent = matchingTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

          // Pro-rate the detailed category limit based on time period
          const monthlyLimit = parseFloat(detailedCat.limit) || 0;
          const proRatedLimit = calculateProRatedBudget(monthlyLimit, 'current_month');

          detailedBreakdownData.push({
            name: detailedCat.name,
            limit: proRatedLimit,
            spent,
            remaining: Math.max(0, proRatedLimit - spent),
            percentage: proRatedLimit > 0 ? (spent / proRatedLimit) * 100 : 0,
            mappedCategory: detailedCat.name
          });
        });
      }
    });

    if (detailedBreakdownData.length > 0) {
      setSelectedDetailedCategory(categoryName);
      setDetailedBreakdownData(detailedBreakdownData);
      setIsDetailedBreakdownOpen(true);
    }
  };

  const categoryData = getCategorySpending();

  // Prepare consolidated data for BudgetDonutChart
  const prepareBudgetDataForChart = () => {
    if (!currentBudget) {
      return null;
    }

    // Get the consolidated category data
    const consolidatedCategories = getCategorySpending();
    
    // Convert consolidated categories back to the format expected by charts
    const consolidatedFixedCosts = [];
    const consolidatedVariableExpenses = [];
    
    consolidatedCategories.forEach(category => {
      // Create a single consolidated entry for this category group
      const consolidatedEntry = {
        name: category.name,
        limit: category.limit
      };
      
      // Add detailed categories if they exist
      if (category.hasDetailedCategories && category.originalCategories) {
        const allDetailedCategories = [];
        category.originalCategories.forEach(originalCat => {
          if (originalCat.detailed_categories && originalCat.detailed_categories.length > 0) {
            allDetailedCategories.push(...originalCat.detailed_categories);
          }
        });
        
        if (allDetailedCategories.length > 0) {
          consolidatedEntry.detailed_categories = allDetailedCategories;
        }
      }
      
      // Determine if this should go in fixed or variable expenses
      // If any of the original categories were in fixed_costs, put it there
      const hasFixedCosts = category.originalCategories && 
        category.originalCategories.some(originalCat => 
          currentBudget.fixed_costs && 
          currentBudget.fixed_costs.some(fixedCat => fixedCat.name === originalCat.name)
        );
      
      if (hasFixedCosts) {
        consolidatedFixedCosts.push(consolidatedEntry);
      } else {
        consolidatedVariableExpenses.push(consolidatedEntry);
      }
    });

    const chartData = {
      data: [
        {
          budget: {
            fixed_costs: consolidatedFixedCosts,
            variable_expenses: consolidatedVariableExpenses
          }
        }
      ]
    };

    return chartData;
  };

  const budgetDataForChart = prepareBudgetDataForChart();


  // Handle category click from donut chart
  const handleCategoryClick = (categoryName, mainCategory) => {
    setSelectedCategory(categoryName);
    setSelectedMainCategory(mainCategory);
    setShowCategoryBreakdown(true);
  };

  // Handle closing category breakdown
  const handleCloseCategoryBreakdown = () => {
    setShowCategoryBreakdown(false);
    setSelectedCategory(null);
    setSelectedMainCategory(null);
  };

  // Handle visualization selection
  const handleVisualizationChange = async (visId) => {
    try {
      setSelectedVisualization(visId);
      setShowDropdown(false);
      
      // Save preference to backend
      await apiClient.setPreferredVisualization(visId);
      console.log('Visualization preference saved successfully');
    } catch (error) {
      console.error('Failed to save visualization preference:', error.message);
      // Could show a toast notification here
    }
  };

  // Handle transaction recategorization
  const handleTransactionRecategorize = async (transaction, categoryData) => {
    const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;

    try {
      if (categoryData === null) {
        // Remove override - delete from backend
        await apiClient.deleteCategoryCorrection(transactionId);

        setTransactionCategoryOverrides(prevOverrides => {
          const newOverrides = { ...prevOverrides };
          delete newOverrides[transactionId];
          return newOverrides;
        });

        console.log('Category correction deleted for transaction:', transactionId);
      } else {
        // Add/update override - persist to backend
        const originalCategory = {
          primary: transaction.personal_finance_category?.primary,
          detailed: transaction.personal_finance_category?.detailed,
          category: transaction.category
        };

        const correctedCategory = {
          categoryName: categoryData.categoryName,
          mappedCategory: categoryData.mappedCategory,
          type: categoryData.type
        };

        await apiClient.createCategoryCorrection(transactionId, originalCategory, correctedCategory);

        setTransactionCategoryOverrides(prevOverrides => ({
          ...prevOverrides,
          [transactionId]: categoryData
        }));

        console.log('✅ Category correction saved:', {
          transactionId,
          merchant: transaction.merchant_name || transaction.name,
          originalCategory: originalCategory.primary,
          newCategory: categoryData
        });
      }
    } catch (error) {
      console.error('Failed to persist category correction:', error);
      // Still update local state even if backend fails
      setTransactionCategoryOverrides(prevOverrides => {
        const newOverrides = { ...prevOverrides };
        if (categoryData === null) {
          delete newOverrides[transactionId];
        } else {
          newOverrides[transactionId] = categoryData;
        }
        return newOverrides;
      });
    }
  };

  // Handle low-confidence transaction review
  const handleLowConfidenceReview = () => {
    const lowConfidenceTransactions = getLowConfidenceTransactions(
      transactions,
      transactionCategoryOverrides,
      true // current month only
    );

    setLowConfidenceTransactions(lowConfidenceTransactions);
    setShowLowConfidenceModal(true);
  };

  // Handle closing low-confidence modal
  const handleCloseLowConfidenceModal = () => {
    setShowLowConfidenceModal(false);
    setLowConfidenceTransactions([]);
  };

  // Get low-confidence transaction count for display
  const getLowConfidenceCount = () => {
    if (!transactions || !Array.isArray(transactions)) return 0;

    return getLowConfidenceTransactions(
      transactions,
      transactionCategoryOverrides,
      true // current month only
    ).length;
  };

  // Get available budget categories for recategorization
  const getAvailableBudgetCategories = () => {
    if (!currentBudget) return [];

    const categories = [];

    // Add fixed costs
    if (currentBudget.fixed_costs) {
      currentBudget.fixed_costs.forEach(cat => {
        const mappedCategory = getCategoryMapping(cat.name);
        categories.push({
          name: cat.name,
          limit: parseFloat(cat.limit) || 0,
          type: 'fixed',
          mappedCategory
        });
      });
    }

    // Add variable expenses
    if (currentBudget.variable_expenses) {
      currentBudget.variable_expenses.forEach(cat => {
        const mappedCategory = getCategoryMapping(cat.name);
        categories.push({
          name: cat.name,
          limit: parseFloat(cat.limit) || 0,
          type: 'variable',
          mappedCategory
        });
      });
    }

    return categories;
  };

  // Helper function to get category mapping
  const getCategoryMapping = (categoryName) => {
    const categoryMap = {
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
      "streaming_services": "ENTERTAINMENT",
      "Streaming_Services": "ENTERTAINMENT",
      "STREAMING_SERVICES": "ENTERTAINMENT"
    };

    let mappedCategory = categoryMap[categoryName];

    if (!mappedCategory) {
      const lowerName = categoryName.toLowerCase();
      if (lowerName.includes('rent') || lowerName.includes('utilities') || lowerName.includes('electric') || lowerName.includes('internet')) {
        mappedCategory = 'RENT_AND_UTILITIES';
      } else if (lowerName.includes('food') || lowerName.includes('dining') || lowerName.includes('restaurant')) {
        mappedCategory = 'FOOD_AND_DRINK';
      } else if (lowerName.includes('transport') || lowerName.includes('gas') || lowerName.includes('car')) {
        mappedCategory = 'TRANSPORTATION';
      } else if (lowerName.includes('shop') || lowerName.includes('store') || lowerName.includes('retail')) {
        mappedCategory = 'GENERAL_MERCHANDISE';
      } else if (lowerName.includes('streaming') || lowerName.includes('entertainment')) {
        mappedCategory = 'ENTERTAINMENT';
      } else if (lowerName.includes('health') || lowerName.includes('medical')) {
        mappedCategory = 'MEDICAL';
      } else {
        mappedCategory = categoryName.toUpperCase().replace(/\s+/g, '_');
      }
    }

    return mappedCategory;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.visualization-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div id="budget-section" className="budget-section mb-8">
      <div id="budget-section" className="mb-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Budget Overview
                  {isAdvisorView && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                      Advisor View
                    </span>
                  )}
                </h2>
                <p className="text-gray-600 mt-1">
                  {isAdvisorView ? (
                    userHasBudget
                      ? 'View and manage your client\'s budget and spending'
                      : 'Help your client create their first budget'
                  ) : (
                    userHasBudget
                      ? 'Track your spending against your budget goals'
                      : 'Create a budget to start tracking your finances'
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                {userHasBudget ? (
                  <>
                    <button
                      onClick={onEditBudget}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit size={16} />
                      Edit Budget
                    </button>

                    {/* Low-confidence transaction review button */}
                    {getLowConfidenceCount() > 0 && (
                      <button
                        onClick={handleLowConfidenceReview}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                        title={`${getLowConfidenceCount()} transactions need review`}
                      >
                        <Search size={16} />
                        Review Uncertain Transactions ({getLowConfidenceCount()})
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={onCreateBudget}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus size={16} />
                    Create Budget
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {userHasBudget ? (
              <div className="space-y-6">
                {/* Budget Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="text-green-600" size={20} />
                      <div>
                        <p className="text-sm text-green-600 font-medium">Monthly Income</p>
                        <p className="text-xl font-bold text-green-900">
                          ${currentBudget.income?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="text-blue-600" size={20} />
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Budgeted</p>
                        <p className="text-xl font-bold text-blue-900">
                          ${spendingData?.totalBudgeted?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="text-purple-600" size={20} />
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Total Spent</p>
                        <p className="text-xl font-bold text-purple-900">
                          ${spendingData?.totalSpent?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${spendingData?.isOverBudget ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      {spendingData?.isOverBudget ? (
                        <AlertTriangle className="text-red-600" size={20} />
                      ) : (
                        <DollarSign className="text-gray-600" size={20} />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${spendingData?.isOverBudget ? 'text-red-600' : 'text-gray-600'}`}>
                          {spendingData?.isOverBudget ? 'Over Budget' : 'Remaining'}
                        </p>
                        <p className={`text-xl font-bold ${spendingData?.isOverBudget ? 'text-red-900' : 'text-gray-900'}`}>
                          ${Math.abs(spendingData?.remaining || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Progress */}
                {spendingData && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getBudgetComparisonText('current_month', spendingData.monthlyBudgetTotal).title}
                        </h3>
                        {getBudgetComparisonText('current_month', spendingData.monthlyBudgetTotal).subtitle && (
                          <p className="text-xs text-gray-500 mt-1">
                            {getBudgetComparisonText('current_month', spendingData.monthlyBudgetTotal).subtitle}
                          </p>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${spendingData.isOverBudget ? 'text-red-600' : 'text-blue-600'}`}>
                        {spendingData.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${spendingData.isOverBudget ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                        style={{ width: `${Math.min(spendingData.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {spendingData.isOverBudget
                        ? `You're ${(spendingData.percentage - 100).toFixed(1)}% over budget this month`
                        : `${(100 - spendingData.percentage).toFixed(1)}% of budget remaining`
                      }
                    </p>
                  </div>
                )}

                {/* Budget Visualization Section */}
                {budgetDataForChart && transactions && !loadingPreference && (
                  <div className="p-6 border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <PieChart className="text-blue-600" size={24} />
                        <div>
                          <h3 className="font-semibold text-gray-900">Interactive Budget Visualization</h3>
                          <p className="text-sm text-gray-600">Click on any section to see detailed spending breakdown</p>
                        </div>
                      </div>
                      
                      {/* Visualization Selector Dropdown */}
                      <div className="relative visualization-dropdown">
                        <button
                          onClick={() => setShowDropdown(!showDropdown)}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm font-medium">{currentVisualization.name}</span>
                          <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showDropdown && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                            {visualizations.map((vis) => (
                              <button
                                key={vis.id}
                                onClick={() => handleVisualizationChange(vis.id)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                                  vis.id === selectedVisualization ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                }`}
                              >
                                {vis.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <VisualizationComponent
                        budgetData={budgetDataForChart}
                        transactionData={transactions}
                        categoryOverrides={transactionCategoryOverrides}
                        onCategoryClick={handleCategoryClick}
                        timePeriod="current_month"
                      />
                    </div>
                  </div>
                )}

                {/* Loading state for visualization preference */}
                {budgetDataForChart && transactions && loadingPreference && (
                  <div className="p-6 border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading visualization...</span>
                    </div>
                  </div>
                )}

                {/* Goal Contribution */}
                {currentBudget.goal_name && (
                  <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <h3 className="font-semibold text-blue-900 mb-2">Goal Contribution</h3>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-blue-800 font-medium">{currentBudget.goal_name}</p>
                        <p className="text-blue-600 text-sm">Monthly contribution</p>
                      </div>
                      <p className="text-xl font-bold text-blue-900">
                        ${currentBudget.monthly_contribution?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Category Breakdown */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Category Breakdown</h3>
                    <p className="text-xs text-gray-500">💡 Click any category to view transactions</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryData.map((category, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg transition-shadow cursor-pointer ${
                          category.name === 'Other' ? 'border-purple-200 bg-purple-50 hover:shadow-md' :
                          category.hasDetailedCategories ? 'hover:shadow-md border-blue-200 bg-blue-50' : 'hover:shadow-md border-gray-200 bg-gray-50'
                        }`}
                        onClick={() => handleCategoryClick(category.name, category.mappedCategory)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{category.name}</h4>
                            {category.name === 'Other' && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                Unallocated Spending
                              </span>
                            )}
                            {category.hasDetailedCategories && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                Detailed
                              </span>
                            )}
                            {category.originalCategories && category.originalCategories.length > 1 && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                {category.originalCategories.length} items
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${category.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                            ${category.spent.toFixed(2)} / ${category.limit.toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Show what's included in this consolidated category */}
                        {category.originalCategories && category.originalCategories.length > 1 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500">
                              Includes: {category.originalCategories.map(cat => cat.name).join(', ')}
                            </p>
                          </div>
                        )}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${category.isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(category.percentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-600">
                            {category.isOverBudget
                              ? `$${Math.abs(category.remaining).toFixed(2)} over budget`
                              : `$${category.remaining.toFixed(2)} remaining`
                            } • {category.percentage.toFixed(1)}% used
                          </p>
                          {category.hasDetailedCategories && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                handleDetailedBreakdown(category.name);
                              }}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* No Budget State */
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-16 w-16 text-gray-400 mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">No Budget Created</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {isAdvisorView 
                    ? 'Help your client create a budget to track their spending, set limits for different categories, and work towards their financial goals.'
                    : 'Create a budget to track your spending, set limits for different categories, and work towards your financial goals.'
                  }
                </p>
                <div className="space-y-3">
                  <button
                    onClick={onCreateBudget}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus size={20} />
                    {isAdvisorView ? 'Create Budget for Client' : 'Create Your First Budget'}
                  </button>
                  {/* Smart Templates Button - Show only if user has templates available */}
                  {budgetTemplates && budgetTemplates.length > 0 && onViewTemplates && (
                    <>
                      <p className="text-sm text-gray-500 my-2">or</p>
                      <button
                        onClick={onViewTemplates}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto"
                      >
                        <Sparkles size={20} />
                        Use Smart Budget Templates
                      </button>
                      <p className="text-sm text-gray-500 mt-2">
                        Choose from {budgetTemplates.length} AI-generated templates based on your goals
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Modal */}
        {showCategoryBreakdown && selectedCategory && selectedMainCategory && (
          <CategoryBreakdownChart
            categoryName={selectedCategory}
            mainCategory={selectedMainCategory}
            transactionData={transactions}
            budgetCategories={getAvailableBudgetCategories()}
            categoryOverrides={transactionCategoryOverrides}
            onTransactionRecategorize={handleTransactionRecategorize}
            onClose={handleCloseCategoryBreakdown}
          />
        )}

        {/* Detailed Budget Breakdown Modal */}
        {isDetailedBreakdownOpen && selectedDetailedCategory && (
          <DetailedBudgetBreakdownModal
            isOpen={isDetailedBreakdownOpen}
            onClose={() => {
              setIsDetailedBreakdownOpen(false);
              setSelectedDetailedCategory(null);
              setDetailedBreakdownData([]);
            }}
            categoryName={selectedDetailedCategory}
            detailedBreakdown={detailedBreakdownData}
            mainCategoryData={categoryData.find(cat => cat.name === selectedDetailedCategory)}
          />
        )}

        {/* Low-Confidence Transaction Modal */}
        <LowConfidenceTransactionModal
          isOpen={showLowConfidenceModal}
          onClose={handleCloseLowConfidenceModal}
          transactions={lowConfidenceTransactions}
          availableCategories={getAvailableBudgetCategories()}
          categoryOverrides={transactionCategoryOverrides}
          onTransactionRecategorize={handleTransactionRecategorize}
          title={`Review ${lowConfidenceTransactions.length} Uncertain Transaction${lowConfidenceTransactions.length !== 1 ? 's' : ''}`}
        />
      </div>
    </div>
  );
};

export default BudgetSection;