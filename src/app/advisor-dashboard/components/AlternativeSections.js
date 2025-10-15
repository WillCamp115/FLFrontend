// advisor-dashboard/components/AlternativeSections.js
// Alternative sections for advisor dashboard - Messages and Profile functionality

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, User, Settings, Bell, Edit3, Save, X, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import apiClient from '../../../lib/apiClient';
import { updateProfile, updateEmail } from '../../../lib/firestoreClient';
import { useRouter } from 'next/navigation';
import UserInviteModal from '../../components/modals/UserInviteModal';
import EnhancedGroupInviteModal from '../../components/modals/EnhancedGroupInviteModal';
import MessageList from '../../components/chat/MessageList';
import MessageInput from '../../components/chat/MessageInput';

// Messages Section with user selection functionality (same as client dashboard)
export const MessagesSection = () => {
  const [showUserInviteModal, setShowUserInviteModal] = useState(false);
  const [showGroupInviteManager, setShowGroupInviteManager] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [messagePollingInterval, setMessagePollingInterval] = useState(null);
  const { user } = useAuth();

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError('');
      const conversationList = await apiClient.getConversations();
      setConversations(conversationList);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (conversation) => {
    if (conversation) {
      // Add the new conversation to the list and select it
      setConversations(prevConversations => [conversation, ...prevConversations]);
      setSelectedConversation(conversation);
      // Load messages for the new conversation
      await loadMessages(conversation.id);
    } else {
      // Refresh conversations (e.g., when joining a group)
      await loadConversations();
    }
  };

  // Define polling functions before useEffect to avoid hoisting issues
  const stopMessagePolling = useCallback(() => {
    if (messagePollingInterval) {
      clearInterval(messagePollingInterval);
      setMessagePollingInterval(null);
    }
  }, [messagePollingInterval]);

  const startMessagePolling = useCallback((conversationId) => {
    // Clear existing interval
    stopMessagePolling();

    // Poll for new messages every 3 seconds
    const interval = setInterval(async () => {
      try {
        const messageList = await apiClient.getConversationMessages(conversationId, 20, 0);
        const reversedMessages = messageList.reverse();
        
        // Only update if we have new messages (avoid unnecessary re-renders)
        setMessages(prevMessages => {
          if (prevMessages.length === 0 || 
              reversedMessages.length > prevMessages.length ||
              (reversedMessages.length > 0 && prevMessages.length > 0 && 
               reversedMessages[reversedMessages.length - 1].id !== prevMessages[prevMessages.length - 1].id)) {
            return reversedMessages;
          }
          return prevMessages;
        });
      } catch (err) {
        // Silently handle polling errors to avoid spamming console
        if (err.message.includes('404') || err.message.includes('403')) {
          stopMessagePolling();
        }
      }
    }, 3000);

    setMessagePollingInterval(interval);
  }, [stopMessagePolling]);

  // Clean up polling interval on component unmount or conversation change
  useEffect(() => {
    return () => {
      if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
      }
    };
  }, [messagePollingInterval]);

  // Set up message polling when a conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      startMessagePolling(selectedConversation.id);
    } else {
      stopMessagePolling();
    }

    return () => stopMessagePolling();
  }, [selectedConversation, startMessagePolling, stopMessagePolling]);

  // Load messages for a conversation
  const loadMessages = async (conversationId, showLoading = true) => {
    try {
      if (showLoading) {
        setMessagesLoading(true);
        setMessagesError('');
      }
      const messageList = await apiClient.getConversationMessages(conversationId);
      // Messages come in reverse chronological order, so reverse them for display
      setMessages(messageList.reverse());
    } catch (err) {
      console.error('Error loading messages:', err);
      if (showLoading) {
        setMessagesError('Failed to load messages. Please try again.');
      }
    } finally {
      if (showLoading) {
        setMessagesLoading(false);
      }
    }
  };

  // Handle conversation selection
  const handleConversationSelect = async (conversation) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);
  };

  // Send a message
  const handleSendMessage = async (messageBody) => {
    console.log('handleSendMessage called with:', messageBody);
    
    if (!selectedConversation) {
      console.error('No conversation selected');
      throw new Error('No conversation selected');
    }

    console.log('Sending to conversation:', selectedConversation.id);

    try {
      console.log('Calling apiClient.sendMessage...');
      const newMessage = await apiClient.sendMessage(selectedConversation.id, {
        body: messageBody
      });
      
      console.log('Message sent successfully:', newMessage);
      
      // Add the new message to the local state
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Update the conversation's last message time in the conversations list
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, last_message_at: newMessage.created_at }
            : conv
        )
      );
    } catch (err) {
      console.error('Error sending message:', err);
      console.error('Error details:', err.message, err.stack);
      throw new Error('Failed to send message. Please try again.');
    }
  };

  const getConversationTitle = (conversation) => {
    if (conversation.kind === 'direct') {
      // For direct messages, show the other participant's name
      const otherParticipant = conversation.participants.find(
        p => p.firebase_uid !== user?.uid
      );
      return otherParticipant 
        ? `${otherParticipant.firstname} ${otherParticipant.lastname}` 
        : 'Direct Message';
    } else {
      // For group chats, show participant count
      return `Group Chat (${conversation.participants.length} members)`;
    }
  };

  const formatConversationPreview = (conversation) => {
    const participantNames = conversation.participants
      .filter(p => p.firebase_uid !== user?.uid)
      .map(p => p.firstname)
      .join(', ');
    
    if (conversation.kind === 'direct') {
      return participantNames || 'Direct Message';
    } else {
      return `${participantNames}${conversation.participants.length > 3 ? ' and others' : ''}`;
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
            <p className="text-gray-600">Communicate with other users and clients.</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowGroupInviteManager(true)}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <User className="h-4 w-4 mr-2" />
              Group Invites
            </button>
            <button
              onClick={() => setShowUserInviteModal(true)}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Conversations Yet</h2>
          <p className="text-gray-600 mb-6">
            Start your first conversation by clicking &quot;New Conversation&quot; above.
          </p>
          <button
            onClick={() => setShowUserInviteModal(true)}
            className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Start Your First Conversation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Conversations</h3>
            </div>
            <div className="overflow-y-auto h-full">
              {conversations.map(conversation => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationSelect(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      {conversation.kind === 'direct' ? (
                        <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 bg-green-300 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getConversationTitle(conversation)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {formatConversationPreview(conversation)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {conversation.last_message_at 
                          ? new Date(conversation.last_message_at).toLocaleDateString()
                          : 'New conversation'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversation View */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border">
            {selectedConversation ? (
              <div className="h-full flex flex-col">
                {/* Conversation Header */}
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getConversationTitle(selectedConversation)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatConversationPreview(selectedConversation)}
                  </p>
                </div>
                
                {/* Messages Area */}
                <MessageList
                  messages={messages}
                  loading={messagesLoading}
                  error={messagesError}
                  conversationType={selectedConversation.kind}
                />
                
                {/* Message Input */}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  placeholder={`Message ${getConversationTitle(selectedConversation)}...`}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Invite Modal */}
      <UserInviteModal
        isOpen={showUserInviteModal}
        onClose={() => setShowUserInviteModal(false)}
        onStartConversation={handleStartConversation}
        onGroupJoined={() => {
          // Refresh page or emit event to refresh groups
          console.log('Group joined! Refreshing...');
          // You could add a refresh callback here if needed
        }}
      />

      {/* Enhanced Group Invite Modal */}
      <EnhancedGroupInviteModal
        isOpen={showGroupInviteManager}
        onClose={() => setShowGroupInviteManager(false)}
      />
    </div>
  );
};

// Profile Section for Advisors (adapted from client dashboard - removed Plaid functionality)
export const AdvisorProfileSection = ({ advisorData, onAdvisorDataUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstname: '',
    lastname: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Initialize edit form when advisorData changes
  useEffect(() => {
    if (advisorData || user) {
      setEditForm({
        firstname: advisorData?.firstname || '',
        lastname: advisorData?.lastname || '',
        email: user?.email || advisorData?.email || ''
      });
    }
  }, [advisorData, user]);

  // Check if user signed up with Gmail
  const isGmailUser = user?.providerData?.some(provider => provider.providerId === 'google.com');

  const handleEditClick = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      firstname: advisorData?.firstname || '',
      lastname: advisorData?.lastname || '',
      email: user?.email || advisorData?.email || ''
    });
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Update name in Firebase if it changed
      const currentDisplayName = user?.displayName || '';
      const newDisplayName = `${editForm.firstname} ${editForm.lastname}`;
      
      if (currentDisplayName !== newDisplayName) {
        await updateProfile(user, {
          displayName: newDisplayName
        });
      }

      // Update email in Firebase if it changed and user is not Gmail user
      if (!isGmailUser && editForm.email !== user?.email) {
        await updateEmail(user, editForm.email);
      }

      // Update profile in backend database (use advisor-specific endpoint if available)
      try {
        // Try advisor-specific endpoint first
        const updatedAdvisor = await apiClient.put('/advisors/me/profile', {
          firstname: editForm.firstname,
          lastname: editForm.lastname
        });
        
        setSuccess('Advisor profile updated successfully!');
        
        // Update parent component's advisorData if callback provided
        if (onAdvisorDataUpdate) {
          onAdvisorDataUpdate({
            ...advisorData,
            firstname: editForm.firstname,
            lastname: editForm.lastname
          });
        }
      } catch (advisorError) {
        // Fallback to general user endpoint
        console.log('Advisor endpoint not available, using general user endpoint');
        const updatedUser = await apiClient.put('/users/me/profile', {
          firstname: editForm.firstname,
          lastname: editForm.lastname
        });
        
        setSuccess('Profile updated successfully!');
        
        // Update parent component's advisorData if callback provided
        if (onAdvisorDataUpdate) {
          onAdvisorDataUpdate({
            ...advisorData,
            firstname: editForm.firstname,
            lastname: editForm.lastname
          });
        }
      }

      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (err) {
      console.error('Error updating profile:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use by another account.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('For security reasons, please log out and log back in before changing your email.');
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Multi-step confirmation process
    const firstConfirm = confirm(
      '⚠️ WARNING: Delete Advisor Account\n\n' +
      'This will PERMANENTLY delete your advisor account and ALL associated data:\n\n' +
      '• All financial data and transactions\n' +
      '• All budgets and goals\n' +
      '• All bank account connections\n' +
      '• All client relationships and their data access\n' +
      '• All group memberships and conversations\n\n' +
      'This action CANNOT be undone.\n\n' +
      'Are you absolutely sure you want to continue?'
    );

    if (!firstConfirm) {
      return;
    }

    // Second confirmation
    const secondConfirm = confirm(
      'FINAL CONFIRMATION\n\n' +
      'Type DELETE in the next dialog to confirm account deletion.\n\n' +
      'Click OK to continue or Cancel to abort.'
    );

    if (!secondConfirm) {
      return;
    }

    // Text input confirmation
    const deleteConfirmation = prompt(
      'Please type "DELETE" in capital letters to confirm:\n\n' +
      'This will permanently delete your advisor account and all data.'
    );

    if (deleteConfirmation !== 'DELETE') {
      alert('Account deletion cancelled. You must type "DELETE" exactly to confirm.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Show progress message
      alert('Deleting your advisor account... This may take a few moments.');

      // Call the delete API
      const result = await apiClient.deleteUserAccount();

      // Show success message with cleanup summary
      const cleanupSummary = result.cleanup_summary || {};
      const successMessage = `
Advisor Account successfully deleted!

Cleanup Summary:
• Plaid tokens revoked: ${cleanupSummary.plaid_tokens_revoked || 0}
• Database cleanup: ${cleanupSummary.database_cleanup || 'completed'}
• All related data has been permanently removed

You will now be redirected to the home page.
      `.trim();

      alert(successMessage);

      // Sign out and redirect to home page
      await signOut();
      window.location.href = '/';

    } catch (err) {
      console.error('Error deleting advisor account:', err);

      let errorMessage = 'Failed to delete advisor account. Please try again.';

      if (err.message.includes('404')) {
        errorMessage = 'Account not found. You may already be signed out.';
      } else if (err.message.includes('500')) {
        errorMessage = 'Server error occurred. Please contact support if this persists.';
      } else if (err.message) {
        errorMessage = `Delete failed: ${err.message}`;
      }

      setError(errorMessage);
      alert(`Advisor account deletion failed!\n\n${errorMessage}\n\nIf you continue to experience issues, please contact support.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Use window.location.href to force a full page navigation to the home page
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out. Please try again.');
    }
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Advisor Profile</h1>
        <p className="text-gray-600">Manage your advisor account settings and preferences.</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              {!isEditing && (
                <button
                  onClick={handleEditClick}
                  className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstname"
                    value={isEditing ? editForm.firstname : (advisorData?.firstname || '')}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                      !isEditing ? 'bg-gray-50' : ''
                    }`}
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastname"
                    value={isEditing ? editForm.lastname : (advisorData?.lastname || '')}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                      !isEditing ? 'bg-gray-50' : ''
                    }`}
                    readOnly={!isEditing}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                  {isGmailUser && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Gmail accounts cannot change email)
                    </span>
                  )}
                </label>
                <input
                  type="email"
                  name="email"
                  value={isEditing ? editForm.email : (user?.email || advisorData?.email || 'No email available')}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                    !isEditing || isGmailUser ? 'bg-gray-50' : ''
                  }`}
                  readOnly={!isEditing || isGmailUser}
                />
              </div>

              {isEditing ? (
                <div className="pt-4 flex space-x-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={loading}
                    className="flex items-center bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive updates about your clients</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Settings className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Client Alerts</p>
                    <p className="text-sm text-gray-600">Get notified about client activity</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Account Overview */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Account Type</span>
                <span className="font-medium text-gray-900">Advisor</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium text-gray-900">August 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Advisor ID</span>
                <span className="font-medium text-gray-900">
                  {advisorData?.advisor_id || 'Pending Registration'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Change Password
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Export Client Data
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Privacy Settings
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Delete Account'}
              </button>
              <button 
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center border-t border-gray-200 mt-2 pt-3"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
