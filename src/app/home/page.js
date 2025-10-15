// home/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import NavBar from "../components/navigation/NavBar";
import BudgetSpendingChart from "./visuals/budgetVisual";
//import { apiClient } from "../lib/apiClient";

export default function HomePage() {
  const [transactions, setTransactions] = useState([]);
  const[userbudget, setBudget] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budgetloading, setBudgetLoading] = useState(true);
  const d3Container = useRef(null);

  

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Fetch transactions using authenticated API
        const data = await apiClient.getTransactions();
        if (data && data.added) {
          setTransactions(data.added);
        }
        setLoading(false);
      } catch (err) {
        setError(err.message || "Failed to fetch transactions.");
        setLoading(false);
      }
    };

    const fetchBudget = async () => {
      try {
        const response = await apiClient.getBudgets();
        setBudget({ data: response });
        if(response.length > 0){
          setBudgetLoading(false);
        }
      }
      catch(err){
        setError(err.message || "Failed to fetch budgets.");
      }
    };

    fetchTransactions();
    fetchBudget();
  }, []);

  useEffect(() => {
    if (transactions.length > 0 && d3Container.current) {
      const data = transactions
        .filter((transaction) => transaction.amount > 0)
        .map((transaction) => ({
          category: transaction.category.at(0),
          amount: transaction.amount,
        }));

      let combinedData = {};

      for (let i = 0; i < data.length; i++) {
        if (combinedData[data[i].category]) {
          combinedData[data[i].category] += data[i].amount;
        } else {
          combinedData[data[i].category] = data[i].amount;
        }
      }

      let currentX = Object.entries(combinedData).map(([category, amount]) => category);
      let currentY = Object.entries(combinedData).map(([category, amount]) => amount);

      const width = 800;
      const height = 400;
      const margin = { top: 40, right: 50, bottom: 50, left: 60 };

      let svg = d3.select(d3Container.current).select('svg');
      let g;

      // If the SVG doesn't exist, create it and the 'g' element
      if (svg.empty()) {
        svg = d3.select(d3Container.current)
          .append('svg')
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom);

        svg.append("text").attr('transform', "translate(" + 400 + "," + 30 + ")").text("Transactions by Category")

        g = svg.append('g')
          .attr("transform", `translate(${margin.left},${margin.top})`);

        g.append('g').attr('id', 'yaxis').classed('axis', true);
        g.append('g').attr('id', 'xaxis').classed('axis', true);
        g.append("text").attr("class", "mouse-display").attr("x", width).attr("y", -10).style("text-anchor", "end"); // Position mouse display
      } else {
        g = svg.select('g');
      }

      let yScale = d3
        .scaleLinear()
        .domain([0, d3.max(currentY)])
        .range([0, height])
        .nice();

      let yAxisScale = d3
        .scaleLinear()
        .domain([d3.max(currentY), 0])
        .range([0, height])
        .nice();

      let yAxis = d3.axisLeft().tickFormat((d) => "$" + d)
        .scale(yAxisScale);
      g.select('#yaxis').call(yAxis);

      let xScale = d3
        .scaleBand()
        .domain(currentX)
        .range([0, width])
        .padding(0.1);
      let xAxis = d3.axisBottom()
        .scale(xScale);
      g.select('#xaxis')
        .call(xAxis)
        .attr('transform', `translate(0, ${height})`);

      const mouseDisplay = g.select(".mouse-display");

      g.selectAll(".bar")
        .data(currentY)
        .join("rect")
        .classed("bar", true)
        .attr('x', (d, i) => xScale(currentX[i]))
        .attr('y', d => height - yScale(d))
        .attr('width', xScale.bandwidth())
        .attr('height', d => yScale(d))
        .attr("fill", "steelblue")
        .on("mouseover", function (e, d) {
          mouseDisplay.text("Amount: $" + parseInt(d));
        });
    }
  }, [transactions]);

  return (
    <main className="bg-white">
      <NavBar />

      {/* Page Content */}
      <section className="p-8">
        <h1 className="text-2xl font-bold text-black mb-4">Dashboard</h1>
        <p className="text-gray-600 mb-8">
          Welcome to your dashboard. Select an option from the navigation above.
        </p>

        {/* Transactions Section */}
        <div>
          <h2 className="text-xl font-semibold text-black mb-4">Recent Transactions</h2>
          {loading && <p className="text-gray-600">Loading transactions...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && transactions.length === 0 && (
            <p className="text-gray-600">No transactions found.</p>
          )}
          {!loading && !error && transactions.length > 0 && (
            <div className="bg-white p-4 rounded shadow-md">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-black">Date</th>
                    <th className="py-2 text-black">Name</th>
                    <th className="py-2 text-black">Amount</th>
                    <th className="py-2 text-black">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.transaction_id} className="border-b">
                      <td className="py-2 text-black">{transaction.date}</td>
                      <td className="py-2 text-black">{transaction.name}</td>
                      <td className="py-2 text-black">${transaction.amount.toFixed(2)}</td>
                      <td className="py-2 text-black">
                        {transaction.category ? transaction.category.join(", ") : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div ref={d3Container} className="bg-white p-4 rounded shadow-md" style={{ marginTop: '20px' }}>
        </div>
        {!budgetloading && !loading &&(
          <div className="bg-white p-4 rounded shadow-md" style={{ marginTop: '20px' }}>
          {!budgetloading && !loading && <BudgetSpendingChart budgetData={userbudget} transactionData={transactions} />}
        </div>
        )}
      </section>
    </main>
  );
}