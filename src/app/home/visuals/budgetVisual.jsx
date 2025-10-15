import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const BudgetSpendingChart = ({budgetData, transactionData}) => {
  const svgRef = useRef();
  const [finalTranData, setTranData] = useState([]);
  const [finalBudgetData, setBudgetData] = useState([]);

  useEffect(() => {
    const transactions = transactionData || [];
    console.log(transactions)
    if (!transactions.length) return;
    let today = new Date();
    let sunday = new Date(today)
    let todayDay = today.getDay()
    sunday.setDate(today.getDate() - todayDay-7)
    //Change this after demo back to todayDay-1

    let data = [];
    for(let i=0; i<transactions.length; i++){
      let tempT = transactions[i];
      let tempDate = new Date(tempT.date)
      if(tempDate >= sunday && tempT.amount > 0){
        data.push({category: tempT.category[0], amount: tempT.amount})
      }
    }

    let combinedData = {};

    for (let i = 0; i < data.length; i++) {
        if (combinedData[data[i].category]) {
          combinedData[data[i].category] += data[i].amount;
        } else {
          combinedData[data[i].category] = data[i].amount;
        }
    }
    setTranData(combinedData);
  }, []);

  useEffect(() => {
    const budgets = budgetData.data[0].budget.variable_expenses || [];
    if (!budgets.length) return;
    setBudgetData(budgets)
  }, []);

  useEffect(() => {
    if (finalTranData.length === 0) return;
    if (finalBudgetData.length === 0) return d3.select(svgRef.current)
      .append("text")
      .attr('transform', "translate(" + 300 + "," + 245 + ")")
      .text("Create a Budget");
    
    let budgetNames = [];
    let budgetAmounts = [];
    for(let i=0; i<finalBudgetData.length; i++){
      budgetNames.push(finalBudgetData[i].name)
      budgetAmounts.push(finalBudgetData[i].limit)
    }

    let initialTranCats = Object.keys(finalTranData);
    let initialTranAmts = Object.values(finalTranData);

    let tranCats = [];
    let tranAmts = [];

    for(let i=0; i<initialTranCats.length; i++){
      if(budgetNames.includes(initialTranCats[i])){
        tranCats.push(initialTranCats[i])
        tranAmts.push(initialTranAmts[i])
      }
    }
    
    const CHART_WIDTH = 700;
    const CHART_HEIGHT = 500;
    const MARGIN = { top: 40, right: 50, bottom: 50, left: 60 };

    let svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr('width', '700').attr('height','500')
    let g = svg.append("g").attr('transform', "translate(" + 80 + "," + 40 + ")")

    svg.append("text").attr('transform', "translate(" + 340 + "," + 490 + ")").text("Category")
    svg.append("text").attr('transform', "translate(" + 300 + "," + 30 + ")").text("Variable Expenses and Budget This Week")
    g.append('g').attr('id', 'yaxis').classed('axis', true)
    g.append('g').attr('id', 'xaxis').classed('axis', true)

    let width = CHART_WIDTH - MARGIN.left - MARGIN.right
    let height = CHART_HEIGHT - MARGIN.top - MARGIN.bottom

    let yScale = d3
    .scaleLinear()
    .domain([0, d3.max([d3.max(budgetAmounts), d3.max(tranAmts)])])
    .range([0, height])
    .nice()

    let yAxisScale = d3
    .scaleLinear()
    .domain([d3.max([d3.max(budgetAmounts), d3.max(tranAmts)]), 0])
    .range([0, height])
    .nice()

    let yAxis = d3.axisLeft().tickFormat((d) => "$" + d)
    yAxis.scale(yAxisScale)
    g.select('#yaxis').call(yAxis)

    let xScale = d3
    .scaleBand()
    .domain(budgetNames)
    .range([0, width])
    .padding(0.1)

    let xAxis = d3.axisBottom()
    xAxis.scale(xScale)
    g.select('#xaxis').call(xAxis).attr('transform', "translate(" + 0 + "," + (height) + ")")

    g.selectAll(".budgetbar")
    .data(budgetAmounts)
    .join("rect")
    .classed("bar", true)
    .attr('x', (d, i) => xScale(budgetNames[i]))
    .attr('y', d => height - yScale(d))
    .attr('width', xScale.bandwidth())
    .attr('height', d => yScale(d))
    .attr('fill', '#87a96b')

    g.selectAll(".tranbar")
    .data(tranAmts)
    .join("rect")
    .classed("bar", true)
    .attr('x', (d, i) => xScale(tranCats[i]))
    .attr('y', d => height - yScale(d))
    .attr('width', xScale.bandwidth())
    .attr('height', d => yScale(d))
    .attr('fill', '#a52a2a')

  }, [finalTranData, finalBudgetData]);

  return <svg ref={svgRef}></svg>;
};

export default BudgetSpendingChart;