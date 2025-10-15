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

// Define consistent colors for different accounts
const ACCOUNT_COLORS = {
  'BxBXxLj1m4HMXBm9WZZmCWVbPjX16EHwv99vp': '#3B82F6', // Blue
  'BxBXxLj1m4HMXBm9WZZmCWVbPjX16EHwv99vp2': '#10B981', // Green
  'Account1': '#F59E0B', // Amber
  'Account2': '#EF4444', // Red
  'Account3': '#8B5CF6', // Violet
};

// Custom Tooltip for better styling
const CustomTooltip = ({ active = false, payload = [], label = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-white border border-gray-300 rounded-lg shadow-sm">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((pld, index) => (
          <div key={index} style={{ color: pld.fill }}>
            {`${pld.name}: $${pld.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StackedBarChart = ({ GroupTransactionData }) => {

  const { chartData, accountNames } = useMemo(() => {
    if (!GroupTransactionData || !GroupTransactionData.combined_transactions) {
      return { chartData: [], accountNames: [] };
    }

    // Get unique account IDs from transactions with proper typing
    const allAccountIds = GroupTransactionData.combined_transactions
      .map(t => t.account_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    
    const accountIds: string[] = Array.from(new Set(allAccountIds));

    // Create account display names
    const accountDisplayNames = accountIds.map((id: string) => {
      const shortId = id.slice(-12);
      return `Account ...${shortId}`;
    });

    // Process transactions by category and account
    const spendingByCategory = GroupTransactionData.combined_transactions
      .filter(t => t.amount > 0) // Only consider expenses
      .reduce((acc, transaction) => {
        // Get category from the new data structure
        const category = transaction.personal_finance_category?.primary?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
                        || transaction.category 
                        || 'Other';
        
        const accountId = transaction.account_id;
        
        // Guard against transactions with missing data
        if (!category || !accountId || typeof accountId !== 'string') {
          return acc;
        }
        
        // Create account display name
        const accountDisplayName = `Account ...${accountId.slice(-12)}`;
        
        // Initialize category if it doesn't exist
        if (!acc[category]) {
          acc[category] = { category };
          accountDisplayNames.forEach(name => {
            acc[category][name] = 0;
          });
        }
        
        // Add the spending amount
        if (typeof acc[category][accountDisplayName] === 'number') {
          acc[category][accountDisplayName] += Math.abs(transaction.amount);
        }
        
        return acc;
      }, {} as { [key: string]: { category: string; [account: string]: string | number } });

    // Convert to final data format
    const finalData = Object.values(spendingByCategory).map(categoryData => {
        const typedCategoryData = categoryData as { category: string; [key: string]: any };
        const updatedCategoryData = { ...typedCategoryData };
        accountDisplayNames.forEach(name => {
            const value = updatedCategoryData[name] as number || 0;
            updatedCategoryData[name] = parseFloat(value.toFixed(2));
        });
        return updatedCategoryData;
    });

    return { chartData: finalData, accountNames: accountDisplayNames };
  }, [GroupTransactionData]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 w-full text-gray-600">
        <p>No spending data available to display.</p>
      </div>
    );
  }

  // Generate colors for accounts dynamically
  const getAccountColor = (accountName, index) => {
    // Try to find matching account ID in our predefined colors
    const accountId = Object.keys(ACCOUNT_COLORS).find(id => 
      accountName.includes(id.slice(-12))
    );
    
    if (accountId && ACCOUNT_COLORS[accountId]) {
      return ACCOUNT_COLORS[accountId];
    }
    
    // Fallback to a color palette
    const fallbackColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return fallbackColors[index % fallbackColors.length];
  };

  return (
    <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
            <BarChart
                data={chartData}
                margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}/>
                <Legend wrapperStyle={{ fontSize: '14px' }}/>
                {accountNames.map((name, index) => (
                    <Bar key={name} dataKey={name} stackId="a" fill={getAccountColor(name, index)} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default StackedBarChart;