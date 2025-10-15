// src/components/visuals/BudgetDumbbellChart.jsx
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { computeFinalCategoryData } from "./dataTransform";

const BudgetDumbbellChart = ({ budgetData, transactionData, onCategoryClick }) => {
  const svgRef = useRef();
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    // Basic data validation
    if (!budgetData?.data?.[0]?.budget || !transactionData || !Array.isArray(transactionData)) {
      console.error('BudgetDumbbellChart: Invalid or missing data');
      return;
    }

    const budget = budgetData.data[0].budget;
    const transactions = transactionData;

    // Calculate spending by main category
    const categorySpending = {};
    transactions.forEach(transaction => {
      const mainCategory = transaction.personal_finance_category?.primary;
      if (mainCategory) {
        categorySpending[mainCategory] = (categorySpending[mainCategory] || 0) + Math.abs(transaction.amount);
      } else {
        const fallbackCategory = transaction.category?.[0];
        if (fallbackCategory) {
          const formattedCategory = fallbackCategory.toUpperCase().replace(/\s+/g, '_');
          categorySpending[formattedCategory] = (categorySpending[formattedCategory] || 0) + Math.abs(transaction.amount);
        }
      }
    });

    // Map budget categories to spending data
    const budgetCategories = [
      ...(budget.fixed_costs || []),
      ...(budget.variable_expenses || [])
    ];

    const categoryMap = {
      "Food and Drink": "FOOD_AND_DRINK", "Entertainment": "ENTERTAINMENT",
      "Travel": "TRANSPORTATION", "Transportation": "TRANSPORTATION",
      "Shops": "GENERAL_MERCHANDISE", "Shopping": "GENERAL_MERCHANDISE",
      "Rent": "RENT_AND_UTILITIES", "Utilities": "RENT_AND_UTILITIES",
      "Rent and Utilities": "RENT_AND_UTILITIES", "Internet": "RENT_AND_UTILITIES",
      "Electric": "RENT_AND_UTILITIES", "Healthcare": "MEDICAL",
      "Insurance": "LOAN_PAYMENTS"
    };

    const chartData = budgetCategories.map(category => {
      let mappedCategory = categoryMap[category.name];
      if (!mappedCategory) {
        const lowerName = category.name.toLowerCase();
        if (lowerName.includes('rent') || lowerName.includes('utilities')) mappedCategory = 'RENT_AND_UTILITIES';
        else if (lowerName.includes('food') || lowerName.includes('dining')) mappedCategory = 'FOOD_AND_DRINK';
        else if (lowerName.includes('transport') || lowerName.includes('gas')) mappedCategory = 'TRANSPORTATION';
        else if (lowerName.includes('shop')) mappedCategory = 'GENERAL_MERCHANDISE';
        else mappedCategory = category.name.toUpperCase().replace(/\s+/g, '_');
      }
      const spent = categorySpending[mappedCategory] || 0;
      const limit = parseFloat(category.limit) || 0;
      return { name: category.name, limit, spent, mappedCategory };
    });

    const validChartData = chartData.filter(item => item.limit > 0);

    if (validChartData.length === 0) {
      console.error('No valid chart data for dumbbell chart');
      return;
    }

    // Helper function to format category names
    const formatCategoryName = (mappedCategory, originalName) => {
      const categoryNameMap = {
        'RENT_AND_UTILITIES': 'Rent and Utilities',
        'FOOD_AND_DRINK': 'Food and Drink',
        'GENERAL_MERCHANDISE': 'Shopping',
        'TRANSPORTATION': 'Transportation',
        'ENTERTAINMENT': 'Entertainment',
        'MEDICAL': 'Medical',
        'LOAN_PAYMENTS': 'Loan Payments',
        'GROCERIES': 'Groceries',
        'CLOTHING': 'Clothing',
        'PERSONAL_CARE': 'Personal Care',
        'HOME_IMPROVEMENT': 'Home Improvement',
        'BANK_FEES': 'Bank Fees'
      };
      
      if (categoryNameMap[mappedCategory]) {
        return categoryNameMap[mappedCategory];
      }
      
      // If not in our map, convert from ALL_CAPS to Title Case
      if (mappedCategory && typeof mappedCategory === 'string') {
        if (mappedCategory.includes('_')) {
          return mappedCategory
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        } else if (mappedCategory === mappedCategory.toUpperCase()) {
          // Handle single words in ALL_CAPS
          return mappedCategory.charAt(0).toUpperCase() + mappedCategory.slice(1).toLowerCase();
        }
      }
      
      return originalName;
    };

    // Combine data for categories that map to the same Plaid category
    const combinedData = {};
    validChartData.forEach(item => {
      const key = item.mappedCategory;
      if (!combinedData[key]) {
        combinedData[key] = {
          name: formatCategoryName(item.mappedCategory, item.name),
          limit: 0, spent: 0, mappedCategory: key
        };
      }
      combinedData[key].limit += item.limit;
      combinedData[key].spent += item.spent;
    });

    const finalChartData = Object.values(combinedData);

    // Chart dimensions
    const margin = { top: 50, right: 50, bottom: 50, left: 130 };
    const width = 600 - margin.left - margin.right;
    const height = (finalChartData.length * 50) + margin.top + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("width", width + margin.left + margin.right).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales
    const y = d3.scalePoint()
      .domain(finalChartData.map(d => d.name))
      .range([0, height - margin.top - margin.bottom])
      .padding(0.5);

    const x = d3.scaleLinear()
      .domain([0, d3.max(finalChartData, d => Math.max(d.limit, d.spent)) * 1.1])
      .range([0, width]);

    // Tooltip helper functions
    const hideTooltip = () => {
      g.selectAll(".tooltip").remove();
    };

    const showTooltipWithBackground = (event, { xPos, yPos, text, color }) => {
        hideTooltip();

        const tooltip = g.append("g")
            .attr("class", "tooltip")
            .attr("transform", `translate(${xPos}, ${yPos})`);

        const textElement = tooltip.append("text")
            .text(text)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", color)
            .attr("text-anchor", "middle")
            .attr("dy", "0.32em");

        const bbox = textElement.node().getBBox();
        const padding = 5;

        tooltip.insert("rect", "text")
            .attr("x", bbox.x - padding)
            .attr("y", bbox.y - padding)
            .attr("width", bbox.width + (padding * 2))
            .attr("height", bbox.height + (padding * 2))
            .attr("fill", "white")
            .attr("stroke", "#d1d5db")
            .attr("rx", 4)
            .attr("ry", 4);
    };


    // Draw visible lines
    g.selectAll(".line-visible")
      .data(finalChartData)
      .enter().append("line")
      .attr("y1", d => y(d.name)).attr("y2", d => y(d.name))
      .attr("x1", d => x(d.spent)).attr("x2", d => x(d.limit))
      .attr("stroke", d => d.spent > d.limit ? "#dc2626" : "gray")
      .attr("stroke-width", "2px")
      .attr("pointer-events", "none");

    // Draw invisible, thicker lines for easier hovering
    g.selectAll(".line-hover")
      .data(finalChartData)
      .enter().append("line")
      .attr("y1", d => y(d.name)).attr("y2", d => y(d.name))
      .attr("x1", d => x(d.spent)).attr("x2", d => x(d.limit))
      .attr("stroke", "transparent")
      .attr("stroke-width", "10px")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        const diff = d.limit - d.spent;
        const isOverspent = diff < 0;
        const text = isOverspent ? `$${Math.abs(diff).toFixed(2)} overspent` : `$${diff.toFixed(2)} left to spend`;
        const color = isOverspent ? "#dc2626" : "#16a34a";
        const xPos = (x(d.spent) + x(d.limit)) / 2;
        const yPos = y(d.name) - 20;
        showTooltipWithBackground(event, { xPos, yPos, text, color });
      })
      .on("mouseout", hideTooltip);

    // Draw circles for budget limit with hover tooltips
    g.selectAll(".circle-limit")
      .data(finalChartData)
      .enter().append("circle")
      .attr("cy", d => y(d.name)).attr("cx", d => x(d.limit))
      .attr("r", 6).attr("fill", "#3b82f6")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
          const text = `Budget: $${d.limit.toFixed(2)}`;
          const xPos = x(d.limit);
          const yPos = y(d.name) - 20;
          showTooltipWithBackground(event, { xPos, yPos, text, color: "#3b82f6" });
      })
      .on("mouseout", hideTooltip);

    // Draw circles for amount spent with hover tooltips
    g.selectAll(".circle-spent")
      .data(finalChartData)
      .enter().append("circle")
      .attr("cy", d => y(d.name)).attr("cx", d => x(d.spent))
      .attr("r", 6).attr("fill", d => d.spent > d.limit ? "#dc2626" : "#ef4444")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
          const text = `Spent: $${d.spent.toFixed(2)}`;
          const xPos = x(d.spent);
          const yPos = y(d.name) - 20;
          const color = d.spent > d.limit ? "#dc2626" : "#ef4444";
          showTooltipWithBackground(event, { xPos, yPos, text, color });
      })
      .on("mouseout", hideTooltip);

    // Add Y-axis
    g.append("g").attr("class", "y-axis")
      .call(d3.axisLeft(y).tickSize(0).tickPadding(10)) // <--- FIX IS HERE
      .selectAll(".tick text")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => setHoveredCategory(d))
      .on("mouseout", () => setHoveredCategory(null))
      .on("click", (event, d) => {
          const categoryData = finalChartData.find(cat => cat.name === d);
          if (onCategoryClick && categoryData) {
            onCategoryClick(categoryData.name, categoryData.mappedCategory);
          }
      });

    // Add X-axis
    g.append("g").attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `$${d}`));

    // Add chart title and legend
    svg.append("text")
      .attr("x", (width + margin.left + margin.right) / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle").style("font-size", "18px")
      .style("font-weight", "bold").text("Budget vs. Spent by Category");

    const legend = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${height - margin.bottom + 40})`);

    legend.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 6).style("fill", "#3b82f6");
    legend.append("text").attr("x", 10).attr("y", 0).text("Budgeted").style("font-size", "12px").attr("alignment-baseline","middle");
    legend.append("circle").attr("cx", 90).attr("cy", 0).attr("r", 6).style("fill", "#ef4444");
    legend.append("text").attr("x", 100).attr("y", 0).text("Spent").style("font-size", "12px").attr("alignment-baseline","middle");

  }, [budgetData, transactionData, onCategoryClick]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef}></svg>
      {hoveredCategory && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          <div><strong>{hoveredCategory}</strong></div>
          <div className="text-xs">Click to see detailed breakdown</div>
        </div>
      )}
    </div>
  );
};

export default BudgetDumbbellChart;