// src/components/modals/ViewSpendingModal.jsx
import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, TrendingUp, Filter } from 'lucide-react';
import { filterTransactionsByPeriod, TIME_PERIODS } from '../../utils/timeUtils';

const ViewSpendingModal = ({ isOpen, onClose, transactions }) => {
  const [timeFilter, setTimeFilter] = useState('current_month'); // Default to current month (same as budget viz)
  const [sortBy, setSortBy] = useState('amount'); // 'amount', 'frequency', 'category'

  // Colors for charts
  const CHART_COLORS = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
  ];

  // Map Plaid categories to readable names (same as SpendingSection)
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

  // Filter transactions based on time period using centralized utility
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return filterTransactionsByPeriod(transactions, timeFilter);
  }, [transactions, timeFilter]);

  // Process spending by category
  const spendingByCategory = useMemo(() => {
    const categoryMap = {};
    
    filteredTransactions.forEach(transaction => {
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
    
    const categoryArray = Object.values(categoryMap);
    
    // Sort based on selected criteria
    return categoryArray.sort((a, b) => {
      switch (sortBy) {
        case 'frequency':
          return b.count - a.count;
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return b.amount - a.amount;
      }
    });
  }, [filteredTransactions, sortBy]);

  // Calculate totals
  const totalSpent = filteredTransactions.reduce((total, transaction) => {
    return total + Math.abs(transaction.amount || 0);
  }, 0);

  const averageTransaction = totalSpent / (filteredTransactions.length || 1);

  // Prepare data for charts
  const barChartData = spendingByCategory.slice(0, 8).map(item => ({
    name: item.category.length > 12 ? item.category.substring(0, 12) + '...' : item.category,
    amount: item.amount,
    fullName: item.category
  }));

  const pieChartData = spendingByCategory.slice(0, 6).map((item, index) => ({
    name: item.category,
    value: item.amount,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  // Add "Other" category for remaining items in pie chart
  if (spendingByCategory.length > 6) {
    const otherAmount = spendingByCategory.slice(6).reduce((sum, item) => sum + item.amount, 0);
    pieChartData.push({
      name: 'Other',
      value: otherAmount,
      color: '#9CA3AF'
    });
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTimeFilterLabel = () => {
    const period = TIME_PERIODS.find(p => p.id === timeFilter);
    return period ? period.label : 'Current Month';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Spending Analysis" size="xl">
      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-600" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TIME_PERIODS.map(period => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="amount">Sort by Amount</option>
              <option value="frequency">Sort by Frequency</option>
              <option value="category">Sort by Category</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <DollarSign className="text-blue-600" size={24} />
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Spent</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(totalSpent)}</p>
                <p className="text-xs text-blue-700">{getTimeFilterLabel()}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-green-600 font-medium">Avg Transaction</p>
                <p className="text-xl font-bold text-green-900">{formatCurrency(averageTransaction)}</p>
                <p className="text-xs text-green-700">{filteredTransactions.length} transactions</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Filter className="text-purple-600" size={24} />
              <div>
                <p className="text-sm text-purple-600 font-medium">Categories</p>
                <p className="text-xl font-bold text-purple-900">{spendingByCategory.length}</p>
                <p className="text-xs text-purple-700">Active categories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Bar Chart */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
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
                  <Bar dataKey="amount" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
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
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Category Breakdown */}
        <div className="bg-white rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 p-4 border-b">Category Breakdown</h3>
          <div className="max-h-64 overflow-y-auto">
            {spendingByCategory.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900">{category.category}</p>
                    <p className="text-sm text-gray-600">{category.count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(category.amount)}</p>
                  <p className="text-sm text-gray-600">
                    {((category.amount / totalSpent) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-6 border-t mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ViewSpendingModal;