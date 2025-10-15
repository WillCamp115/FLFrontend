import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define colors for different accounts
const ACCOUNT_COLORS = {
  'BxBXxLj1m4HMXBm9WZZmCWVbPjX16EHwv99vp': '#3B82F6', // Blue
  'BxBXxLj1m4HMXBm9WZZmCWVbPjX16EHwv99vp2': '#10B981', // Green
  'Account1': '#F59E0B', // Amber
  'Account2': '#EF4444', // Red
  'Account3': '#8B5CF6', // Violet
};

// Custom Tooltip for better styling and formatting
const CustomTooltip = ({ active = false, payload = [] }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm">
        <p className="font-semibold text-gray-800">{data.name}</p>
        <p style={{ color: data.payload.fill }}>
          {`Total Spent: $${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
      </div>
    );
  }
  return null;
};

const AccountSpendingPieChart = ({ GroupTransactionData }) => {

  // useMemo will re-calculate the data only when GroupTransactionData changes
  const processedData = useMemo(() => {
    if (!GroupTransactionData || !GroupTransactionData.combined_transactions) {
      return [];
    }

    // Get unique account IDs - using explicit typing approach
    const accountIdsSet = new Set<string>();
    
    GroupTransactionData.combined_transactions.forEach(transaction => {
      if (transaction.account_id && typeof transaction.account_id === 'string') {
        accountIdsSet.add(transaction.account_id);
      }
    });
    
    const accountIds = Array.from(accountIdsSet);

    // Calculate spending by account
    const spendingByAccount = GroupTransactionData.combined_transactions
      .filter(transaction => transaction.amount > 0) // Filter for expenses only
      .reduce((acc, transaction) => {
        const accountId = transaction.account_id;
        if (!accountId || typeof accountId !== 'string') {
          return acc;
        }
        
        if (!acc[accountId]) {
          acc[accountId] = 0;
        }
        acc[accountId] += Math.abs(transaction.amount); // Sum the absolute value of the amounts
        return acc;
      }, {});
      
    // Convert the aggregated object into an array suitable for recharts
    return accountIds.map((accountId: string) => {
      const shortId = accountId.slice(-12);
      return {
        name: `Account ...${shortId}`,
        value: parseFloat((spendingByAccount[accountId] || 0).toFixed(2)),
        accountId: accountId
      };
    }).filter(item => item.value > 0); // Only include accounts with spending

  }, [GroupTransactionData]);

  // Generate colors for accounts dynamically
  const getAccountColor = (accountId, index) => {
    // Try to find matching account ID in our predefined colors
    if (ACCOUNT_COLORS[accountId]) {
      return ACCOUNT_COLORS[accountId];
    }
    
    // Fallback to a color palette
    const fallbackColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return fallbackColors[index % fallbackColors.length];
  };

  // If there's no data to show, display a message
  if (!processedData.some(d => d.value > 0)) {
    return (
      <div className="flex items-center justify-center h-64 w-full text-gray-600">
        <p>No spending data available for accounts.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getAccountColor(entry.accountId, index)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AccountSpendingPieChart;