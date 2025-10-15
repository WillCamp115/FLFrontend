// src/pages/Dashboard.jsx
'use client'
import '../styles/componentFixes.css';
import { Home, MessageSquare, Users, User, Bot, Loader, AlertCircle } from 'lucide-react';
import NavBar from "../components/navigation/NavBar";
import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from "../components/auth/ProtectedRoute";
import RequireMfa from "../components/auth/RequireMfa";
import { useAuth } from "../../contexts/AuthContext";
import { useAccounts } from "../../contexts/AccountContext";
import { apiClient } from "../../lib/apiClient";
import { useRouter } from "next/navigation";
import { useHashNavigation } from "../hooks/useHashNavigation";

// Import dashboard components
import Sidebar from "./components/Sidebar";
import WelcomeMessage from "./components/WelcomeMessage";
import DashboardHeader from "./components/DashboardHeader";
import QuickStats from "./components/QuickStats";
import QuickActions from "./components/QuickActions";
import { MessagesSection, ProfileSection } from "./components/AlternativeSections";
import GroupSection from "./components/GroupSection";
import AIAgentSection from "./components/AIAgentSection"

// Import updated section components
import BudgetSection from "../components/sections/BudgetSection";
import GoalsSection from "../components/sections/GoalsSection";
import SpendingSection from "../components/sections/SpendingSection";
import DebtSection from "../components/sections/DebtSection";

