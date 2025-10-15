'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Filter, Eye, Settings, ChevronRight, Activity, Target, DollarSign, Home, MessageSquare, User } from 'lucide-react';
import ProtectedRoute from "../components/auth/ProtectedRoute";
import RequireMfa from "../components/auth/RequireMfa";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../lib/apiClient";
import { useRouter } from "next/navigation";
import Sidebar from "../dashboard/components/Sidebar";
import { MessagesSection, AdvisorProfileSection } from "./components/AlternativeSections";

const AdvisorDashboard = () => {
  const [clients, setClients] = useState([]);
  const [advisorInfo, setAdvisorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState('grid'); // 'grid' or 'list'
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Navigation items for advisor dashboard
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, show: true },
    { id: 'messages', label: 'Messages', icon: MessageSquare, show: true },
    { id: 'profile', label: 'Profile', icon: User, show: true },
  ];

  // Fetch advisor data
  const fetchAdvisorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch advisor info first
      let advisorData = null;
      try {
        advisorData = await apiClient.getCurrentAdvisor();
      } catch (advisorError) {
        console.warn('User not registered as advisor yet, using fallback data');
        // Use user display name as fallback
        advisorData = {
          firstname: user?.displayName?.split(' ')[0] || 'Advisor',
          lastname: user?.displayName?.split(' ').slice(1).join(' ') || '',
          advisor_id: null
        };
      }

      // Try to fetch clients (will be empty if not registered as advisor)
      let clientsData = [];
      try {
        clientsData = await apiClient.getAdvisorClients();
      } catch (clientError) {
        console.warn('Could not fetch clients, user may not be registered as advisor yet');
        clientsData = [];
      }

      setAdvisorInfo(advisorData);
      setClients(clientsData || []);
    } catch (err) {
      console.error('Error fetching advisor data:', err);
      setError(err.message || 'Failed to load advisor data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch sent invitations
  const fetchSentInvitations = async () => {
    try {
      const data = await apiClient.getSentInvitations();
      setSentInvitations(data.invitations || []);
    } catch (err) {
      console.error('Error fetching sent invitations:', err);
    }
  };

  // Check if user is actually an advisor, redirect if not
  const checkAdvisorStatus = useCallback(async () => {
    try {
      await apiClient.getCurrentAdvisor();
      // User is an advisor, proceed with loading advisor data
      return true;
    } catch (error) {
      // User is not an advisor, redirect to client dashboard
      console.warn('User is not an advisor, redirecting to client dashboard');
      router.replace('/dashboard');
      return false;
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      // First check if user is actually an advisor
      checkAdvisorStatus().then(isAdvisor => {
        if (isAdvisor) {
          // Add a small delay to ensure Firebase auth is fully settled
          const timer = setTimeout(() => {
            fetchAdvisorData();
          }, 200);
          
          return () => clearTimeout(timer);
        }
      });
    }
  }, [user, authLoading, checkAdvisorStatus, fetchAdvisorData]);

  // Filter clients based on search
  const filteredClients = clients.filter(client => {
    const fullName = `${client.firstname} ${client.lastname}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // Handle add client modal
  const handleAddClient = () => {
    setShowAddClientModal(true);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    fetchSentInvitations(); // Load existing invitations
  };

  // Search users with debounce (same as messaging system)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await apiClient.searchUsers(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Increased debounce to 500ms for better UX with multi-word searches

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Send new invitation
  const handleSendInvitation = async () => {
    if (!selectedUser) {
      alert('Please select a user to invite.');
      return;
    }

    try {
      setCreatingInvitation(true);
      const response = await apiClient.sendInvitationToUser(selectedUser.id);
      
      // Refresh invitations list
      await fetchSentInvitations();
      
      // Show invitation status with email notification info
      const emailStatus = response.email_status || "Email status unknown";
      alert(`Invitation sent successfully to ${selectedUser.firstname} ${selectedUser.lastname}!\n${emailStatus}`);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error sending invitation:', err);
      if (err.message.includes('409')) {
        alert('A pending invitation already exists for this user.');
      } else {
        alert('Failed to send invitation. Please try again.');
      }
    } finally {
      setCreatingInvitation(false);
    }
  };

  // Cancel invitation
  const handleCancelInvitation = async (invitationId) => {
    try {
      await apiClient.cancelInvitation(invitationId);
      await fetchSentInvitations(); // Refresh list
      alert('Invitation cancelled successfully');
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      alert('Failed to cancel invitation. Please try again.');
    }
  };

  // Navigate to client detail view
  const handleViewClient = (client) => {
    router.push(`/advisor-dashboard/client/${client.client_id}`);
  };

  // Handler for advisor data updates
  const handleAdvisorDataUpdate = (newAdvisorData) => {
    setAdvisorInfo(newAdvisorData);
  };

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar
            sidebarOpen={false}
            setSidebarOpen={() => {}}
            activeSection="dashboard"
            setActiveSection={() => {}}
            navigationItems={navigationItems}
            userHasBudget={false}
            userHasGoals={false}
            userHasDebtGoals={false}
            onCreateGoal={() => {}}
            onEditBudget={() => {}}
            onBudgetTemplate={() => {}}
            onManageGoals={() => {}}
            hideQuickActions={true}
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading advisor dashboard...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar
            sidebarOpen={false}
            setSidebarOpen={() => {}}
            activeSection="dashboard"
            setActiveSection={() => {}}
            navigationItems={navigationItems}
            userHasBudget={false}
            userHasGoals={false}
            userHasDebtGoals={false}
            onCreateGoal={() => {}}
            onEditBudget={() => {}}
            onBudgetTemplate={() => {}}
            onManageGoals={() => {}}
            hideQuickActions={true}
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Error: {error}
              </div>
              <button 
                onClick={fetchAdvisorData}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'messages':
        return <MessagesSection />;
      case 'profile':
        return <AdvisorProfileSection advisorData={advisorInfo} onAdvisorDataUpdate={handleAdvisorDataUpdate} />;
      default:
        return (
          <>
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold">
                      Welcome back, {advisorInfo?.firstname || 'Advisor'}
                    </h1>
                    <p className="text-blue-100 mt-2">
                      Manage your clients and track their financial progress
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{clients.length}</div>
                    <div className="text-blue-100 text-sm">Active Clients</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Activity className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active This Month</p>
                      <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>

            {/* Client Management Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Section Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Client Management</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Manage and monitor your clients&apos; financial journeys
                      </p>
                    </div>
                    <button
                      onClick={handleAddClient}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Client
                    </button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedView('grid')}
                        className={`p-2 rounded-lg ${selectedView === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <div className="grid grid-cols-2 gap-1 w-4 h-4">
                          <div className="bg-current rounded-sm"></div>
                          <div className="bg-current rounded-sm"></div>
                          <div className="bg-current rounded-sm"></div>
                          <div className="bg-current rounded-sm"></div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedView('list')}
                        className={`p-2 rounded-lg ${selectedView === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <div className="space-y-1 w-4 h-4">
                          <div className="h-1 bg-current rounded"></div>
                          <div className="h-1 bg-current rounded"></div>
                          <div className="h-1 bg-current rounded"></div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Client List/Grid */}
                <div className="p-6">
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {clients.length === 0 
                          ? "Get started by adding your first client." 
                          : "No clients match your search criteria."
                        }
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={handleAddClient}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Client
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={
                      selectedView === 'grid' 
                        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        : "space-y-4"
                    }>
                      {filteredClients.map((client) => (
                        <ClientCard 
                          key={client.client_id} 
                          client={client} 
                          viewMode={selectedView}
                          onViewClient={handleViewClient}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <ProtectedRoute>
      <RequireMfa>
        <div className="min-h-screen bg-gray-50 flex">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          navigationItems={navigationItems}
          userHasBudget={false}
          userHasGoals={false}
          userHasDebtGoals={false}
          onCreateGoal={() => {}}
          onEditBudget={() => {}}
          onBudgetTemplate={() => {}}
          onManageGoals={() => {}}
          hideQuickActions={true}
        />
        
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>

        {/* Add Client Modal */}
        {showAddClientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Add New Client</h3>
                <button
                  onClick={() => setShowAddClientModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Search for a client by name and send them an invitation. They will receive the invitation and can accept or reject it.
                </p>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">
                      Search for Client
                    </label>
                    <input
                      type="text"
                      id="searchQuery"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type client's name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      disabled={creatingInvitation}
                    />
                    {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                      <p className="text-sm text-gray-500 mt-1">Type at least 2 characters to search</p>
                    )}
                  </div>

                  {/* Selected User */}
                  {selectedUser && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-900">Selected Client:</p>
                      <p className="text-lg font-semibold text-blue-800">
                        {selectedUser.firstname} {selectedUser.lastname}
                      </p>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}

                  {/* Search Results */}
                  {isSearching && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600 text-sm">Searching...</span>
                    </div>
                  )}

                  {!isSearching && searchQuery.trim().length >= 2 && searchResults.length > 0 && !selectedUser && (
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      {searchResults.map(user => (
                        <div
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">{user.firstname} {user.lastname}</p>
                          <p className="text-sm text-gray-600">ID: {user.id}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No users found matching &quot;{searchQuery}&quot;</p>
                      <p className="text-xs text-gray-400 mt-1">Try searching by first name, last name, or full name</p>
                    </div>
                  )}

                  <button
                    onClick={handleSendInvitation}
                    disabled={creatingInvitation || !selectedUser}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                  >
                    {creatingInvitation ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>

                {sentInvitations.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Sent Invitations ({sentInvitations.length})</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sentInvitations.map((invitation) => (
                        <div key={invitation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{invitation.client_name}</p>
                            <p className="text-xs text-gray-600">
                              Status: <span className={`font-medium ${
                                invitation.invitation_status === 'pending' ? 'text-yellow-600' :
                                invitation.invitation_status === 'accepted' ? 'text-green-600' :
                                'text-red-600'
                              }`}>{invitation.invitation_status}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Sent: {new Date(invitation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {invitation.invitation_status === 'pending' && (
                            <div className="ml-2">
                              <button
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                                title="Cancel invitation"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </RequireMfa>
    </ProtectedRoute>
  );
};

// Client Card Component
const ClientCard = ({ client, viewMode, onViewClient }) => {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {client.firstname?.[0]}{client.lastname?.[0]}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {client.firstname} {client.lastname}
            </h3>
            <p className="text-sm text-gray-500">Client ID: {client.client_id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
          <button
            onClick={() => onViewClient(client)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Eye className="h-4 w-4" />
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden group">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
              {client.firstname?.[0]}{client.lastname?.[0]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {client.firstname} {client.lastname}
              </h3>
              <p className="text-sm text-gray-500">ID: {client.client_id}</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        </div>
        
        
        <button
          onClick={() => onViewClient(client)}
          className="w-full bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </button>
      </div>
    </div>
  );
};

export default AdvisorDashboard;
