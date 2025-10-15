import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Custom Tooltip for better styling and formatting
const CustomTooltip = ({ active = false, payload = [], label = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm">
        <p className="font-semibold text-gray-800">{`${label}`}</p>
        <p className="text-blue-600">{`Total Spent: $${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
      </div>
    );
  }
  return null;
};

const GroupBarChart = ({ GroupTransactionData }) => {

  // useMemo will re-calculate the data only when GroupTransactionData changes
  const processedData = useMemo(() => {
    if (!GroupTransactionData || !GroupTransactionData.combined_transactions) {
      return [];
    }

    const spendingByCategory = GroupTransactionData.combined_transactions
      .filter(transaction => transaction.amount < 0) // Filter for expenses only
      .reduce((acc, transaction) => {
        const { category, amount } = transaction;
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += Math.abs(amount); // Sum the absolute value of the amounts
        return acc;
      }, {});

    // Convert the aggregated object into an array suitable for recharts
    return Object.keys(spendingByCategory).map(category => ({
      name: category,
      spending: parseFloat(spendingByCategory[category].toFixed(2)),
    })).sort((a, b) => b.spending - a.spending); // Sort by spending, descending

  }, [GroupTransactionData]);

  // If there's no data to show, display a message
  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 w-full text-gray-600">
        <p>No spending data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <BarChart
          data={processedData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          barSize={30}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: '#4B5563' }} 
            tickLine={false}
            axisLine={{ stroke: '#D1D5DB' }}
          />
          <YAxis 
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            tick={{ fontSize: 12, fill: '#4B5563' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }} />
          <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
          <Bar 
            dataKey="spending" 
            fill="#3B82F6" // A nice blue color
            name="Total Spending by Category"
            radius={[4, 4, 0, 0]} // Rounded top corners
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GroupBarChart;