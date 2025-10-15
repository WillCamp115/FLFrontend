import React, { useState, useEffect } from 'react';
import { Users, CreditCard, Building2, Settings, Plus, AlertCircle, Loader2, Eye, EyeOff, DollarSign, TrendingDown, PieChart as PieChartIcon, Edit } from 'lucide-react';
import AccountSelectionModal from '../modals/AccountSelectionModal';
import EnhancedGroupInviteModal from '../modals/EnhancedGroupInviteModal';
import PlaidLink from '../plaid/PlaidLink';
import apiClient from '../../../lib/apiClient';

// Import budget visualizations
import BudgetDonutChart from '../visuals/BudgetDonutChart';
import BudgetDumbbellChart from '../visuals/BudgetDumbellChart';
import BudgetBulletChart from '../visuals/BudgetBulletChart';
import BudgetRadarChart from '../visuals/BudgetRadarVis';

const GroupDashboard = ({ groupId, groupName, className = '' }) => {
  const [sharedAccounts, setSharedAccounts] = useState([]);
  const [mySharedAccounts, setMySharedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [showPlaidLink, setShowPlaidLink] = useState(false);

  // Budget-related state
  const [groupBudgets, setGroupBudgets] = useState([]);
  const [groupTransactions, setGroupTransactions] = useState([]);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [selectedVisualization, setSelectedVisualization] = useState(1);
  const [showVisualizationDropdown, setShowVisualizationDropdown] = useState(false);

  // Available visualizations for budgets
  const visualizations = [
    { id: 1, name: 'Donut Chart', component: BudgetDonutChart },
    { id: 2, name: 'Dumbbell Chart', component: BudgetDumbbellChart },
    { id: 3, name: 'Bullet Chart', component: BudgetBulletChart },
    { id: 4, name: 'Radar Chart', component: BudgetRadarChart },
  ];

  const currentVisualization = visualizations.find(v => v.id === selectedVisualization) || visualizations[0];
  const VisualizationComponent = currentVisualization.component;

  useEffect(() => {
    if (groupId) {
      loadGroupSharedAccounts();
      loadGroupBudgets();
      loadGroupTransactions();
    }
  }, [groupId]);

  const loadGroupSharedAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiClient.getGroupSharedAccounts(groupId);
      console.log('DEBUG: Received shared accounts data:', result);
      setSharedAccounts(result || []);
      
      // Filter to get current user's shared accounts
      // This would need user context to properly filter
      // For now, we'll show all accounts
    } catch (err) {
      console.error('Error loading group shared accounts:', err);
      setError('Failed to load shared accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMyAccounts = async (selectedAccounts) => {
    try {
      setError('');
      await apiClient.updateMySharedAccounts(groupId, selectedAccounts);
      setMySharedAccounts(selectedAccounts);
      await loadGroupSharedAccounts(); // Refresh the full list
    } catch (err) {
      console.error('Error updating shared accounts:', err);
      setError('Failed to update shared accounts. Please try again.');
    }
  };

  // Load group budgets
  const loadGroupBudgets = async () => {
    try {
      setLoadingBudget(true);
      // For now, use personal budgets since group budget endpoints may not be implemented
      const budgets = await apiClient.getBudgets();
      setGroupBudgets(budgets || []);
    } catch (err) {
      console.error('Error loading group budgets:', err);
      setGroupBudgets([]);
    } finally {
      setLoadingBudget(false);
    }
  };

  // Load group transactions - use mock transactions
  const loadGroupTransactions = async () => {
    try {
      const data = await apiClient.getTransactions();
      // Extract the transactions from the response
      if (data && data.added && Array.isArray(data.added)) {
        setGroupTransactions(data.added);
      } else {
        setGroupTransactions([]);
      }
    } catch (err) {
      console.error('Error loading group transactions:', err);
      setGroupTransactions([]);
    }
  };

  // Handle PlaidLink success
  const handlePlaidSuccess = async () => {
    setShowPlaidLink(false);
    // Refresh accounts after linking
    await loadGroupSharedAccounts();
  };

  const formatAccountBalance = (balance) => {
    if (balance === null || balance === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
  };

  const getAccountTypeColor = (accountType) => {
    const type = accountType?.toLowerCase() || '';
    if (type.includes('checking')) return 'bg-blue-100 text-blue-800';
    if (type.includes('savings')) return 'bg-green-100 text-green-800';
    if (type.includes('credit')) return 'bg-purple-100 text-purple-800';
    if (type.includes('investment')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  const groupAccountsByUser = () => {
    const grouped = {};
    sharedAccounts.forEach(account => {
      const userId = account.added_by;
      if (!grouped[userId]) {
        grouped[userId] = {
          user_name: `User ${userId}`, // TODO: Get actual user name from backend
          accounts: []
        };
      }
      // Transform the account to match expected format
      const transformedAccount = {
        ...account.account_details,
        id: account.id,
        added_by: account.added_by,
        // Add missing fields that AccountCard expects
        balance: account.account_details.current_balance
      };
      grouped[userId].accounts.push(transformedAccount);
    });
    return grouped;
  };

  const AccountCard = ({ account }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{account.account_name}</h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAccountTypeColor(account.account_type)}`}>
                {account.account_type}
              </span>
              {account.institution_name && (
                <span className="text-xs text-gray-500">{account.institution_name}</span>
              )}
            </div>
            {account.mask && (
              <div className="text-xs text-gray-500 mt-1">
                Account ending in •••• {account.mask}
              </div>
            )}
          </div>
        </div>
        
        {account.current_balance !== null && account.current_balance !== undefined && showBalances && (
          <div className="text-right">
            <div className="font-medium text-gray-900">
              {formatAccountBalance(account.current_balance)}
            </div>
          </div>
        )}
      </div>
      
      {account.mask && (
        <div className="text-sm text-gray-500">
          Account ending in {account.mask}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading group dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{groupName}</h2>
                <p className="text-sm text-gray-600">Group Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBalances(!showBalances)}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                title={showBalances ? 'Hide balances' : 'Show balances'}
              >
                {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              
              <button
                onClick={() => setShowPlaidLink(true)}
                className="flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                title="Connect a new bank account via Plaid"
              >
                <Plus className="h-4 w-4 mr-1" />
                🏦 Connect Bank
              </button>

              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Settings className="h-4 w-4 mr-1" />
                Share Accounts
              </button>

              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Invite Member
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-900">{sharedAccounts.length}</div>
                  <div className="text-sm text-blue-600">Total Shared Accounts</div>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-900">
                    {Object.keys(groupAccountsByUser()).length}
                  </div>
                  <div className="text-sm text-green-600">Contributing Members</div>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-900">
                    {new Set(sharedAccounts.map(acc => acc.account_details?.institution_name).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-purple-600">Institutions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Shared Accounts by User */}
          {Object.keys(groupAccountsByUser()).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Shared Accounts</h3>
              <p className="text-gray-600 mb-6">
                Group members haven't shared any accounts yet. Start by sharing some of your accounts or inviting others to join.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Share My Accounts
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Invite Members
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupAccountsByUser()).map(([userId, userData]) => (
                <div key={userId} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900">{userData.user_name}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {userData.accounts.length} account{userData.accounts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userData.accounts.map((account, index) => (
                      <AccountCard key={index} account={account} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Group Budgets Section */}
          {groupBudgets.length > 0 && groupTransactions.length > 0 && (
            <div className="mt-8 border-t pt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-blue-600" />
                    Group Budget Visualization
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Shared budget overview with group transactions</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Visualization Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowVisualizationDropdown(!showVisualizationDropdown)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <span className="font-medium">{currentVisualization.name}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${showVisualizationDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showVisualizationDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        {visualizations.map((vis) => (
                          <button
                            key={vis.id}
                            onClick={() => {
                              setSelectedVisualization(vis.id);
                              setShowVisualizationDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                              vis.id === selectedVisualization ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {vis.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Budget Visualization */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
                <VisualizationComponent
                  budgetData={{ data: groupBudgets }}
                  transactionData={groupTransactions}
                  onCategoryClick={() => {}}
                />
              </div>
            </div>
          )}

          {/* Show message if no budget or transactions */}
          {(groupBudgets.length === 0 || groupTransactions.length === 0) && (
            <div className="mt-8 border-t pt-8">
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Data Yet</h3>
                <p className="text-gray-600 mb-4">
                  {groupBudgets.length === 0
                    ? "Create a budget in your personal dashboard to see budget visualizations here."
                    : "No transactions available yet. Connect bank accounts to see spending data."}
                </p>
                {groupBudgets.length === 0 && (
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    Go to Dashboard
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AccountSelectionModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onAccountsSelected={handleUpdateMyAccounts}
        preSelectedAccounts={mySharedAccounts}
        title="Manage Shared Accounts"
      />

      <EnhancedGroupInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* PlaidLink Modal */}
      {showPlaidLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Connect Your Bank Account</h3>
            <p className="text-gray-600 mb-6">
              Link your bank account to share transactions with your group members.
            </p>
            <PlaidLink onSuccess={handlePlaidSuccess} />
            <button
              onClick={() => setShowPlaidLink(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupDashboard;