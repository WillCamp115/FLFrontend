import { auth } from './firestoreClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
console.log(API_BASE_URL)
/**
 * Get the current user's auth token with automatic refresh
 */
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) {
    console.error('No current user found in Firebase auth');
    throw new Error('User not authenticated');
  }

  try {
    // Add a small delay to ensure Firebase is fully initialized
    if (!user.uid) {
      console.warn('User UID not ready, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force refresh the token to ensure it's valid
    const token = await user.getIdToken(true); // true forces refresh
    return token;
  } catch (error) {
    console.error('Error getting ID token:', error);
    throw new Error('Failed to get authentication token');
  }
}

/**
 * Make an authenticated API request with retry on token expiration
 */
async function makeAuthenticatedRequest(endpoint, options = {}) {
  try {
    const token = await getAuthToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      // If we get a 401, try refreshing the token once more
      if (response.status === 401) {
        console.log('Got 401, attempting token refresh...');
        const refreshedToken = await getAuthToken();
        const retryConfig = {
          ...config,
          headers: {
            ...config.headers,
            'Authorization': `Bearer ${refreshedToken}`,
          },
        };

        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, retryConfig);
        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({ error: 'Request failed after retry' }));
          const errorMessage = errorData.detail || errorData.error || errorData.message || `HTTP ${retryResponse.status}`;
          
          // Don't log 404 errors for advisor endpoints as they're expected when user is not an advisor
          if (!(retryResponse.status === 404 && endpoint.includes('/advisors/'))) {
            console.error('API Error after retry:', {
              status: retryResponse.status,
              endpoint,
              error: errorData
            });
          }
          
          // Create error with status code preserved
          const error = new Error(errorMessage);
          error.status = retryResponse.status;
          throw error;
        }
        // Handle 204 No Content responses in retry
        if (retryResponse.status === 204) {
          return null;
        }
        return await retryResponse.json();
      }

      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      const errorMessage = errorData.detail || errorData.error || errorData.message || `HTTP ${response.status}`;
      
      // Don't log 404 errors for advisor endpoints as they're expected when user is not an advisor
      if (!(response.status === 404 && endpoint.includes('/advisors/'))) {
        console.error('API Error:', {
          status: response.status,
          endpoint,
          error: errorData
        });
      }
      
      // Create error with status code preserved
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    // Handle 204 No Content responses (like DELETE endpoints)
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    // Don't log 404 errors for advisor endpoints as they're expected when user is not an advisor
    if (!(error.status === 404 && endpoint.includes('/advisors/'))) {
      console.error('API Request failed:', {
        endpoint,
        error: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

/**
 * API client methods
 */
export const apiClient = {
  // Generic HTTP methods (consistent with existing pattern)
  get: (endpoint) => makeAuthenticatedRequest(endpoint),
  post: (endpoint, data) => makeAuthenticatedRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (endpoint, data) => makeAuthenticatedRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (endpoint) => makeAuthenticatedRequest(endpoint, {
    method: 'DELETE',
  }),

  // User endpoints
  getCurrentUser: () => makeAuthenticatedRequest('/users/me'),
  getPlaidToken: () => makeAuthenticatedRequest('/users/me/plaid-token'),
  getAllPlaidTokens: async () => {
    // Use the correct alltokens endpoint
    try {
      return await makeAuthenticatedRequest('/users/me/alltokens');
    } catch (error) {
      console.error('Error fetching Plaid tokens:', error);
      return [];
    }
  },
  getUserAccounts: () => makeAuthenticatedRequest('/users/me/accounts'),
  unlinkPlaidConnection: () => makeAuthenticatedRequest('/users/me/plaid-connection', {
    method: 'DELETE',
  }),
  updatePlaidConnection: (accessToken) => makeAuthenticatedRequest('/users/me/plaid-connection', {
    method: 'PUT',
    body: JSON.stringify({ access_token: accessToken }),
  }),
  addPlaidToken: async (accessToken) => {
    // Use the correct plaid-tokens endpoint to save to PlaidTokens table
    try {
      return await makeAuthenticatedRequest('/users/me/plaid-tokens', {
        method: 'POST',
        body: JSON.stringify({ access_token: accessToken }),
      });
    } catch (error) {
      console.error('Error adding Plaid token:', error);
      throw error;
    }
  },
  deletePlaidToken: async (tokenReference) => {
    // Use the correct plaid-tokens endpoint with token reference
    try {
      return await makeAuthenticatedRequest('/users/me/plaid-tokens', {
        method: 'DELETE',
        body: JSON.stringify({ token_reference: tokenReference }),
      });
    } catch (error) {
      console.error('Error deleting Plaid token:', error);
      throw error;
    }
  },

  // Delete user account
  deleteUserAccount: async () => {
    try {
      return await makeAuthenticatedRequest('/users/me', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  },

  // Goals endpoints
  getGoals: async () => {
    try {
      return await makeAuthenticatedRequest('/goals/me');
    } catch (error) {
      console.error('Failed to fetch goals, returning empty array:', error);
      return [];
    }
  },
  createGoal: (goalData) => makeAuthenticatedRequest('/goals/me', {
    method: 'POST',
    body: JSON.stringify(goalData),
  }),
  deleteGoal: (goalName) => makeAuthenticatedRequest(`/goals/me/${encodeURIComponent(goalName)}`, {
    method: 'DELETE',
  }),
  contributeToGoal: (goalName, contributionAmount) => makeAuthenticatedRequest(`/goals/me/${encodeURIComponent(goalName)}/contribute?contribution_amount=${contributionAmount}`, {
    method: 'PUT',
  }),

  // Budget endpoints
  getBudgets: async () => {
    try {
      return await makeAuthenticatedRequest('/user/me/budgets');
    } catch (error) {
      console.error('Failed to fetch budgets, returning empty array:', error);
      return [];
    }
  },
  createBudget: (budgetData) => makeAuthenticatedRequest('/user/me/budgets', {
    method: 'POST',
    body: JSON.stringify(budgetData),
  }),
  deleteBudgets: () => makeAuthenticatedRequest('/user/me/budgets', {
    method: 'DELETE',
  }),
  getBudgetTemplates: () => makeAuthenticatedRequest('/user/me/budget_templates'),
  getAutopopulateBudgetData: () => makeAuthenticatedRequest('/user/me/autopopulate-budget-data'),

  // NEW: Budget Template endpoints
  getSpendingInsights: () => makeAuthenticatedRequest('/user/me/spending_insights'),
  applyBudgetTemplate: (templateData) => makeAuthenticatedRequest('/user/me/budget_templates/apply', {
    method: 'POST',
    body: JSON.stringify(templateData),
  }),

  // Debt goal endpoints
  getDebtGoals: () => makeAuthenticatedRequest('/user/me/goal/debt'),
  createDebtGoal: (debtGoalData) => makeAuthenticatedRequest('/user/me/goal/debt', {
    method: 'POST',
    body: JSON.stringify(debtGoalData),
  }),

  // Liability and onboarding endpoints
  getLiabilityAccounts: () => makeAuthenticatedRequest('/liabilities/accounts'),
  getSuggestedDebtGoalsFromLiabilities: () => makeAuthenticatedRequest('/liabilities/suggested-debt-goals'),
  createDebtGoalsFromSuggestions: (selectedGoals) => makeAuthenticatedRequest('/liabilities/create-debt-goals-from-suggestions', {
    method: 'POST',
    body: JSON.stringify({ selected_goals: selectedGoals }),
  }),

  // Transaction endpoints
  getTransactions: async () => {
    try {
      // Check environment flag to determine which endpoint to use
      const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_TRANSACTIONS === 'true';
      const endpoint = useMockData ? '/user/me/transactions/mock' : '/user/me/transactions';

      console.log('=== TRANSACTION ENDPOINT SELECTION ===');
      console.log('Environment variable value:', process.env.NEXT_PUBLIC_USE_MOCK_TRANSACTIONS);
      console.log('Using mock data:', useMockData);
      console.log('Endpoint:', endpoint);

      const result = await makeAuthenticatedRequest(endpoint);

      console.log('Transaction result:', {
        added: result?.added?.length || 0,
        modified: result?.modified?.length || 0,
        removed: result?.removed?.length || 0
      });

      return result;
    } catch (error) {
      console.error('Failed to fetch transactions, returning empty data:', error);
      // Return empty transaction data structure as fallback
      return {
        added: [],
        modified: [],
        removed: []
      };
    }
  },

  // Transaction category correction endpoints
  createCategoryCorrection: async (transactionId, originalCategory, correctedCategory) => {
    try {
      return await makeAuthenticatedRequest('/user/me/transaction-categories', {
        method: 'POST',
        body: JSON.stringify({
          transaction_id: transactionId,
          original_category: originalCategory,
          corrected_category: correctedCategory
        }),
      });
    } catch (error) {
      console.error('Failed to create category correction:', error);
      throw error;
    }
  },

  getAllCategoryCorrections: async () => {
    try {
      return await makeAuthenticatedRequest('/user/me/transaction-categories');
    } catch (error) {
      console.error('Failed to fetch category corrections, returning empty array:', error);
      return [];
    }
  },

  getCategoryCorrection: async (transactionId) => {
    try {
      return await makeAuthenticatedRequest(`/user/me/transaction-categories/${transactionId}`);
    } catch (error) {
      console.error('Failed to fetch category correction:', error);
      throw error;
    }
  },

  updateCategoryCorrection: async (transactionId, correctedCategory) => {
    try {
      return await makeAuthenticatedRequest(`/user/me/transaction-categories/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          corrected_category: correctedCategory
        }),
      });
    } catch (error) {
      console.error('Failed to update category correction:', error);
      throw error;
    }
  },

  deleteCategoryCorrection: async (transactionId) => {
    try {
      return await makeAuthenticatedRequest(`/user/me/transaction-categories/${transactionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete category correction:', error);
      throw error;
    }
  },

  // Visualization preference endpoints
  getPreferredVisualization: () => makeAuthenticatedRequest('/user/me/preferred_vis'),
  setPreferredVisualization: (visId) => makeAuthenticatedRequest('/user/me/preferred_vis', {
    method: 'POST',
    body: JSON.stringify({ vis_id: visId }),
  }),
  deletePreferredVisualization: (visId) => makeAuthenticatedRequest(`/user/me/preferred_vis/${visId}`, {
    method: 'DELETE',
  }),

  // Advisor endpoints
  getCurrentAdvisor: async () => {
    try {
      return await makeAuthenticatedRequest('/advisors/me');
    } catch (error) {
      // Don't log 404 errors as they're expected when user is not an advisor
      if (error.status !== 404) {
        console.error('Failed to fetch advisor info:', error);
      }
      throw error;
    }
  },
  getAdvisorClients: async () => {
    try {
      return await makeAuthenticatedRequest('/advisors/me/clients');
    } catch (error) {
      // Don't log 404 errors as they're expected when user is not an advisor
      if (error.status !== 404) {
        console.error('Failed to fetch advisor clients, returning empty array:', error);
      }
      return [];
    }
  },
  getAdvisorClientIds: async () => {
    try {
      return await makeAuthenticatedRequest('/advisors/me/clients/ids');
    } catch (error) {
      // Don't log 404 errors as they're expected when user is not an advisor
      if (error.status !== 404) {
        console.error('Failed to fetch advisor client IDs, returning empty array:', error);
      }
      return { client_ids: [] };
    }
  },
  getSpecificClient: (clientId) => makeAuthenticatedRequest(`/advisors/me/client/${clientId}`),

  // New invitation management system
  sendInvitation: async (clientEmail, invitationType = 'advisor_client') => {
    try {
      const response = await makeAuthenticatedRequest('/users/me/invitations', {
        method: 'POST',
        body: JSON.stringify({
          client_email: clientEmail,
          invitation_type: invitationType
        }),
      });
      return response;
    } catch (error) {
      console.error('Failed to send invitation:', error);
      throw error;
    }
  },

  sendInvitationToUser: async (clientId, invitationType = 'advisor_client') => {
    try {
      const response = await makeAuthenticatedRequest('/users/me/invitations/by-id', {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          invitation_type: invitationType
        }),
      });
      return response;
    } catch (error) {
      console.error('Failed to send invitation:', error);
      throw error;
    }
  },

  getReceivedInvitations: async () => {
    try {
      return await makeAuthenticatedRequest('/users/me/invitations/received');
    } catch (error) {
      console.error('Failed to fetch received invitations:', error);
      return { invitations: [] };
    }
  },

  getSentInvitations: async () => {
    try {
      return await makeAuthenticatedRequest('/users/me/invitations/sent');
    } catch (error) {
      console.error('Failed to fetch sent invitations:', error);
      return { invitations: [] };
    }
  },

  respondToInvitation: async (invitationId, status) => {
    try {
      return await makeAuthenticatedRequest(`/users/me/invitations/${invitationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          invitation_status: status
        }),
      });
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      throw error;
    }
  },

  cancelInvitation: async (invitationId) => {
    try {
      return await makeAuthenticatedRequest(`/users/me/invitations/${invitationId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      throw error;
    }
  },

  searchUserByEmail: async (email) => {
    try {
      return await makeAuthenticatedRequest(`/users/search/email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('Failed to search user by email:', error);
      throw error;
    }
  },

  // User search for chat functionality
  searchUsers: async (query) => {
    try {
      return await makeAuthenticatedRequest(`/users/search?q=${encodeURIComponent(query)}`);
    } catch (error) {
      console.error('Failed to search users:', error);
      return [];
    }
  },

  // Debug endpoint to list all users
  debugListAllUsers: async () => {
    try {
      return await makeAuthenticatedRequest('/users/debug/all');
    } catch (error) {
      console.error('Failed to list all users:', error);
      return [];
    }
  },

  // Group management endpoints
  getUserGroups: async () => {
    try {
      console.log('=== API CLIENT DEBUGGING ===');
      console.log('Making request to /group/me');

      const result = await makeAuthenticatedRequest('/group/me');

      console.log('API response received:', result);
      console.log('Response type:', typeof result);
      console.log('Is array:', Array.isArray(result));

      return result;
    } catch (error) {
      console.error('Failed to fetch user groups:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      console.log('Returning empty array due to error');
      return [];
    }
  },


  createGroup: async (groupData) => {
    try {
      return await makeAuthenticatedRequest('/group/', {
        method: 'POST',
        body: JSON.stringify(groupData),
      });
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  },
  createGroupInvite: async (groupId) => {
    try {
      return await makeAuthenticatedRequest(`/group/${groupId}/invite`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to create group invite:', error);
      throw error;
    }
  },
  joinGroupByInvite: async (invitationCode) => {
    try {
      return await makeAuthenticatedRequest(`/group/join/${invitationCode}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to join group:', error);
      throw error;
    }
  },

  joinGroupByCode: async (code) => {
    try {
      return await makeAuthenticatedRequest(`/group/me/join/${code}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to join group by code:', error);
      throw error;
    }
  },

  // Conversation endpoints
  getConversations: async () => {
    try {
      return await makeAuthenticatedRequest('/conversations');
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      return [];
    }
  },
  createConversation: async (conversationData) => {
    try {
      return await makeAuthenticatedRequest('/conversations', {
        method: 'POST',
        body: JSON.stringify(conversationData),
      });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  },
  getConversationMessages: async (conversationId, limit = 50, offset = 0) => {
    try {
      return await makeAuthenticatedRequest(`/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`);
    } catch (error) {
      console.error('Failed to fetch conversation messages:', error);
      return [];
    }
  },
  sendMessage: async (conversationId, messageData) => {
    try {
      console.log('apiClient.sendMessage called with:', conversationId, messageData);
      const result = await makeAuthenticatedRequest(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageData),
      });
      console.log('apiClient.sendMessage result:', result);
      return result;
    } catch (error) {
      console.error('Failed to send message in apiClient:', error);
      throw error;
    }
  },
  editMessage: async (conversationId, messageId, messageData) => {
    try {
      return await makeAuthenticatedRequest(`/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify(messageData),
      });
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  },
  deleteMessage: async (conversationId, messageId) => {
    try {
      return await makeAuthenticatedRequest(`/conversations/${conversationId}/messages/${messageId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  },

  // Group member management endpoints
  getGroupMembers: async (groupId) => {
    try {
      return await makeAuthenticatedRequest(`/group/${groupId}/members`);
    } catch (error) {
      console.error('Failed to fetch group members:', error);
      throw error;
    }
  },

  leaveGroup: async (groupId) => {
    try {
      return await makeAuthenticatedRequest(`/group/${groupId}/leave`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to leave group:', error);
      throw error;
    }
  },

  removeGroupMember: async (groupId, memberFirebaseUid) => {
    try {
      return await makeAuthenticatedRequest(`/group/${groupId}/members/${memberFirebaseUid}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to remove group member:', error);
      throw error;
    }
  },

  // Client-specific API methods for advisors
  getClientProfile: async (clientId) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/profile`);
  },

  getClientGoals: async (clientId) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/goals`);
  },

  getClientDebtGoals: async (clientId) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/debt-goals`);
  },

  getClientBudgets: async (clientId) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/budgets`);
  },

  getClientTransactions: async (clientId) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/transactions`);
  },

  getClientNotes: async (clientId) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/notes`);
  },

  updateClientNotes: async (clientId, notes) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/notes`, {
      method: 'PUT',
      body: JSON.stringify(notes),
    });
  },

  // Client management actions for advisors (creating/updating client data)
  createClientGoal: async (clientId, goalData) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/goals`, {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  },

  createClientDebtGoal: async (clientId, goalData) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/debt-goals`, {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  },

  updateClientGoal: async (clientId, goalId, goalData) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(goalData),
    });
  },

  deleteClientGoal: async (clientId, goalId) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/goals/${goalId}`, {
      method: 'DELETE',
    });
  },

  createClientBudget: async (clientId, budgetData) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/budgets`, {
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
  },

  updateClientBudget: async (clientId, budgetId, budgetData) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/budgets/${budgetId}`, {
      method: 'PUT',
      body: JSON.stringify(budgetData),
    });
  },

  deleteClientBudget: async (clientId, budgetId) => {
    return makeAuthenticatedRequest(`/advisors/clients/${clientId}/budgets/${budgetId}`, {
      method: 'DELETE',
    });
  },

  // Enhanced Group Invite System with Bank Account Sharing
  getUserAccounts: async () => {
    try {
      return await makeAuthenticatedRequest('/users/me/accounts');
    } catch (error) {
      console.error('Failed to fetch user accounts:', error);
      return [];
    }
  },

  createGroupInviteWithAccounts: async (groupId, sharedAccounts = []) => {
    try {
      const results = [];
      for (const account of sharedAccounts) {
        const payload = {
          plaid_account_id: account.plaid_account_id,  // <-- send ID only
        };

        const result = await makeAuthenticatedRequest(`/group/${groupId}/shared-accounts`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('Failed to create group invite with accounts:', error);
      throw error;
    }
  },


  createGroupInviteLink: async (groupId, maxUses = 5, expiresInHours = 168) => {
    try {
      return await makeAuthenticatedRequest(`/group/me/${groupId}/invite-links`, {
        method: 'POST',
        body: JSON.stringify({
          max_uses: maxUses,
          expires_in_hours: expiresInHours
        }),
      });
    } catch (error) {
      console.error('Failed to create group invite link:', error);
      throw error;
    }
  },

  previewGroupInviteWithAccounts: async (inviteCode) => {
    try {
      // In groups.py this is preview_invite_link
      return await makeAuthenticatedRequest(`/group/invite-links/${inviteCode}`);
    } catch (error) {
      console.error('Failed to preview group invite:', error);
      throw error;
    }
  },

  joinGroupWithAccounts: async (inviteCode) => {
    try {
      // Join a group via invite link (groups.py)
      return await makeAuthenticatedRequest(`/group/me/join/${inviteCode}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to join group with accounts:', error);
      throw error;
    }
  },

  getGroupSharedAccounts: async (groupId) => {
    try {
      return await makeAuthenticatedRequest(`/group/${groupId}/shared-accounts`);
    } catch (error) {
      console.error('Failed to get group shared accounts:', error);
      return [];
    }
  },

  updateMySharedAccounts: async (groupId, sharedAccounts) => {
    try {
      // Add/update accounts for this user in the group
      const results = [];
      for (const account of sharedAccounts) {
        const payload = {
          plaid_account_id: account.plaid_account_id,  // <-- send ID only, matching createGroupInviteWithAccounts
        };
        const result = await makeAuthenticatedRequest(`/group/${groupId}/shared-accounts`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('Failed to update shared accounts:', error);
      throw error;
    }
  },

  getReceivedGroupInvitations: async () => {
    console.warn('getReceivedGroupInvitations is not implemented in groups.py');
    return [];
  },

  getSentGroupInvitations: async () => {
    console.warn('getSentGroupInvitations is not implemented in groups.py');
    return [];
  },

  respondToGroupInvitation: async (inviteId, response) => {
    console.warn('respondToGroupInvitation is not implemented in groups.py');
    return { message: 'Not implemented', inviteId, response };
  },

  // Group management endpoints
  leaveGroup: async (groupId) => {
    try {
      return await makeAuthenticatedRequest(`/group/me/${groupId}/leave`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to leave group:', error);
      throw error;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      return await makeAuthenticatedRequest(`/group/${groupId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  },

  // Group invitation email functionality
  sendGroupInvitationEmails: async (invitationCode, recipientEmails, groupName) => {
    try {
      return await makeAuthenticatedRequest('/group-invites/send-invitation-emails', {
        method: 'POST',
        body: JSON.stringify({
          invitation_code: invitationCode,
          recipient_emails: recipientEmails,
          group_name: groupName
        }),
      });
    } catch (error) {
      console.error('Failed to send group invitation emails:', error);
      throw error;
    }
  },

  // Group Budget endpoints
  getGroupBudgets: async (groupId) => {
    try {
      return await makeAuthenticatedRequest(`/group-budgets/group/${groupId}`);
    } catch (error) {
      console.error('Failed to fetch group budgets:', error);
      return [];
    }
  },

  createGroupBudget: async (groupId, budgetData) => {
    try {
      return await makeAuthenticatedRequest('/group-budgets/', {
        method: 'POST',
        body: JSON.stringify({
          group_id: groupId,
          title: budgetData.title || 'Group Budget',
          budget: budgetData.budget,
        }),
      });
    } catch (error) {
      console.error('Failed to create group budget:', error);
      throw error;
    }
  },

  updateGroupBudget: async (budgetId, budgetData) => {
    try {
      return await makeAuthenticatedRequest(`/group-budgets/${budgetId}`, {
        method: 'PUT',
        body: JSON.stringify(budgetData),
      });
    } catch (error) {
      console.error('Failed to update group budget:', error);
      throw error;
    }
  },

  deleteGroupBudget: async (budgetId) => {
    try {
      return await makeAuthenticatedRequest(`/group-budgets/${budgetId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete group budget:', error);
      throw error;
    }
  },
};

export default apiClient;