'use client'
import React, { useState, useEffect, useCallback, use } from 'react';
import { ArrowLeft, Home, MessageSquare, User, Loader, AlertCircle } from 'lucide-react';
import ProtectedRoute from "../../../components/auth/ProtectedRoute";
import RequireMfa from "../../../components/auth/RequireMfa";
import { useAuth } from "../../../../contexts/AuthContext";
import { apiClient } from "../../../../lib/apiClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Import dashboard components (we'll modify these to work with client data)
import BudgetSection from "../../../components/sections/BudgetSection";
import GoalsSection from "../../../components/sections/GoalsSection";
import SpendingSection from "../../../components/sections/SpendingSection";
import DebtSection from "../../../components/sections/DebtSection";

// Import modal components
import CreateGoalModal from "../../../components/modals/CreateGoalModal";
import EditBudgetModal from "../../../components/modals/EditBudgetModal";
import ViewSpendingModal from "../../../components/modals/ViewSpendingModal";
import ManageGoalsModal from "../../../components/modals/ManageGoalsModal";
import BudgetTemplateModal from "../../../components/modals/BudgetTemplateModal";
import { validateTransactionData } from "../../../utils/mockBudgetHelper";

const ClientDetailView = ({ params }) => {
  const { clientId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isCreateGoalModalOpen, setIsCreateGoalModalOpen] = useState(false);
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);
  const [isViewSpendingModalOpen, setIsViewSpendingModalOpen] = useState(false);
  const [isManageGoalsModalOpen, setIsManageGoalsModalOpen] = useState(false);
  const [isBudgetTemplateModalOpen, setIsBudgetTemplateModalOpen] = useState(false);

  // Client data states
  const [clientData, setClientData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [debtGoals, setDebtGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgetTemplates, setBudgetTemplates] = useState([]);

  // Advisor states
  const [advisorInfo, setAdvisorInfo] = useState(null);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Computed states
  const userHasBudget = Array.isArray(budgets) && budgets.length > 0 && budgets.some(budget => budget && budget.budget);
  const userHasGoals = goals.length > 0;
  const userHasDebtGoals = debtGoals.length > 0;
  const totalGoals = goals.length;
  const currentBudget = userHasBudget ? budgets[0] : null;

  // API call functions - exactly like dashboard but with client-specific calls
  const fetchClientData = async () => {
    try {
      const data = await apiClient.getClientProfile(clientId);
      setClientData(data);
      console.log('Client data loaded:', data);
    } catch (err) {
      console.error('Error fetching client data:', err);
      // Set minimal client data for display
      setClientData({
        firstname: 'Client',
        lastname: '',
        client_id: clientId
      });
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await apiClient.getClientTransactions(clientId);
      console.log('Client transactions loaded from API:', data.added?.length || 0);

      // Validate and use the transaction data from backend (same as regular dashboard)
      if (data.added && validateTransactionData(data.added)) {
        setTransactions(data.added);
      } else {
        console.warn('API transaction data validation failed');
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error fetching client transactions:', err);
      // Set empty transactions for API errors
      setTransactions([]);
    }
  };

  const fetchGoals = async () => {
    try {
      const data = await apiClient.getClientGoals(clientId);
      // Filter out debt goals - they should only appear in debt section
      const nonDebtGoals = data.filter(goal => goal.goal_type !== 'debt_free');
      setGoals(nonDebtGoals);
      console.log('Client goals loaded:', nonDebtGoals);
    } catch (err) {
      console.error('Error fetching client goals:', err);
      setGoals([]);
    }
  };

  const fetchDebtGoals = async () => {
    try {
      const data = await apiClient.getClientDebtGoals(clientId);
      setDebtGoals(data);
      console.log('Client debt goals loaded:', data);
    } catch (err) {
      console.error('Error fetching client debt goals:', err);
      setDebtGoals([]);
    }
  };

  const fetchBudgets = async () => {
    try {
      const data = await apiClient.getClientBudgets(clientId);
      // Ensure data is an array and filter out any empty/invalid budgets
      const validBudgets = Array.isArray(data) ? data.filter(budget => budget && budget.budget) : [];
      setBudgets(validBudgets);
      console.log('Client budgets loaded from API:', validBudgets);
      console.log('Valid budgets count:', validBudgets.length);
    } catch (err) {
      console.error('Error fetching client budgets:', err);
      setBudgets([]);
    }
  };

  const fetchBudgetTemplates = async () => {
    try {
      const data = await apiClient.getBudgetTemplates();
      setBudgetTemplates(data);
      console.log('Budget templates loaded:', data);
    } catch (err) {
      console.error('Error fetching budget templates:', err);
      setBudgetTemplates([]);
    }
  };

  const fetchAdvisorInfo = async () => {
    try {
      const data = await apiClient.getCurrentAdvisor();
      setAdvisorInfo(data);
    } catch (err) {
      console.error('Error fetching advisor info:', err);
    }
  };


  // Fetch all data function - exactly like dashboard
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchClientData(),
        fetchGoals(),
        fetchDebtGoals(),
        fetchBudgets(),
        fetchBudgetTemplates(),
        fetchTransactions(),
        fetchAdvisorInfo()
      ]);

      console.log('Client dashboard data loaded:', {
        budgets: budgets.length,
        goals: goals.length,
        debtGoals: debtGoals.length,
        transactions: transactions.length
      });
    } catch (err) {
      setError('Failed to load client data');
      console.error('Error in fetchAllData:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Fetch data on component mount - exactly like dashboard
  useEffect(() => {
    if (!authLoading && user && clientId) {
      fetchAllData();
    }
  }, [clientId, authLoading, user, fetchAllData]);

  // Modal handlers - exactly like dashboard
  const handleGoalCreated = () => {
    fetchGoals();
    fetchDebtGoals();
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


  // Helper functions for calculations
  const calculateTotalSpending = () => {
    if (!Array.isArray(transactions)) {
      return 0;
    }

    // Filter transactions to current month only (same as client dashboard)
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


  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <RequireMfa>
          <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="flex flex-col items-center">
              <Loader className="animate-spin h-8 w-8 text-blue-600 mb-4" />
              <p className="text-gray-900 font-medium">Loading client dashboard...</p>
            </div>
          </div>
        </RequireMfa>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <RequireMfa>
          <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="h-8 w-8 text-red-600 mb-4" />
              <p className="text-gray-900 font-medium mb-2">Error loading client data</p>
              <p className="text-gray-700 mb-4">{error}</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
                <Link
                  href="/advisor-dashboard"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </RequireMfa>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <RequireMfa>
        <div className="min-h-screen bg-gray-50">
        {/* Header with back navigation */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/advisor-dashboard"
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
                <div className="border-l border-gray-300 pl-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {clientData?.firstname} {clientData?.lastname}
                  </h1>
                  <p className="text-gray-600">Client Financial Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Home className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Budget Status</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userHasBudget ? 'Active' : 'Not Set'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Goals</p>
                  <p className="text-2xl font-bold text-gray-900">{totalGoals}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Monthly Spending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${calculateTotalSpending().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Debt Goals</p>
                  <p className="text-2xl font-bold text-gray-900">{debtGoals.length}</p>
                </div>
              </div>
            </div>
          </div>


          {/* Financial Sections */}
          {userHasBudget && (
            <BudgetSection
              userId={clientId}
              budgets={budgets}
              budgetTemplates={budgetTemplates}
              transactions={transactions}
              onEditBudget={() => setIsEditBudgetModalOpen(true)}
              onCreateBudget={() => setIsEditBudgetModalOpen(true)}
              isAdvisorView={true}
            />
          )}

          {userHasGoals && (
            <GoalsSection
              userId={clientId}
              goals={goals}
              debtGoals={[]}
              onCreateGoal={() => setIsCreateGoalModalOpen(true)}
              onGoalsUpdated={handleGoalsUpdated}
              isAdvisorView={true}
            />
          )}

          {/* Spending Section - Always Show */}
          <SpendingSection
            userId={clientId}
            transactions={transactions}
            onViewDetails={() => setIsViewSpendingModalOpen(true)}
            isAdvisorView={true}
          />

          {/* Debt Section - Always Show in Advisor View */}
          <DebtSection
            userId={clientId}
            debtGoals={debtGoals}
            onCreateGoal={() => setIsCreateGoalModalOpen(true)}
            onDebtUpdated={handleGoalsUpdated}
            onBudgetTemplate={() => setIsBudgetTemplateModalOpen(true)}
            isAdvisorView={true}
          />

          {/* Action Cards for when client has no data */}
          {!userHasBudget && (
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Budget Management</h3>
              <p className="text-gray-600 mb-4">This client hasn&apos;t set up a budget yet. Help them get started.</p>
              <button
                onClick={() => setIsEditBudgetModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Budget for Client
              </button>
            </div>
          )}

          {!userHasGoals && (
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial Goals</h3>
              <p className="text-gray-600 mb-4">Help this client set up financial goals to track their progress.</p>
              <button
                onClick={() => setIsCreateGoalModalOpen(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Create Goal for Client
              </button>
            </div>
          )}
        </div>

        {/* Modal Components */}
        <CreateGoalModal
          userId={clientId}
          isOpen={isCreateGoalModalOpen}
          onClose={() => setIsCreateGoalModalOpen(false)}
          onGoalCreated={handleGoalCreated}
          isAdvisorView={true}
          clientName={`${clientData?.firstname} ${clientData?.lastname}`}
        />

        <EditBudgetModal
          userId={clientId}
          isOpen={isEditBudgetModalOpen}
          onClose={() => setIsEditBudgetModalOpen(false)}
          onBudgetUpdated={handleBudgetUpdated}
          currentBudget={currentBudget}
          isAdvisorView={true}
          clientName={`${clientData?.firstname} ${clientData?.lastname}`}
        />

        <ViewSpendingModal
          isOpen={isViewSpendingModalOpen}
          onClose={() => setIsViewSpendingModalOpen(false)}
          transactions={transactions}
          clientName={`${clientData?.firstname} ${clientData?.lastname}`}
        />

        <ManageGoalsModal
          userId={clientId}
          isOpen={isManageGoalsModalOpen}
          onClose={() => setIsManageGoalsModalOpen(false)}
          onGoalsUpdated={handleGoalsUpdated}
          isAdvisorView={true}
          clientName={`${clientData?.firstname} ${clientData?.lastname}`}
        />

        <BudgetTemplateModal
          userId={clientId}
          isOpen={isBudgetTemplateModalOpen}
          onClose={() => setIsBudgetTemplateModalOpen(false)}
          onBudgetApplied={handleBudgetTemplateApplied}
          isAdvisorView={true}
          clientName={`${clientData?.firstname} ${clientData?.lastname}`}
        />
        </div>
      </RequireMfa>
    </ProtectedRoute>
  );
};

export default ClientDetailView;
