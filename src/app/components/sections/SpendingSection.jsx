// src/components/sections/SpendingSection.jsx
import React, { useMemo } from 'react';
import { TrendingUp, Eye, DollarSign, CreditCard, Calendar, BarChart3, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

const SpendingSection = ({ 
  userID,
  transactions, 
  onViewDetails,
  isAdvisorView = false
}) => {
  const CHART_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];

  // Map Plaid categories to readable names
  const mapPlaidCategoryToReadable = (plaidCategory) => {
    const categoryMap = {
      "RENT_AND_UTILITIES": "Rent & Utilities",
      "FOOD_AND_DRINK": "Food & Drink", 
      "TRANSPORTATION": "Transportation",
      "ENTERTAINMENT": "Entertainment",
      "SHOPPING": "Shopping",
      "HEALTHCARE": "Healthcare",
      "TRAVEL": "Travel",
      "PERSONAL_CARE": "Personal Care",
      "EDUCATION": "Education",
      "PROFESSIONAL_SERVICES": "Professional Services",
      "GOVERNMENT_AND_NON_PROFIT": "Government & Non-Profit",
      "BANK_FEES": "Bank Fees",
      "GENERAL_MERCHANDISE": "General Merchandise",
      "HOME_IMPROVEMENT": "Home Improvement",
      "MEDICAL": "Medical",
      "GENERAL_SERVICES": "General Services"
    };
    
    return categoryMap[plaidCategory] || plaidCategory?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Other';
  };

  // Process spending data
  const spendingData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        totalSpent: 0,
        averageTransaction: 0,
        categorySpending: [],
        recentTransactions: [],
        topCategories: [],
        thisMonthSpending: 0,
        lastMonthSpending: 0
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Filter transactions to current month only for main display and exclude transfers
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date || new Date());
      const isCurrentMonth = transactionDate.getMonth() === currentMonth &&
                            transactionDate.getFullYear() === currentYear;

      // Skip transfer transactions to avoid double-counting (same logic as budget visualizations)
      const pfc = t.personal_finance_category;
      const primaryCategory = pfc?.primary;
      const detailedCategory = pfc?.detailed;

      const isTransfer = (
        primaryCategory === 'TRANSFER_OUT' ||
        detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'
      );

      return isCurrentMonth && !isTransfer;
    });

    // Calculate totals using ONLY current month transactions
    const totalSpent = currentMonthTransactions.reduce((total, transaction) =>
      total + Math.abs(transaction.amount || 0), 0
    );
    const averageTransaction = currentMonthTransactions.length > 0
      ? totalSpent / currentMonthTransactions.length
      : 0;

    // Group by category using ONLY current month transactions (transfers already filtered out)
    const categoryMap = {};
    currentMonthTransactions.forEach(transaction => {
      const rawCategory = transaction.personal_finance_category?.primary || 'Other';
      const category = mapPlaidCategoryToReadable(rawCategory);
      const amount = Math.abs(transaction.amount || 0);

      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          amount: 0,
          count: 0,
          transactions: []
        };
      }

      categoryMap[category].amount += amount;
      categoryMap[category].count += 1;
      categoryMap[category].transactions.push(transaction);
    });

    const categorySpending = Object.values(categoryMap)
      .sort((a, b) => b.amount - a.amount);

    // Get top 5 categories for charts
    const topCategories = categorySpending.slice(0, 5);

    // Calculate monthly spending (excluding transfers for both months)
    const thisMonthSpending = transactions
      .filter(t => {
        const transactionDate = new Date(t.date || new Date());
        const isCurrentMonth = transactionDate.getMonth() === currentMonth &&
                              transactionDate.getFullYear() === currentYear;

        // Skip transfer transactions
        const pfc = t.personal_finance_category;
        const primaryCategory = pfc?.primary;
        const detailedCategory = pfc?.detailed;

        const isTransfer = (
          primaryCategory === 'TRANSFER_OUT' ||
          detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'
        );

        return isCurrentMonth && !isTransfer;
      })
      .reduce((total, t) => total + Math.abs(t.amount || 0), 0);

    const lastMonthSpending = transactions
      .filter(t => {
        const transactionDate = new Date(t.date || new Date());
        const isLastMonth = transactionDate.getMonth() === lastMonth &&
                           transactionDate.getFullYear() === lastMonthYear;

        // Skip transfer transactions
        const pfc = t.personal_finance_category;
        const primaryCategory = pfc?.primary;
        const detailedCategory = pfc?.detailed;

        const isTransfer = (
          primaryCategory === 'TRANSFER_OUT' ||
          detailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'
        );

        return isLastMonth && !isTransfer;
      })
      .reduce((total, t) => total + Math.abs(t.amount || 0), 0);

    // Get recent transactions (last 5) from current month only
    const recentTransactions = [...currentMonthTransactions]
      .sort((a, b) => new Date(b.date || new Date()) - new Date(a.date || new Date()))
      .slice(0, 5);

    return {
      totalSpent,
      averageTransaction,
      categorySpending,
      recentTransactions,
      topCategories,
      thisMonthSpending,
      lastMonthSpending
    };
  }, [transactions]);

  // Prepare chart data
  const barChartData = spendingData.topCategories.map(item => ({
    name: item.category.length > 10 ? item.category.substring(0, 10) + '...' : item.category,
    amount: item.amount,
    fullName: item.category
  }));

  const pieChartData = spendingData.topCategories.map((item, index) => ({
    name: item.category,
    value: item.amount,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    // Handle timezone issues by ensuring we parse the date correctly
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC' // Force UTC to avoid timezone conversion issues
    });
  };

  const getSpendingTrend = () => {
    if (spendingData.lastMonthSpending === 0) return { trend: 'neutral', percentage: 0 };
    
    const percentageChange = ((spendingData.thisMonthSpending - spendingData.lastMonthSpending) / spendingData.lastMonthSpending) * 100;
    
    if (Math.abs(percentageChange) < 5) return { trend: 'neutral', percentage: percentageChange };
    if (percentageChange > 0) return { trend: 'up', percentage: percentageChange };
    return { trend: 'down', percentage: Math.abs(percentageChange) };
  };

  const spendingTrend = getSpendingTrend();

  return (
    <div id="spending-section" className="mb-8">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Spending Overview
                {isAdvisorView && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    Advisor View
                  </span>
                )}
              </h2>
              <p className="text-gray-600 mt-1">
                {isAdvisorView ? (
                  transactions && transactions.length > 0
                    ? `Analyze your client's September spending patterns from ${spendingData.categorySpending.reduce((sum, cat) => sum + cat.count, 0)} transactions`
                    : 'Track your client\'s spending patterns and insights'
                ) : (
                  transactions && transactions.length > 0
                    ? `Analyze your September spending patterns from ${spendingData.categorySpending.reduce((sum, cat) => sum + cat.count, 0)} transactions`
                    : 'Track your spending patterns and insights'
                )}
              </p>
            </div>
            <button
              onClick={onViewDetails}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Eye size={16} />
              View Details
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {transactions && transactions.length > 0 ? (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-purple-600" size={20} />
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Total Spending</p>
                      <p className="text-xl font-bold text-purple-900">
                        {formatCurrency(spendingData.totalSpent)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="text-blue-600" size={20} />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Avg Transaction</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(spendingData.averageTransaction)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="text-green-600" size={20} />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Categories</p>
                      <p className="text-xl font-bold text-green-900">
                        {spendingData.categorySpending.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${
                  spendingTrend.trend === 'up' ? 'bg-red-50' : 
                  spendingTrend.trend === 'down' ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <Calendar className={`${
                      spendingTrend.trend === 'up' ? 'text-red-600' : 
                      spendingTrend.trend === 'down' ? 'text-green-600' : 'text-gray-600'
                    }`} size={20} />
                    <div>
                      <p className={`text-sm font-medium ${
                        spendingTrend.trend === 'up' ? 'text-red-600' : 
                        spendingTrend.trend === 'down' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        Monthly Trend
                      </p>
                      <p className={`text-xl font-bold ${
                        spendingTrend.trend === 'up' ? 'text-red-900' : 
                        spendingTrend.trend === 'down' ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {spendingTrend.trend === 'neutral' ? 'Stable' : 
                         `${spendingTrend.trend === 'up' ? '+' : '-'}${spendingTrend.percentage.toFixed(0)}%`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Monthly Comparison</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">This Month</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(spendingData.thisMonthSpending)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Last Month</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(spendingData.lastMonthSpending)}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Difference</span>
                        <span className={`font-semibold ${
                          spendingData.thisMonthSpending > spendingData.lastMonthSpending 
                            ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {spendingData.thisMonthSpending > spendingData.lastMonthSpending ? '+' : '-'}
                          {formatCurrency(Math.abs(spendingData.thisMonthSpending - spendingData.lastMonthSpending))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Recent Transactions</h3>
                  <div className="space-y-2">
                    {spendingData.recentTransactions.map((transaction, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            {transaction.merchant_name || transaction.name || 'Transaction'}
                          </p>
                          <p className="text-gray-500">{formatDate(transaction.date)}</p>
                        </div>
                        <span className="font-semibold text-gray-900 ml-2">
                          {formatCurrency(Math.abs(transaction.amount || 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">Top Categories</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          formatter={(value, name, props) => [
                            formatCurrency(value), 
                            props.payload.fullName
                          ]}
                        />
                        <Bar dataKey="amount" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">Spending Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {spendingData.categorySpending.slice(0, 6).map((category, index) => (
                    <div key={category.category} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        ></div>
                        <h4 className="font-medium text-gray-900 truncate">{category.category}</h4>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{category.count} transactions</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(category.amount)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="h-1 rounded-full"
                            style={{ 
                              backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                              width: `${(category.amount / spendingData.totalSpent) * 100}%`
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {((category.amount / spendingData.totalSpent) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* No Transactions State */
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-16 w-16 text-gray-400 mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">No Spending Data</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your bank account or add transactions to see your spending patterns and insights.
              </p>
              <div className="space-y-3">
                <div className="flex justify-center gap-4 text-sm text-gray-500">
                  <span>• Category Analysis</span>
                  <span>• Spending Trends</span>
                  <span>• Budget Tracking</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpendingSection;