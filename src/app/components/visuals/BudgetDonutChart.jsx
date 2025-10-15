import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { computeFinalCategoryData } from "./dataTransform";

const BudgetDonutChart = ({ budgetData, transactionData, categoryOverrides = {}, onCategoryClick, timePeriod = 'current_month' }) => {
  const svgRef = useRef();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    console.log('=== BudgetDonutChart Debug ===');
    console.log('budgetData:', budgetData);
    console.log('transactionData length:', transactionData?.length || 0);
    
    // Enhanced validation
    if (!budgetData) {
      console.error('BudgetDonutChart: No budgetData provided');
      return;
    }
    
    if (!budgetData.data?.[0]?.budget) {
      console.error('BudgetDonutChart: Invalid budgetData structure', budgetData);
      return;
    }
    
    if (!transactionData || !Array.isArray(transactionData)) {
      console.error('BudgetDonutChart: No transactionData provided or not an array');
      return;
    }

    const budget = budgetData.data[0].budget;
    console.log('Budget structure:', budget);
    
    const transactions = transactionData;
    console.log('Processing', transactions.length, 'transactions');

    // Calculate spending by main category (using personal_finance_category.primary)
    const categorySpending = {};
    transactions.forEach(transaction => {
      const mainCategory = transaction.personal_finance_category?.primary;
      if (mainCategory) {
        categorySpending[mainCategory] = (categorySpending[mainCategory] || 0) + Math.abs(transaction.amount);
      } else {
        // Fallback to category array if no personal_finance_category
        const fallbackCategory = transaction.category?.[0];
        if (fallbackCategory) {
          categorySpending[fallbackCategory.toUpperCase().replace(/\s+/g, '_')] = 
            (categorySpending[fallbackCategory.toUpperCase().replace(/\s+/g, '_')] || 0) + Math.abs(transaction.amount);
        }
      }
    });

    console.log('Category spending calculated:', categorySpending);

    // Map budget categories to spending data
    const budgetCategories = [
      ...(budget.fixed_costs || []),
      ...(budget.variable_expenses || [])
    ];

    console.log('Budget categories:', budgetCategories);

    // Enhanced category mapping for better matching
    const categoryMap = {
      "Food and Drink": "FOOD_AND_DRINK",
      "Entertainment": "ENTERTAINMENT", 
      "Travel": "TRANSPORTATION",
      "Transportation": "TRANSPORTATION",
      "Shops": "GENERAL_MERCHANDISE",
      "Shopping": "GENERAL_MERCHANDISE",
      "Rent": "RENT_AND_UTILITIES",
      "Utilities": "RENT_AND_UTILITIES",
      "Rent and Utilities": "RENT_AND_UTILITIES",
      "Internet": "RENT_AND_UTILITIES",
      "Electric": "RENT_AND_UTILITIES",
      "Healthcare": "MEDICAL",
      "Insurance": "LOAN_PAYMENTS" // or appropriate category
    };

    const chartData = budgetCategories.map(category => {
      // Map budget category names to Plaid primary categories
      let mappedCategory = categoryMap[category.name];
      
      // If not found in map, try to infer from name
      if (!mappedCategory) {
        const lowerName = category.name.toLowerCase();
        if (lowerName.includes('rent') || lowerName.includes('utilities') || lowerName.includes('internet') || lowerName.includes('electric')) {
          mappedCategory = 'RENT_AND_UTILITIES';
        } else if (lowerName.includes('food') || lowerName.includes('dining') || lowerName.includes('restaurant')) {
          mappedCategory = 'FOOD_AND_DRINK';
        } else if (lowerName.includes('transport') || lowerName.includes('gas') || lowerName.includes('car')) {
          mappedCategory = 'TRANSPORTATION';
        } else if (lowerName.includes('shop') || lowerName.includes('retail')) {
          mappedCategory = 'GENERAL_MERCHANDISE';
        } else {
          // Last resort: use the category name as-is, formatted
          mappedCategory = category.name.toUpperCase().replace(/\s+/g, '_');
        }
      }
      
      const spent = categorySpending[mappedCategory] || 0;
      const limit = parseFloat(category.limit) || 0;
      
      console.log(`Category "${category.name}" -> "${mappedCategory}": spent=$${spent}, limit=$${limit}`);
      
      return {
        name: category.name,
        limit: limit,
        spent: spent,
        remaining: Math.max(0, limit - spent),
        percentage: limit > 0 ? (spent / limit) * 100 : 0,
        mappedCategory: mappedCategory
      };
    });

    console.log('Chart data prepared:', chartData);

    // Filter out categories with no budget limit
    const validChartData = chartData.filter(item => item.limit > 0);
    
    if (validChartData.length === 0) {
      console.error('No valid chart data (all categories have 0 limit)');
      return;
    }

    console.log('Valid chart data:', validChartData);

    // Combine categories that map to the same Plaid category
    const combinedData = {};
    validChartData.forEach(item => {
      const key = item.mappedCategory;
      if (!combinedData[key]) {
        combinedData[key] = {
          name: item.mappedCategory === 'RENT_AND_UTILITIES' ? 'Rent and Utilities' : 
                item.mappedCategory === 'FOOD_AND_DRINK' ? 'Food and Drink' :
                item.mappedCategory === 'GENERAL_MERCHANDISE' ? 'Shopping' :
                item.mappedCategory === 'TRANSPORTATION' ? 'Transportation' :
                item.name,
          limit: 0,
          spent: 0,
          remaining: 0,
          percentage: 0,
          mappedCategory: key
        };
      }
      combinedData[key].limit += item.limit;
      combinedData[key].spent += item.spent;
      combinedData[key].remaining += item.remaining;
    });

    // Recalculate percentages for combined data
    const finalChartData = Object.values(combinedData).map(item => ({
      ...item,
      percentage: item.limit > 0 ? (item.spent / item.limit) * 100 : 0,
      remaining: Math.max(0, item.limit - item.spent)
    }));

    console.log('Final chart data:', finalChartData);

    // If still no valid data, show error
    if (finalChartData.length === 0) {
      console.error('No final chart data to render');
      return;
    }

    // Chart dimensions - Adjusted for labels
    const width = 600;
    const height = 500;
    const margin = 100; // Increased margin for more label space
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.6; // Donut hole

    // Clear previous chart
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Setup SVG
    svg
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Color scales
    const colorScale = d3.scaleOrdinal()
      .domain(finalChartData.map(d => d.name))
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']);

    // Create pie generator based on budget limit
    const pie = d3.pie()
      .value(d => d.limit)
      .sort(null);

    // Create arc generators
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    // Create pie data
    const pieData = pie(finalChartData);
    console.log('Pie data:', pieData);

    // Draw budget limit arcs (background)
    const budgetArcs = g.selectAll(".budget-arc")
      .data(pieData)
      .enter()
      .append("path")
      .attr("class", "budget-arc")
      .attr("d", arc)
      .attr("fill", (d, i) => colorScale(finalChartData[i].name))
      .attr("opacity", 0.3)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Draw spent amount arcs (foreground)
    const spentArcs = g.selectAll(".spent-arc")
      .data(pieData)
      .enter()
      .append("path")
      .attr("class", "spent-arc")
      .attr("d", (d, i) => {
        const data = finalChartData[i];
        const spentRatio = data.limit > 0 ? data.spent / data.limit : 0;
        // Cap the ratio at 1 for the radius calculation. Over-budget is shown with color.
        const cappedRatio = Math.min(spentRatio, 1);
        
        if (cappedRatio === 0) return null;
        
        const spentOuterRadius = innerRadius + (radius - innerRadius) * cappedRatio;
        
        const spentArcGenerator = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(spentOuterRadius)
          .startAngle(d.startAngle)
          .endAngle(d.endAngle);
        
        return spentArcGenerator();
      })
      .attr("fill", (d, i) => {
        const data = finalChartData[i];
        // If over budget, show a darker red color. Otherwise, use a standard red.
        return data.spent > data.limit ? "#dc2626" : "#ef4444";
      });


    // Add invisible overlay for better interaction
    const interactionArcs = g.selectAll(".interaction-arc")
      .data(pieData)
      .enter()
      .append("path")
      .attr("class", "interaction-arc")
      .attr("d", arc)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        const data = finalChartData[d.index];
        setHoveredCategory(data.name);
        d3.select(budgetArcs.nodes()[d.index])
          .transition().duration(50)
          .attr('opacity', 0.6);
      })
      .on("mouseout", (event, d) => {
        setHoveredCategory(null);
        d3.select(budgetArcs.nodes()[d.index])
          .transition().duration(50)
          .attr('opacity', 0.3);
      })
      .on("click", (event, d) => {
        const data = finalChartData[d.index];
        setSelectedCategory(data.name);
        if (onCategoryClick) {
          onCategoryClick(data.name, data.mappedCategory);
        }
        d3.selectAll(".budget-arc").attr("stroke", "#fff").attr("stroke-width", 2);
        d3.select(budgetArcs.nodes()[d.index])
          .transition()
          .duration(200)
          .attr("stroke-width", 4)
          .attr("stroke", "#2563eb");
      });

    // --- Add labels with shorter leader lines ---
    const outerArc = d3.arc()
        .innerRadius(radius * 1.2) // Increased distance for more label spacing
        .outerRadius(radius * 1.2);

    const labels = g.selectAll('.label-group')
        .data(pieData)
        .enter()
        .append('g')
        .attr('class', 'label-group');

    labels.append('polyline')
        .attr('stroke', '#4b5563')
        .attr('stroke-width', 1)
        .attr('fill', 'none')
        .attr('points', d => {
            if (d.endAngle - d.startAngle < 0.1) return null;
            const posA = arc.centroid(d);
            const posB = outerArc.centroid(d);
            const posC = outerArc.centroid(d);
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            posC[0] = radius * 1.25 * (midangle < Math.PI ? 1 : -1); // Extend line
            return [posA, posB, posC];
        });
        
    labels.append('text')
        .text((d, i) => finalChartData[i].name)
        .attr('transform', d => {
            const pos = outerArc.centroid(d);
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            pos[0] = radius * 1.3 * (midangle < Math.PI ? 1 : -1); // Move text with line
            return `translate(${pos})`;
        })
        .style('text-anchor', d => {
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            return (midangle < Math.PI ? 'start' : 'end');
        })
        .attr('dy', '.35em')
        .attr("font-size", "12px")
        .attr("font-weight", "500")
        .attr("fill", "#374151")
        .style('opacity', d => (d.endAngle - d.startAngle < 0.1 ? 0 : 1));

    // Add center text showing total spent vs total budget
    const totalSpent = finalChartData.reduce((sum, d) => sum + d.spent, 0);
    const totalBudget = finalChartData.reduce((sum, d) => sum + d.limit, 0);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .attr("fill", "#1f2937")
      .attr("y", -5)
      .text(`$${totalSpent.toFixed(0)}`);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#6b7280")
      .attr("y", 15)
      .text(`of $${totalBudget.toFixed(0)}`);

    console.log('Chart rendered successfully!');

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

export default BudgetDonutChart;

