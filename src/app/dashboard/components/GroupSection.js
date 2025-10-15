// dashboard/components/GroupSection.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Mail,
  TrendingDown,
  DollarSign,
  ChevronDown,
  Calendar,
  AlertCircle,
  UserPlus,
  CreditCard,
  PieChart,
  BarChart3,
  Edit,
  Eye,
  TrendingUp,
  Settings
} from 'lucide-react';
import GroupPieChart from '../../components/visuals/GroupPieChart';
import GroupStackedChart from '../../components/visuals/GroupStackedChart';

// Import budget visualization components
import BudgetDonutChart from '../../components/visuals/BudgetDonutChart';
import BudgetDonutChart2 from '../../components/visuals/BudgetDonutChart2';
import BudgetBulletChart from '../../components/visuals/BudgetBulletChart';
import BudgetRadarChart from '../../components/visuals/BudgetRadarVis';
import BudgetDumbbellChart from '../../components/visuals/BudgetDumbellChart';

// Import modal components
import EditBudgetModal from '../../components/modals/EditBudgetModal';
import ViewSpendingModal from '../../components/modals/ViewSpendingModal';
import GroupManagementModal from '../../components/modals/GroupManagementModal';
import PlaidLink from '../../components/plaid/PlaidLink';

import { apiClient } from '../../../lib/apiClient';
import { filterTransactionsByPeriod } from '../../utils/timeUtils';

const GroupSection = ({ userId, onMessageRedirect }) => {
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedVisualization, setSelectedVisualization] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);

  // New state for multiple groups support
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  // New state for dynamic budget functionality
  const [groupBudgets, setGroupBudgets] = useState([]);
  const [groupTransactions, setGroupTransactions] = useState([]);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Modal states
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);
  const [isViewSpendingModalOpen, setIsViewSpendingModalOpen] = useState(false);
  const [isGroupManagementModalOpen, setIsGroupManagementModalOpen] = useState(false);
  const [showPlaidLink, setShowPlaidLink] = useState(false);

  // Computed states
  const userHasGroupBudget = Array.isArray(groupBudgets) && groupBudgets.length > 0 && groupBudgets.some(budget => budget && budget.budget);
  const currentGroupBudget = userHasGroupBudget ? groupBudgets[0]?.budget || groupBudgets[0] : null;


  // Available visualizations - combining group-specific and budget visualizations
  const visualizations = [
    { id: 1, name: 'Group Stacked Chart', component: GroupStackedChart, type: 'group' },
    { id: 2, name: 'Group Pie Chart', component: GroupPieChart, type: 'group' },
    { id: 3, name: 'Budget Donut Chart', component: BudgetDonutChart, type: 'budget' },
    { id: 4, name: 'Budget Donut Chart 2', component: BudgetDonutChart2, type: 'budget' },
    { id: 5, name: 'Budget Bullet Chart', component: BudgetBulletChart, type: 'budget' },
    { id: 6, name: 'Budget Radar Chart', component: BudgetRadarChart, type: 'budget' },
    { id: 7, name: 'Budget Dumbbell Chart', component: BudgetDumbbellChart, type: 'budget' }
  ];
  const currentVisualization = visualizations.find(v => v.id === selectedVisualization) || visualizations[0];
  const VisualizationComponent = currentVisualization.component;

  // Fetch group budgets from group budget API
  const fetchGroupBudgets = async (groupId) => {
    try {
      setLoadingBudget(true);
      const data = await apiClient.getGroupBudgets(groupId);
      const validBudgets = Array.isArray(data) ? data.filter(budget => budget && budget.budget) : [];
      setGroupBudgets(validBudgets);
      console.log('Group budgets loaded:', validBudgets);
    } catch (err) {
      console.error('Error fetching group budgets:', err);
      setGroupBudgets([]);
    } finally {
      setLoadingBudget(false);
    }
  };

  // Fetch group transactions (using Plaid data, filtered to current month)
  const fetchGroupTransactions = async (groupId) => {
    try {
      setLoadingTransactions(true);
      // Get transactions via Plaid API
      const data = await apiClient.getTransactions();

      // Extract and filter transactions to current month only
      if (data.added && Array.isArray(data.added)) {
        const currentMonthTransactions = filterTransactionsByPeriod(data.added, 'current_month');
        console.log(`Group transactions loaded: ${data.added.length} total, ${currentMonthTransactions.length} in current month`);
        setGroupTransactions(currentMonthTransactions);
      } else {
        console.log('No transactions found in response');
        setGroupTransactions([]);
      }
    } catch (err) {
      console.error('Error fetching group transactions:', err);
      setGroupTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch user's groups and initialize
  const checkGroupMembership = useCallback(async () => {
    try {
      setLoading(true);

      // Get user's groups
      console.log('=== DEBUGGING GROUP FETCH ===');
      console.log('Current userId:', userId);

      // Check authentication context
      const { user } = await import('../../../contexts/AuthContext');
      console.log('Auth context user:', user);

      let groups;
      try {
        groups = await apiClient.getUserGroups();
        console.log('Raw API response:', groups);
        console.log('Groups array length:', groups ? groups.length : 0);

        if (groups && groups.length > 0) {
          console.log('=== GROUP MEMBERSHIP ANALYSIS ===');
          groups.forEach((g, index) => {
            console.log(`Group ${index + 1}:`, {
              id: g.group_id,
              name: g.group_name,
              owner_id: g.owner_id,
              created: g.date_created,
              userIsOwner: g.owner_id?.toString() === userId?.toString(),
              ownerIdType: typeof g.owner_id,
              userIdType: typeof userId
            });
          });

          const ownedGroups = groups.filter(g => g.owner_id?.toString() === userId?.toString());
          const memberGroups = groups.filter(g => g.owner_id?.toString() !== userId?.toString());

          console.log(`User owns ${ownedGroups.length} groups:`, ownedGroups.map(g => g.group_name));
          console.log(`User is member of ${memberGroups.length} groups:`, memberGroups.map(g => g.group_name));

          if (groups.length > 5) {
            console.warn('⚠️  User is in many groups - this might indicate test data issue');
          }
        }
      } catch (apiError) {
        console.error('API call failed:', apiError);
        console.error('This might explain why wrong data is shown');
        throw apiError;
      }

      if (!groups || groups.length === 0) {
        // User is not in any groups
        console.log('User is not in any groups');
        setAllGroups([]);
        setSelectedGroupId(null);
        setGroupData(null);
        return;
      }

      // Store all groups and select the first one by default
      setAllGroups(groups);
      const defaultGroupId = groups[0].group_id;
      setSelectedGroupId(defaultGroupId);

      // Load data for the default group
      await loadGroupData(defaultGroupId, groups);

      // Load budget and transaction data
      await Promise.all([
        fetchGroupBudgets(defaultGroupId),
        fetchGroupTransactions(defaultGroupId)
      ]);

    } catch (err) {
      setError('Failed to load group data');
      console.error('Error checking group membership:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load data for a specific group
  const loadGroupData = async (groupId, groupsList = allGroups) => {
    try {
      const selectedGroup = groupsList.find(g => g.group_id === groupId);
      if (!selectedGroup) {
        console.error('Selected group not found:', groupId);
        return;
      }

      console.log('Loading data for group:', selectedGroup);

      // Get shared accounts for this group
      const sharedAccountsResponse = await apiClient.getGroupSharedAccounts(groupId);
      console.log('Shared accounts response:', sharedAccountsResponse);
      console.log('Number of shared accounts received:', sharedAccountsResponse?.length || 0);

      // Get group members (now returns object with members array)
      const groupMembersResponse = await apiClient.getGroupMembers(groupId);
      console.log('Group members response:', groupMembersResponse);
      console.log('Number of group members:', groupMembersResponse?.members?.length || 0);

      // Transform shared accounts data to match expected format  
      const transformedAccounts = (sharedAccountsResponse || []).map(account => {
        console.log('Processing account:', account);
        console.log('Account details:', account.account_details);
        return {
          id: account.id,
          name: `${account.account_details.account_name}${account.account_details.mask ? ` (...${account.account_details.mask})` : ''}`,
          balance: account.account_details.current_balance || 0,
          type: account.account_details.account_type,
          institution: account.account_details.institution_name,
          shared_by: `User ${account.added_by}` // TODO: Get actual user name
        };
      });

      console.log('Transformed accounts:', transformedAccounts);

      // Create member objects from the fetched member data
      const membersArray = (groupMembersResponse?.members || []).map(member => ({
        id: member.user_id,
        firebase_uid: member.firebase_uid,
        name: member.is_current_user ? 'You' : `${member.firstname} ${member.lastname}`,
        email: member.is_current_user ? 'you@example.com' : `${member.firstname.toLowerCase()}@example.com`,
        role: member.is_owner ? 'owner' : 'member',
        is_owner: member.is_owner,
        is_current_user: member.is_current_user
      }));

      // Create group data structure with real account and member data
      const realGroupData = {
        group_id: selectedGroup.group_id,
        group_name: selectedGroup.group_name,
        members: membersArray,
        shared_accounts: transformedAccounts,
      };

      setGroupData(realGroupData);

    } catch (err) {
      console.error('Error loading group data:', err);
      setError('Failed to load group data');
    }
  };

  // Handle group selection change
  const handleGroupChange = async (groupId) => {
    if (groupId === selectedGroupId) return;

    setSelectedGroupId(groupId);
    setShowGroupSelector(false);
    setLoading(true);

    try {
      await loadGroupData(groupId);
      // Load budget and transaction data for the new group
      await Promise.all([
        fetchGroupBudgets(groupId),
        fetchGroupTransactions(groupId)
      ]);
    } catch (err) {
      console.error('Error switching groups:', err);
      setError('Failed to switch groups');
    } finally {
      setLoading(false);
    }
  };

  // Handle budget-related actions
  const handleBudgetUpdated = () => {
    if (selectedGroupId) {
      fetchGroupBudgets(selectedGroupId);
      fetchGroupTransactions(selectedGroupId);
    }
  };

  const handleCreateGroupBudget = () => {
    setIsEditBudgetModalOpen(true);
  };

  const handleEditGroupBudget = () => {
    setIsEditBudgetModalOpen(true);
  };

  const handleViewGroupSpending = () => {
    setIsViewSpendingModalOpen(true);
  };

  // Handle group management actions (leave/delete)
  const handleGroupAction = async (action, group) => {
    console.log(`Group ${action}:`, group);
    
    // Refresh the groups list after action
    await checkGroupMembership();
    
    // If user left or deleted the current group, reset to no group view
    if (group.group_id === selectedGroupId) {
      setSelectedGroupId(null);
      setGroupData(null);
    }
  };

  // Calculate spending vs budget using real data
  const calculateGroupSpendingVsBudget = () => {
    if (!currentGroupBudget || !groupTransactions) return null;

    const totalBudgeted = [
      ...(currentGroupBudget.fixed_costs || []),
      ...(currentGroupBudget.variable_expenses || [])
    ].reduce((sum, item) => sum + (item.limit || 0), 0);

    const totalSpent = groupTransactions.reduce((sum, transaction) =>
      sum + Math.abs(transaction.amount || 0), 0
    );

    const percentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    const remaining = totalBudgeted - totalSpent;

    return {
      totalBudgeted,
      totalSpent,
      percentage,
      remaining,
      isOverBudget: totalSpent > totalBudgeted
    };
  };

  // Handle visualization selection
  const handleVisualizationChange = async (visId) => {
    try {
      setSelectedVisualization(visId);
      setShowDropdown(false);

      // Save preference to backend
      await apiClient.setPreferredVisualization(visId);
      console.log('Visualization preference saved successfully');
    } catch (error) {
      console.error('Failed to save visualization preference:', error.message);
      // Could show a toast notification here
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.visualization-dropdown')) {
        setShowDropdown(false);
      }
      if (showGroupSelector && !event.target.closest('.group-selector')) {
        setShowGroupSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown, showGroupSelector]);

  useEffect(() => {
    if (userId) {
      checkGroupMembership();
    }
  }, [userId, checkGroupMembership]);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      // TODO: Implement actual invite API call
      // await apiClient.inviteToGroup({ email: inviteEmail });

      // For now, show success message and redirect to messages
      alert(`Invitation sent to ${inviteEmail}! They will receive a notification in their messages.`);
      setInviteEmail('');
      setShowInviteForm(false);

      // Optional: redirect to messages tab for further communication
      if (onMessageRedirect) {
        onMessageRedirect();
      }
    } catch (err) {
      console.error('Error sending invite:', err);
      alert('Failed to send invitation. Please try again.');
    }
  };

  // Calculate dynamic spending data
  const groupSpendingData = calculateGroupSpendingVsBudget();

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading group data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is not in a group, show invite flow
  if (!groupData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Group Finances</h1>
          <p className="text-gray-600">Manage shared budgets and spending with your spouse or family.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8 text-center max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create Your Financial Group</h2>
            <p className="text-gray-600">
              Invite your spouse or family member to share budgets, track joint spending, and manage your finances together.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center text-left">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CreditCard className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-gray-700">Track shared account spending</span>
            </div>
            <div className="flex items-center text-left">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <PieChart className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-gray-700">Create collaborative budgets</span>
            </div>
            <div className="flex items-center text-left">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <BarChart3 className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-gray-700">View combined financial insights</span>
            </div>
          </div>

          {!showInviteForm ? (
            <button
              onClick={() => setShowInviteForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Invite Family Member
            </button>
          ) : (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="inviteEmail"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="spouse@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-yellow-800 font-medium">Complete messaging setup required</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Group invitations are sent through the messaging system. Make sure messaging is properly configured.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is in a group, show group dashboard
  const { group_name, members, shared_accounts, recent_transactions } = groupData || {};

  // Generate color mapping for accounts - simplified to use only transaction data
  const generateAccountColors = () => {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Violet
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#6366F1', // Indigo
    ];

    const accountIds = new Set();
    
    // Only collect account IDs from transaction data
    if (groupTransactions && Array.isArray(groupTransactions)) {
      groupTransactions.forEach(transaction => {
        if (transaction.account_id) {
          accountIds.add(transaction.account_id);
        }
      });
    }

    const accountColorMap = {};
    const accountIdArray = Array.from(accountIds);
    
    accountIdArray.forEach((accountId, index) => {
      accountColorMap[accountId] = colors[index % colors.length];
    });

    return accountColorMap;
  };

  const accountColors = generateAccountColors();

  // Get account name by ID - simplified to use only account ID
  const getAccountNameById = (accountId) => {
    if (accountId) {
      // Use more characters to better distinguish between similar account IDs
      const shortId = accountId.slice(-12); // Use last 12 characters
      return `Account ...${shortId}`;
    }
    return 'Unknown Account';
  };

  // Use dynamic budget data calculated from real group budgets and transactions
  const monthly_spending = groupSpendingData?.totalSpent || 0;
  const monthly_budget = groupSpendingData?.totalBudgeted || 0;
  const budgetUsagePercent = groupSpendingData?.percentage?.toFixed(1) || '0.0';
  const remainingBudget = groupSpendingData?.remaining || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{group_name}</h1>
              <div className="flex items-center gap-2">
                {allGroups.length > 1 && (
                  <div className="relative group-selector">
                    <button
                      onClick={() => setShowGroupSelector(!showGroupSelector)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                      disabled={loading}
                    >
                      <span>{loading ? 'Loading...' : 'Switch Group'}</span>
                      <ChevronDown size={16} className={`transition-transform ${showGroupSelector ? 'rotate-180' : ''}`} />
                    </button>

                    {showGroupSelector && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-20">
                        <div className="p-2">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">
                            Your Groups ({allGroups.length})
                          </div>
                          {allGroups.map((group) => (
                            <button
                              key={group.group_id}
                              onClick={() => handleGroupChange(group.group_id)}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${group.group_id === selectedGroupId
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              <div className="font-medium">{group.group_name}</div>
                              <div className="text-xs text-gray-500">
                                Created {new Date(group.date_created).toLocaleDateString()}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Connect Bank Button */}
                <button
                  onClick={() => setShowPlaidLink(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  title="Connect a new bank account"
                >
                  <Plus size={16} />
                  <span>🏦 Connect Bank</span>
                </button>

                {/* Group Management Button */}
                <button
                  onClick={() => setIsGroupManagementModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  title="Manage Groups"
                >
                  <Settings size={16} />
                  <span>Manage</span>
                </button>
              </div>
            </div>
            <p className="text-gray-600">Shared financial overview for {members.length} members</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{members.map(m => m.name).join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {shared_accounts && shared_accounts.length > 0 ? (
          shared_accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{account.name}</h3>
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-600 capitalize">{account.type} account</p>
              {/* maybe add some shared by {USER NAME} here*/}
            </div>
          ))
        ) : (
          <div className="col-span-full bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">No shared accounts yet</p>
                <p className="text-sm text-yellow-700">Group members need to share their accounts to see financial data here.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Group Budget Overview Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Group Budget Overview</h2>
          <div className="flex gap-3">
            {userHasGroupBudget ? (
              <button
                onClick={handleEditGroupBudget}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={16} />
                Edit Budget
              </button>
            ) : (
              <button
                onClick={handleCreateGroupBudget}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={16} />
                Create Budget
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center mb-2">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-medium text-gray-700">Total Budget</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${monthly_budget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
              <span className="font-medium text-gray-700">Spent This Month</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${monthly_spending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <div className="flex items-center mb-2">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium text-gray-700">Remaining</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Budget Usage</span>
            <span>{budgetUsagePercent}% used</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${parseFloat(budgetUsagePercent) > 90 ? 'bg-red-500' :
                  parseFloat(budgetUsagePercent) > 75 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
              style={{ width: `${Math.min(parseFloat(budgetUsagePercent), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Account Color Key */}
      {Object.keys(accountColors).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Account Color Key</h3>
            <div className="text-sm text-gray-600">
              {Object.keys(accountColors).length} account{Object.keys(accountColors).length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(accountColors).map(([accountId, color]) => (
              <div key={accountId} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getAccountNameById(accountId)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    ID: ...{accountId.slice(-8)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group Spending Analysis */}
      {(groupTransactions.length > 0 || !userHasGroupBudget) && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Group Spending Analysis</h2>
            <button
              onClick={handleViewGroupSpending}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Eye size={16} />
              View Details
            </button>
          </div>
          {groupTransactions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="text-purple-600" size={20} />
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Total Group Spending</p>
                    <p className="text-xl font-bold text-purple-900">
                      ${groupTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0).toFixed(2)}
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
                      ${(groupTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) / groupTransactions.length).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-green-600" size={20} />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Transactions</p>
                    <p className="text-xl font-bold text-green-900">
                      {groupTransactions.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="text-gray-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Group Members</p>
                    <p className="text-xl font-bold text-gray-900">
                      {members?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Group Spending Data</h3>
              <p className="text-gray-600">Start tracking group expenses by connecting shared accounts or adding transactions.</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Group Transactions</h2>
          <button
            onClick={handleViewGroupSpending}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {/* Show real transactions if available, otherwise show mock data */}
          {(groupTransactions.length > 0 ? groupTransactions.slice(0, 5) : recent_transactions || []).map((transaction, index) => {
            const accountColor = accountColors[transaction.account_id] || '#6B7280'; // Default gray if no account ID
            
            return (
              <div key={transaction.id || index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <div className="relative w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <DollarSign className="h-5 w-5 text-gray-600" />
                    {transaction.account_id && (
                      <div 
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: accountColor }}
                        title={`Account: ${getAccountNameById(transaction.account_id)}`}
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.merchant_name || transaction.name || transaction.description || 'Transaction'}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">
                        {transaction.personal_finance_category?.primary?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || transaction.category || 'Other'}
                      </p>
                      {transaction.account_id && (
                        <>
                          <span className="text-gray-400">•</span>
                          <p className="text-xs text-gray-500">
                            {getAccountNameById(transaction.account_id)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${(transaction.amount || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {(transaction.amount || 0) < 0 ? '-' : '+'}${Math.abs(transaction.amount || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {transaction.date ? new Date(transaction.date + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'Recent'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Budget Visualization Section */}
      {(userHasGroupBudget && groupTransactions.length > 0) ? (
        <div className="mt-8 p-6 border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <PieChart className="text-blue-600" size={24} />
              <div>
                <h3 className="font-semibold text-gray-900">Group Budget Visualization</h3>
                <p className="text-sm text-gray-600">Interactive budget analysis with real spending data</p>
              </div>
            </div>

            {/* Visualization Selector Dropdown */}
            <div className="relative visualization-dropdown">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium">{currentVisualization.name}</span>
                <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {/* Show all visualizations if budget exists */}
                  {visualizations.map((vis) => (
                    <button
                      key={vis.id}
                      onClick={() => handleVisualizationChange(vis.id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${vis.id === selectedVisualization ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                    >
                      {vis.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            {currentVisualization.type === 'budget' ? (
              <VisualizationComponent
                budgetData={{
                  data: [{ budget: currentGroupBudget }]
                }}
                transactionData={groupTransactions}
                onCategoryClick={() => { }} // TODO: Add category click handler
              />
            ) : (
              <VisualizationComponent
                GroupTransactionData={{
                  ...groupData,
                  combined_transactions: groupTransactions, // Use real transaction data
                  recent_transactions: groupTransactions
                }}
              />
            )}
          </div>
        </div>
      ) : groupData && (
        <div className="mt-8 p-6 border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <PieChart className="text-blue-600" size={24} />
              <div>
                <h3 className="font-semibold text-gray-900">Group Overview Visualization</h3>
                <p className="text-sm text-gray-600">Basic group financial overview (create a budget for advanced features)</p>
              </div>
            </div>

            {/* Visualization Selector Dropdown */}
            <div className="relative visualization-dropdown">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium">{currentVisualization.name}</span>
                <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {/* Only show group visualizations if no budget */}
                  {visualizations.filter(vis => vis.type === 'group').map((vis) => (
                    <button
                      key={vis.id}
                      onClick={() => handleVisualizationChange(vis.id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${vis.id === selectedVisualization ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                    >
                      {vis.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <VisualizationComponent
              GroupTransactionData={{
                ...groupData,
                combined_transactions: groupTransactions, // Use real transaction data
                recent_transactions: groupTransactions
              }}
            />
          </div>
        </div>
      )}

      {/* Budget Edit Modal */}
      <EditBudgetModal
        userId={userId}
        isOpen={isEditBudgetModalOpen}
        onClose={() => setIsEditBudgetModalOpen(false)}
        onBudgetUpdated={handleBudgetUpdated}
        currentBudget={currentGroupBudget}
        isGroupBudget={true}
        groupId={selectedGroupId}
      />

      <ViewSpendingModal
        isOpen={isViewSpendingModalOpen}
        onClose={() => setIsViewSpendingModalOpen(false)}
        transactions={groupTransactions}
      />

      <GroupManagementModal
        isOpen={isGroupManagementModalOpen}
        onClose={() => setIsGroupManagementModalOpen(false)}
        groups={allGroups}
        currentGroupId={selectedGroupId}
        currentUserId={userId}
        onGroupAction={handleGroupAction}
      />

      {/* PlaidLink Modal */}
      {showPlaidLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Connect Your Bank Account</h3>
            <p className="text-gray-600 mb-6">
              Link your bank account to share transactions with your group members.
            </p>
            <PlaidLink
              userId={userId}
              onSuccess={() => {
                setShowPlaidLink(false);
                // Refresh group data after linking
                if (selectedGroupId) {
                  loadGroupData(selectedGroupId);
                  fetchGroupTransactions(selectedGroupId);
                }
              }}
            />
            <button
              onClick={() => setShowPlaidLink(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default GroupSection;