// Import modal components
import CreateGoalModal from "../components/modals/CreateGoalModal";
import EditBudgetModal from "../components/modals/EditBudgetModal";
import ViewSpendingModal from "../components/modals/ViewSpendingModal";
import ManageGoalsModal from "../components/modals/ManageGoalsModal";
import BudgetTemplateModal from "../components/modals/BudgetTemplateModal";
import InvitationNotifications from "../components/invitations/InvitationNotifications";
import OnboardingFlow from "../components/onboarding/OnboardingFlow";
import OnboardingRedirect from "../components/onboarding/OnboardingRedirect";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { validateTransactionData } from "../utils/mockBudgetHelper";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Onboarding integration
  const { shouldShowOnboarding, startOnboarding } = useOnboarding();

  // Modal states
  const [isCreateGoalModalOpen, setIsCreateGoalModalOpen] = useState(false);
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);
  const [isViewSpendingModalOpen, setIsViewSpendingModalOpen] = useState(false);
  const [isManageGoalsModalOpen, setIsManageGoalsModalOpen] = useState(false);
  const [isBudgetTemplateModalOpen, setIsBudgetTemplateModalOpen] = useState(false);

  // User data states
  const [userData, setUserData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [debtGoals, setDebtGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgetTemplates, setBudgetTemplates] = useState([]);
  //Group data states
  const [userGroupData, setUserGroupData] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);

  // Import auth context to get user
  const { user, loading: authLoading } = useAuth();
  const { accountsVersion, isRefreshing, finishAccountRefresh } = useAccounts();
  const userId = user?.uid; // Use Firebase UID
  const router = useRouter();

  // Hash-based navigation for deep linking
  const { navigateTo } = useHashNavigation({
    sectionIds: ['budget-section', 'goals-section', 'spending-section', 'debt-section'],
    offset: 80,
    updateOnScroll: activeSection === 'dashboard' // Only update hash when on dashboard view
  });

  // Handle hash navigation for main sections (messages, profile, group, etc.)
  useEffect(() => {
    const handleInitialHash = () => {
      const hash = window.location.hash.replace('#', '');
      const validSections = ['messages', 'group', 'ai-agent', 'profile', 'dashboard'];
      
      if (validSections.includes(hash)) {
        setActiveSection(hash);
      }
    };

    // Check hash on mount
    handleInitialHash();

    // Listen for hash changes
    const handleHashChange = () => {
      handleInitialHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Computed states
  const userHasBudget = Array.isArray(budgets) && budgets.length > 0 && budgets.some(budget => budget && budget.budget);
  const userHasGoals = goals.length > 0;
  const userHasDebtGoals = debtGoals.length > 0;
  const userInGroup = userGroupData !== null; // You'll need to implement group check
  const totalGoals = goals.length; // Only count non-debt goals
  const currentBudget = userHasBudget && budgets[0] ? {
    id: budgets[0].id,
    user_id: budgets[0].user_id,
    ...budgets[0].budget
  } : null;

  // API call functions - no mock data fallbacks
  const fetchUserData = async () => {
    try {
      const data = await apiClient.getCurrentUser();
      setUserData(data);
    } catch (err) {
      // Set minimal user data for new user
      setUserData({
        firstname: user?.displayName?.split(' ')[0] || 'User',
        lastname: user?.displayName?.split(' ').slice(1).join(' ') || '',
        firebase_uid: user?.uid || ''
      });
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await apiClient.getTransactions();

      // Validate and use the transaction data from backend
      if (data.added && validateTransactionData(data.added)) {
        setTransactions(data.added);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      // Set empty transactions for API errors
      setTransactions([]);
    }
  };

  const fetchGroupData = async () => {
    try {
      setGroupLoading(true);
      const groups = await apiClient.getUserGroups();

      if (groups && groups.length > 0) {
        // User is in at least one group, use the first one
        const primaryGroup = groups[0];
        setUserGroupData({
          group_id: primaryGroup.group_id,
          group_name: primaryGroup.group_name,
          owner_id: primaryGroup.owner_id,
          date_created: primaryGroup.date_created
        });
      } else {
        // User is not in any groups
        setUserGroupData(null);
      }
    } catch (err) {
      setUserGroupData(null);
    } finally {
      setGroupLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const data = await apiClient.getGoals();
      // Filter out debt goals - they should only appear in debt section
      const nonDebtGoals = data.filter(goal => goal.goal_type !== 'debt_free');
      setGoals(nonDebtGoals);
    } catch (err) {
      setGoals([]);
    }
  };

  const fetchDebtGoals = async () => {
    try {
      const data = await apiClient.getDebtGoals();
      setDebtGoals(data);
    } catch (err) {
      setDebtGoals([]);
    }
  };

  const fetchBudgets = async () => {
    try {
      const data = await apiClient.getBudgets();
      // Ensure data is an array and filter out any empty/invalid budgets
      const validBudgets = Array.isArray(data) ? data.filter(budget => budget && budget.budget) : [];
      setBudgets(validBudgets);
    } catch (err) {
      setBudgets([]);
    }
  };

  const fetchBudgetTemplates = async () => {
    try {
      const data = await apiClient.getBudgetTemplates();
      setBudgetTemplates(data);
    } catch (err) {
      setBudgetTemplates([]);
    }
  };

  // Fetch all data function
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchUserData(),
        fetchGoals(),
        fetchDebtGoals(),
        fetchBudgets(),
        fetchBudgetTemplates(),
        fetchTransactions(),
        fetchGroupData()
      ]);

    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user is an advisor and redirect if needed
  const checkUserRole = useCallback(async () => {
    // Check cache first to avoid repeated API calls
    const cachedRole = sessionStorage.getItem(`user_role_${userId}`);
    if (cachedRole === 'client') {
      return false; // Already know they're a client
    }
    if (cachedRole === 'advisor') {
      router.push('/advisor-dashboard');
      return true;
    }

    try {
      // Try to get advisor info - if successful, user is an advisor
      await apiClient.getCurrentAdvisor();
      sessionStorage.setItem(`user_role_${userId}`, 'advisor');
      router.push('/advisor-dashboard');
      return true; // Return true to indicate redirect happened
    } catch (error) {
      // User is not an advisor (404/403 error), continue with client dashboard
      sessionStorage.setItem(`user_role_${userId}`, 'client');
      return false;
    }
  }, [router, userId]);

  // Fetch all data on component mount (only when auth is loaded and user exists)
  useEffect(() => {
    if (!authLoading && user && userId) {
      // First check if user is an advisor
      checkUserRole().then(isAdvisor => {
        if (!isAdvisor) {
          // Only load client data if user is not an advisor
          fetchAllData();
          
          // Check if this is a new user who should see onboarding
          // TODO: Replace with backend check when ready
          // const isNewUser = await apiClient.checkIfNewUser();
          const hasSeenOnboarding = localStorage.getItem('freedomledger_onboarding');
          
          if (!hasSeenOnboarding && shouldShowOnboarding()) {
            // Slight delay to let dashboard load first
            setTimeout(() => {
              startOnboarding();
            }, 1000);
          }
        }
      });
    }
  }, [userId, authLoading, user, checkUserRole, fetchAllData, shouldShowOnboarding, startOnboarding]);

  // Watch for account updates and refresh data
  useEffect(() => {
    if (accountsVersion > 0 && !authLoading && user && userId) {

      // Refetch transaction and budget related data
      const refreshAccountData = async () => {
        try {
          await Promise.all([
            fetchTransactions(),
            fetchBudgets()
          ]);
        } catch (error) {
        } finally {
          finishAccountRefresh();
        }
      };

      refreshAccountData();
    }
  }, [accountsVersion, authLoading, user, userId, finishAccountRefresh]);


  // Modal handlers
  const handleGoalCreated = () => {
    fetchGoals();
    fetchDebtGoals();
  };

  const handleGroupUpdated = () => {
    fetchGroupData();
  };

  const handleMessageRedirect = () => {
    setActiveSection('messages');
  };
  const handleBudgetUpdated = () => {
    fetchBudgets();
  };

  const handleGoalsUpdated = () => {
    fetchGoals();
    fetchDebtGoals();
  };

  const handleBudgetTemplateApplied = () => {
    fetchBudgets();
    setIsBudgetTemplateModalOpen(false);
  };

  const handleUserDataUpdate = (newUserData) => {
    setUserData(newUserData);
  };

  // Helper functions for calculations
  const calculateTotalSpending = () => {
    // Filter transactions to current month only
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date || new Date());
      return transactionDate.getMonth() === currentMonth &&
             transactionDate.getFullYear() === currentYear;
    });

    return currentMonthTransactions.reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
  };


  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, show: true },
    { id: 'messages', label: 'Messages', icon: MessageSquare, show: true },
    { id: 'group', label: 'Group Finances', icon: Users, show: userInGroup },
    { id: 'ai-agent', label: 'AI Agent', icon: Bot, show: true },
    { id: 'profile', label: 'Profile', icon: User, show: true },
  ];

  const scrollToSection = (sectionId) => {
    // Use hash navigation which updates URL and scrolls
    navigateTo(sectionId);
  };

  // Smart navigation for quick access buttons
  const handleQuickAccess = (section) => {
    switch (section) {
      case 'budget':
        if (userHasBudget) {
          scrollToSection('budget-section');
        } else {
          setIsEditBudgetModalOpen(true);
        }
        break;
      case 'goals':
        if (userHasGoals) {
          scrollToSection('goals-section');
        } else {
          setIsCreateGoalModalOpen(true);
        }
        break;
      case 'spending':
        scrollToSection('spending-section'); // Always available
        break;
      case 'debt':
        if (userHasDebtGoals) {
          scrollToSection('debt-section');
        } else {
          setIsCreateGoalModalOpen(true); // Open goal creation for debt goals
        }
        break;
      default:
        break;
    }
  };

  return (
    <ProtectedRoute>
      <RequireMfa>
        <OnboardingRedirect>
      {loading ? (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="flex flex-col items-center">
            <Loader className="animate-spin h-8 w-8 text-blue-600 mb-4" />
            <p className="text-gray-900 font-medium">Loading your financial dashboard...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mb-4" />
            <p className="text-gray-900 font-medium mb-2">Error loading dashboard</p>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
      <div className="flex h-screen bg-gray-50">
        {/* Collapsible Sidebar */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          navigationItems={navigationItems}
          userHasBudget={userHasBudget}
          userHasGoals={userHasGoals}
          userHasDebtGoals={userHasDebtGoals}
          onCreateGoal={() => setIsCreateGoalModalOpen(true)}
          onEditBudget={() => setIsEditBudgetModalOpen(true)}
          onBudgetTemplate={() => setIsBudgetTemplateModalOpen(true)}
          onManageGoals={() => setIsManageGoalsModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'dashboard' ? (
            <div className="p-6 max-w-7xl mx-auto">
              {/* Account Refresh Loading Indicator */}
              {isRefreshing && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <Loader className="animate-spin h-4 w-4 text-blue-600 mr-2" />
                    <p className="text-blue-800 text-sm">Refreshing account data...</p>
                  </div>
                </div>
              )}

              {/* Welcome Messages */}
              <WelcomeMessage
                userHasBudget={userHasBudget}
                userHasGoals={userHasGoals}
                userHasDebtGoals={userHasDebtGoals}
                onCreateBudget={() => setIsEditBudgetModalOpen(true)}
                onCreateGoal={() => setIsCreateGoalModalOpen(true)}
                onViewTemplates={() => setIsBudgetTemplateModalOpen(true)}
              />

              {/* Invitation Notifications */}
              <InvitationNotifications />

              {/* Header */}
              <DashboardHeader
                userData={userData}
              />

              {/* Quick Stats */}
              <QuickStats
                totalGoals={totalGoals}
                totalSpending={calculateTotalSpending()}
                debtGoalsCount={debtGoals.length}
                userHasBudget={userHasBudget}
              />

              {/* Quick Actions Bar */}
              <QuickActions
                userHasBudget={userHasBudget}
                userHasGoals={userHasGoals}
                userHasDebtGoals={userHasDebtGoals}
                onQuickAccess={handleQuickAccess}
              />


              {/* Conditional Section Rendering */}
              {userHasBudget && (
                <div className={`relative ${isRefreshing ? 'opacity-75 pointer-events-none' : ''}`}>
                  <BudgetSection
                    userId={userId}
                    budgets={budgets}
                    budgetTemplates={budgetTemplates}
                    transactions={transactions}
                    onEditBudget={() => setIsEditBudgetModalOpen(true)}
                    onCreateBudget={() => setIsEditBudgetModalOpen(true)}
                  />
                  {isRefreshing && (
                    <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
                      <Loader className="animate-spin h-6 w-6 text-blue-600" />
                    </div>
                  )}
                </div>
              )}

              {userHasGoals && (
                <GoalsSection
                  userId={userId}
                  goals={goals} // Only non-debt goals
                  debtGoals={[]} // Empty array - debt goals only show in debt section
                  onCreateGoal={() => setIsCreateGoalModalOpen(true)}
                  onGoalsUpdated={handleGoalsUpdated}
                />
              )}

              {/* Spending Section - Always Show */}
              <div className={`relative ${isRefreshing ? 'opacity-75 pointer-events-none' : ''}`}>
                <SpendingSection
                  userId={userId}
                  transactions={transactions}
                  onViewDetails={() => setIsViewSpendingModalOpen(true)}
                />
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
                    <Loader className="animate-spin h-6 w-6 text-blue-600" />
                  </div>
                )}
              </div>

              {/* Debt Section - Always Show */}
              <DebtSection
                userId={userId}
                debtGoals={debtGoals}
                onCreateGoal={() => setIsCreateGoalModalOpen(true)}
                onDebtUpdated={handleGoalsUpdated}
                onBudgetTemplate={() => setIsBudgetTemplateModalOpen(true)}
              />
            </div>
          ) : activeSection === 'messages' ? (
            <MessagesSection onGroupJoined={fetchGroupData} />
          ) : activeSection === 'group' ? (
            <GroupSection
              userId={userId}
              onMessageRedirect={handleMessageRedirect}
            />
          ) : activeSection === 'ai-agent' ? (
            <AIAgentSection userId={userId} />
          ) : activeSection === 'profile' ? (
            <ProfileSection userData={userData} onUserDataUpdate={handleUserDataUpdate} />
          ) : null}
        </div>

        {/* Modal Components */}
        <CreateGoalModal
          userId={userId}
          isOpen={isCreateGoalModalOpen}
          onClose={() => setIsCreateGoalModalOpen(false)}
          onGoalCreated={handleGoalCreated}
        />

        <EditBudgetModal
          userId={userId}
          isOpen={isEditBudgetModalOpen}
          onClose={() => setIsEditBudgetModalOpen(false)}
          onBudgetUpdated={handleBudgetUpdated}
          currentBudget={currentBudget}
        />

        <ViewSpendingModal
          isOpen={isViewSpendingModalOpen}
          onClose={() => setIsViewSpendingModalOpen(false)}
          transactions={transactions}
        />

        <ManageGoalsModal
          userId={userId}
          isOpen={isManageGoalsModalOpen}
          onClose={() => setIsManageGoalsModalOpen(false)}
          onGoalsUpdated={handleGoalsUpdated}
        />

        <BudgetTemplateModal
          userId={userId}
          isOpen={isBudgetTemplateModalOpen}
          onClose={() => setIsBudgetTemplateModalOpen(false)}
          onBudgetApplied={handleBudgetTemplateApplied}
        />

        {/* Onboarding Flow */}
        <OnboardingFlow />
      </div>
      )}
        </OnboardingRedirect>
      </RequireMfa>
    </ProtectedRoute>
  );
};

export default Dashboard;
