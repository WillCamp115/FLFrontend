// src/components/visuals/CategoryBreakdownChart.jsx
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import TransactionDetailsView from "./TransactionDetailsView";
import { filterTransactionsByPeriod } from "../../utils/timeUtils";

const CategoryBreakdownChart = ({
  categoryName,
  mainCategory,
  transactionData,
  budgetCategories = [],
  categoryOverrides = {},
  onTransactionRecategorize,
  onClose
}) => {
  const svgRef = useRef();
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [forceChartRender, setForceChartRender] = useState(0); // Force re-render trigger

  // Parse entity_id to get readable names
  const parseEntityId = (entityId) => {
    if (!entityId) return 'Unknown';
    
    // Remove numbers and "Entity" suffix, then format
    const cleaned = entityId
      .replace(/Entity\d+/g, '') // Remove "Entity" + numbers
      .replace(/\d+/g, '') // Remove any remaining numbers
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .trim();
    
    return cleaned || 'Unknown';
  };

  // Helper function to truncate long category names
  const truncateLabel = (text, maxLength = 12) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  useEffect(() => {
    if (!transactionData || !mainCategory) return;

    // Skip chart rendering if we're showing transaction details
    if (selectedSubcategory && selectedTransactions.length > 0) return;
    if (showAllTransactions) return;

    // Filter transactions to current month - USE SAME LOGIC AS getCategorySpending!
    console.log(`📊 Total transactions passed to CategoryBreakdownChart: ${transactionData.length}`);

    // Log rent transactions specifically
    transactionData.forEach(t => {
      if (t.name && t.name.toLowerCase().includes('rent')) {
        console.log(`🏠 Found rent transaction: ${t.name}, date: ${t.date}, amount: $${t.amount}`);
      }
    });

    // Use the SAME filtering function as getCategorySpending to ensure consistency
    const currentMonthTransactions = filterTransactionsByPeriod(transactionData, 'current_month');

    console.log(`📦 Current month transactions after filterTransactionsByPeriod: ${currentMonthTransactions.length}`);

    // Special handling for "Other" category
    let categoryTransactions;
    if (mainCategory === "OTHER") {
      // For "Other" category, find transactions that don't match any budget categories
      const budgetCategoryMappings = new Set();

      // Build set of all mapped categories from budget
      budgetCategories.forEach(cat => {
        budgetCategoryMappings.add(cat.mappedCategory);
      });

      // Filter to current month transactions that don't match any budget category
      categoryTransactions = currentMonthTransactions.filter(transaction => {
        const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
        const override = categoryOverrides[transactionId];

        // If there's an override, check the override category
        if (override) {
          return !budgetCategoryMappings.has(override.mappedCategory);
        }

        // Skip transfer transactions
        const pfc = transaction.personal_finance_category;
        const primaryCategory = pfc?.primary;
        const detailedCategory = pfc?.detailed;

        const isTransfer = (
          primaryCategory === 'TRANSFER_OUT' ||
          detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'
        );

        if (isTransfer) return false;

        // Check if transaction's primary category matches any budget category
        const transactionPrimary = primaryCategory;
        if (!transactionPrimary) return true; // Include if no primary category

        return !budgetCategoryMappings.has(transactionPrimary);
      });
    } else {
      // Standard filtering for regular categories (current month only)
      // Match transactions that belong to this budget category

      // Build a mapping to check if transactions belong to this category
      // This uses the same logic as dataTransform.ts
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

      console.log(`🔍 Filtering for "${categoryName}" (mainCategory: ${mainCategory})`);
      console.log(`📦 ${currentMonthTransactions.length} transactions in current month`);

      categoryTransactions = currentMonthTransactions.filter(transaction => {
        const transactionId = transaction.transaction_id || `${transaction.date}-${transaction.amount}`;
        const override = categoryOverrides[transactionId];

        // If there's an override, check if it matches this budget category
        if (override) {
          const matches = (override.categoryName === categoryName);
          console.log(`🔄 ${transaction.merchant_name || transaction.name}: Override -> ${override.categoryName} ${matches ? '✅' : '❌'}`);
          return matches;
        }

        // Try to match transaction to this budget category using same logic as dataTransform.ts
        const pfc = transaction.personal_finance_category;
        const primaryCategory = pfc?.primary;
        const detailedCategory = pfc?.detailed;

        // IMPORTANT: Only match transactions that belong to THIS specific category
        // If categoryName is "Groceries" (a detailed category), only show grocery transactions
        // If categoryName is "Food and Drink" (a primary category), show ALL food transactions

        let matched = false;
        let matchReason = '';

        // First, check if this budget category name matches a detailed Plaid category
        if (detailedCategory) {
          const normalizedCategoryName = categoryName.toUpperCase().replace(/\s+/g, '_');
          const normalizedDetailed = detailedCategory.toUpperCase().replace(/\s+/g, '_');

          // Extract short form from detailed category (e.g., "FOOD_AND_DRINK_GROCERIES" -> "GROCERIES")
          const detailedParts = normalizedDetailed.split('_');
          const shortDetailed = detailedParts[detailedParts.length - 1];

          // Match if category name matches the detailed category (either full or short form)
          if (normalizedDetailed === normalizedCategoryName ||
              shortDetailed === normalizedCategoryName ||
              normalizedDetailed.endsWith('_' + normalizedCategoryName)) {
            matched = true;
            matchReason = 'detailed match';
          }
        }

        // Only fall back to primary category match if the budget category IS a primary category
        if (!matched) {
          const mappedPrimaryCategory = categoryMap[categoryName];
          if (mappedPrimaryCategory && primaryCategory === mappedPrimaryCategory) {
            // This budget category is a primary category (e.g., "Food and Drink", "Rent and Utilities")
            // Show ALL transactions with this primary category
            matched = true;
            matchReason = 'primary via categoryMap';
          }
        }

        // Also check mainCategory prop (which is the Plaid category passed in)
        if (!matched && primaryCategory === mainCategory) {
          // Match if primary categories align
          matched = true;
          matchReason = 'primary via mainCategory';
        }

        if (categoryName.toLowerCase().includes('rent') || categoryName.toLowerCase().includes('utilities')) {
          console.log(`${matched ? '✅' : '❌'} ${transaction.merchant_name || transaction.name} ($${transaction.amount}): primary=${primaryCategory}, detailed=${detailedCategory}, reason=${matchReason || 'no match'}`);
        }

        return matched;
      });

      console.log(`✅ Matched ${categoryTransactions.length} transactions for "${categoryName}"`);
    }

    // If no transactions, show empty state
    if (categoryTransactions.length === 0) {
      setShowAllTransactions(true);
      setSelectedTransactions([]);
      return;
    }

    // Group by the LAST item in the category array (most specific subcategory)
    const subcategoryGroups = {};
    categoryTransactions.forEach(transaction => {
      // Get the last (most specific) category from the category array
      const categories = transaction.category || [];
      let specificCategory = 'Other';
      
      if (categories.length > 0) {
        specificCategory = categories[categories.length - 1];
      } else if (transaction.personal_finance_category?.detailed) {
        // Fallback to detailed category if no category array
        const detailed = transaction.personal_finance_category.detailed;
        const parts = detailed.split('_');
        specificCategory = parts[parts.length - 1] || 'Other';
      }
      
      // Group by subcategory only (not merchant)
      if (!subcategoryGroups[specificCategory]) {
        subcategoryGroups[specificCategory] = {
          name: specificCategory,
          transactions: [],
          amount: 0
        };
      }
      
      subcategoryGroups[specificCategory].transactions.push(transaction);
      subcategoryGroups[specificCategory].amount += Math.abs(transaction.amount); // Use absolute value
    });

    // Convert to array and sort by amount
    const chartData = Object.values(subcategoryGroups)
      .filter(item => item.transactions.length > 0)
      .sort((a, b) => b.amount - a.amount);

    // FALLBACK LOGIC: If there are too few meaningful subcategories, show all transactions directly
    const meaningfulSubcategories = chartData.filter(item => 
      item.name !== 'Other' && 
      item.name !== 'Unknown' && 
      item.transactions.length > 0
    );
    
    if (meaningfulSubcategories.length <= 1) {
      // Not enough breakdown, show all transactions directly
      setShowAllTransactions(true);
      setSelectedTransactions(categoryTransactions);
      return;
    }

    // Chart dimensions - INCREASED BOTTOM MARGIN for labels
    const margin = { top: 40, right: 30, bottom: 120, left: 80 }; // Increased bottom from 80 to 120
    const width = 600 - margin.left - margin.right; // Slightly wider
    const height = 400 - margin.bottom - margin.top; // Slightly taller

    // Clear previous chart
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Setup SVG
    svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.name))
      .range([0, width])
      .padding(0.15); // Slightly more padding between bars

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.amount)])
      .nice()
      .range([height, 0]);

    // Color scale
    const colorScale = d3.scaleSequential()
      .domain([0, chartData.length - 1])
      .interpolator(d3.interpolateBlues);

    // Create bars
    g.selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.name))
      .attr("y", d => yScale(d.amount))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - yScale(d.amount))
      .attr("fill", (d, i) => colorScale(i))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        // Simple highlight without tooltip
        d3.select(this).attr("opacity", 0.8);
      })
      .on("mouseout", function() {
        // Reset bar opacity
        d3.select(this).attr("opacity", 1);
      })
      .on("click", function(event, d) {
        // Show individual transactions
        setSelectedSubcategory(d.name);
        setSelectedTransactions(d.transactions);
        
        // Visual feedback
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 3)
          .attr("stroke", "#2563eb");
      });

    // Add value labels on bars
    g.selectAll(".bar-label")
      .data(chartData)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.amount) - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("fill", "#374151")
      .text(d => `$${d.amount.toFixed(0)}`);

    // Add transaction count labels  #####Commenting out for now because of overlap/formatting issue
   /* g.selectAll(".count-label")
      .data(chartData)
      .enter()
      .append("text")
      .attr("class", "count-label")
      .attr("x", d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.amount) - 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#6b7280")
      .text(d => `${d.transactions.length} txn`); // Shortened "transactions" to "txn"*/

    // X axis with improved label handling
    const xAxis = g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(0)) // Remove tick marks
      .style("font-size", "10px"); // Smaller font

    // Custom label positioning for x-axis
    xAxis.selectAll(".tick text")
      .remove(); // Remove default labels

    // Add custom rotated labels with better positioning
    xAxis.selectAll(".tick")
      .append("text")
      .attr("x", 0)
      .attr("y", 15) // Move further down
      .attr("dy", "0.35em")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px")
      .style("fill", "#374151")
      .text(d => truncateLabel(d, 15)); // Truncate long labels

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => `$${d}`))
      .style("font-size", "11px");

    // Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#6b7280")
      .text("Amount Spent ($)");

    // Chart title
    g.append("text")
      .attr("x", width / 2)
      .attr("y", 0 - (margin.top/2 ))
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .text(`${categoryName} - Breakdown by Subcategory`);

    // Total spent in this category
    const totalSpent = chartData.reduce((sum, d) => sum + d.amount, 0);
    g.append("text")
      .attr("x", width)
      .attr("y", 0 - (margin.top/2))
      .attr("text-anchor", "end")
      .style("font-size", "12px")
      .style("fill", "#6b7280")
      .text(`Total: $${totalSpent.toFixed(2)}`);

    // Cleanup function to clear any D3 references
    return () => {
      const svg = d3.select(svgRef.current);
      if (svg.node()) {
        svg.selectAll("*").remove();
      }
    };
  }, [categoryName, mainCategory, transactionData, selectedSubcategory, selectedTransactions, showAllTransactions, forceChartRender]);

  const handleCloseTransactionDetails = () => {
    setSelectedSubcategory(null);
    setSelectedTransactions([]);
    setShowAllTransactions(false);
    
    // Reset bar highlighting
    d3.select(svgRef.current)
      .selectAll(".bar")
      .transition()
      .duration(200)
      .attr("stroke-width", 1)
      .attr("stroke", "#fff");
  };

  const handleBackToBreakdown = () => {
    if (showAllTransactions) {
      // If we came directly to transactions (no breakdown), close completely
      onClose();
    } else {
      // Otherwise, go back to breakdown chart - use atomic state update
      setSelectedSubcategory(null);
      setSelectedTransactions([]);
      
      // Force chart re-render by incrementing the render trigger
      setForceChartRender(prev => prev + 1);
    }
  };

  // Determine if we should show transaction details
  const shouldShowTransactionDetails = 
    (selectedSubcategory && selectedTransactions.length > 0) || 
    showAllTransactions;

  // If showing individual transactions
  if (shouldShowTransactionDetails) {
    return (
      <TransactionDetailsView
        categoryName={categoryName}
        subcategoryName={selectedSubcategory || "All Transactions"}
        transactions={selectedTransactions}
        budgetCategories={budgetCategories}
        categoryOverrides={categoryOverrides}
        onTransactionRecategorize={onTransactionRecategorize}
        onClose={onClose}
        onBack={handleBackToBreakdown}
        showBackButton={!showAllTransactions} // Only show back button if we have a breakdown to go back to
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {categoryName} Spending Breakdown
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="flex justify-center">
          <svg ref={svgRef}></svg>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-600 text-center">
            This shows your spending by subcategory within {categoryName}
          </div>
          <div className="text-xs text-gray-500 text-center bg-blue-50 p-2 rounded">
            💡 <strong>Tip:</strong> Click on any bar to see individual transactions for that subcategory
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryBreakdownChart;