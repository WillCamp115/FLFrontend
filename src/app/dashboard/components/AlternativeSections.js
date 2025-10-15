// dashboard/components/AlternativeSections.js
// Update this file to remove GroupSection since it's now a separate component

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, User, Users, Settings, Bell, CreditCard, Plus, Trash2, Edit3, Save, X, LogOut, RotateCcw } from 'lucide-react';
import PlaidLink from '../../components/plaid/PlaidLink';
import { useAuth } from '../../../contexts/AuthContext';
import apiClient from '../../../lib/apiClient';
import { updateProfile, updateEmail } from '../../../lib/firestoreClient';
import { useRouter } from 'next/navigation';
import UserInviteModal from '../../components/modals/UserInviteModal';
import EnhancedGroupInviteModal from '../../components/modals/EnhancedGroupInviteModal';
import JoinGroupModal from '../../components/modals/JoinGroupModal';
import MessageList from '../../components/chat/MessageList';
import MessageInput from '../../components/chat/MessageInput';
import BudgetEditor from '../../components/chat/BudgetEditor';
import SubscriptionStatus from '../../components/subscription/SubscriptionStatus';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import GroupDetailsModal from '../../components/modals/GroupDetailsModal';

// Messages Section with user selection functionality
export const MessagesSection = ({ onGroupJoined }) => {
  const [showUserInviteModal, setShowUserInviteModal] = useState(false);
  const [showGroupInviteManager, setShowGroupInviteManager] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [messagePollingInterval, setMessagePollingInterval] = useState(null);
  const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const { user, loading: authLoading } = useAuth();

  // Load conversations on mount and set up polling
  useEffect(() => {
    // Wait for auth to finish loading AND user to exist
    if (!authLoading && user) {
      // Small delay to ensure Firebase token is ready after auth loads
      const initialLoadTimer = setTimeout(() => {
        loadConversations(true); // Show loading on initial load
      }, 100);

      // Poll for conversation list updates every 5 seconds (silently, no loading indicator)
      const conversationPollInterval = setInterval(() => {
        loadConversations(false);
      }, 5000);

      return () => {
        clearTimeout(initialLoadTimer);
        clearInterval(conversationPollInterval);
      };
    }
  }, [user, authLoading]);

  const loadConversations = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError('');
      
      // Double-check user is still authenticated before making request
      if (!user) {
        return;
      }
      
      const conversationList = await apiClient.getConversations();

      // Check if currently selected conversation is still in the list
      if (selectedConversation) {
        const stillExists = conversationList.some(conv => conv.id === selectedConversation.id);
        if (!stillExists) {
          // Selected conversation was removed (user was removed from group)
          console.log('Selected conversation no longer accessible, clearing selection');
          setSelectedConversation(null);
          setMessages([]);
          setMessagesError('You no longer have access to this conversation.');
        }
      }

      setConversations(conversationList);
    } catch (err) {
      // Don't log auth errors - they're expected during page refresh
      if (!err.message?.includes('authentication token') && !err.message?.includes('network-request-failed')) {
        console.error('Error loading conversations:', err);
      }
      
      // Only show error to user if we were actively loading (not during background polling)
      if (showLoading) {
        // More helpful error message based on error type
        if (err.message?.includes('authentication token')) {
          setError('Authenticating... Please wait.');
        } else {
          setError('Failed to load conversations. Please try again.');
        }
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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

  // Define polling functions first
  const stopMessagePolling = useCallback(() => {
    setMessagePollingInterval(prevInterval => {
      if (prevInterval) {
        clearInterval(prevInterval);
      }
      return null;
    });
  }, []);

  const startMessagePolling = useCallback((conversationId) => {
    // Clear existing interval first
    setMessagePollingInterval(prevInterval => {
      if (prevInterval) {
        clearInterval(prevInterval);
      }
      return null;
    });

    // Start new polling interval
    const interval = setInterval(async () => {
      try {
        const messageList = await apiClient.getConversationMessages(conversationId, 20, 0);
        const reversedMessages = messageList.reverse();

        // Smart update: merge server messages with local state, preserving edits
        setMessages(prevMessages => {
          // If no local messages, just use server messages
          if (prevMessages.length === 0) {
            return reversedMessages;
          }

          // If server has more messages (new messages added), use server messages
          if (reversedMessages.length > prevMessages.length) {
            return reversedMessages;
          }

          // If server has fewer messages (messages were deleted), use server messages
          if (reversedMessages.length < prevMessages.length) {
            return reversedMessages;
          }

          // Same length - merge by checking for edits and updates
          // Create a map of server messages by ID
          const serverMessagesMap = new Map(
            reversedMessages.map(msg => [msg.id, msg])
          );

          // Update existing messages with server data
          const updatedMessages = prevMessages
            .filter(localMsg => serverMessagesMap.has(localMsg.id)) // Remove deleted messages
            .map(localMsg => {
              const serverMsg = serverMessagesMap.get(localMsg.id);
              // Use server message data (includes edits from other users or confirmed edits)
              return serverMsg;
            });

          // Check if anything actually changed (content or count)
          if (updatedMessages.length !== prevMessages.length) {
            return updatedMessages;
          }

          const hasChanges = updatedMessages.some((msg, idx) => {
            const prevMsg = prevMessages[idx];
            return !prevMsg ||
                   msg.id !== prevMsg.id ||
                   msg.body !== prevMsg.body ||
                   msg.edited_at !== prevMsg.edited_at;
          });

          return hasChanges ? updatedMessages : prevMessages;
        });
      } catch (err) {
        // If we get a 403 or 404 during polling, user lost access to conversation
        if (err.message && (err.message.includes('404') || err.message.includes('403'))) {
          console.log('Lost access to conversation during polling, removing from list');

          // Stop polling
          setMessagePollingInterval(prevInterval => {
            if (prevInterval) {
              clearInterval(prevInterval);
            }
            return null;
          });

          // Remove conversation from list
          setConversations(prevConversations =>
            prevConversations.filter(conv => conv.id !== conversationId)
          );
          setSelectedConversation(null);
          setMessages([]);
          setMessagesError('You no longer have access to this conversation.');
        }
      }
    }, 3000);

    setMessagePollingInterval(interval);
  }, []);

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

      // If we get a 403 or 404, the user no longer has access to this conversation
      // (e.g., they were removed from a group). Remove it from the local state.
      if (err.message && (err.message.includes('403') || err.message.includes('404'))) {
        console.log('User no longer has access to conversation, removing from list');
        setConversations(prevConversations =>
          prevConversations.filter(conv => conv.id !== conversationId)
        );
        setSelectedConversation(null);
        setMessages([]);
        setMessagesError('You no longer have access to this conversation.');
      } else if (showLoading) {
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

  // Send a budget
  const handleSendBudget = async (budget) => {
    if (!selectedConversation) {
      console.error('No conversation selected');
      throw new Error('No conversation selected');
    }

    try {
      console.log('Sending budget:', budget);

      const newMessage = await apiClient.sendMessage(selectedConversation.id, {
        body: `Shared a budget: ${budget.budget.goal_name || 'Budget'}`,
        message_type: 'budget',
        metadata: {
          budget: budget.budget
        }
      });

      console.log('Budget sent successfully:', newMessage);

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
    } catch (error) {
      console.error('Error sending budget:', error);
      throw new Error('Failed to send budget. Please try again.');
    }
  };

  // Save a budget
  const handleSaveBudget = async (budgetData) => {
    try {
      await apiClient.post('/user/me/budgets', {
        budget_data: budgetData
      });

      alert('Budget saved successfully! Refreshing dashboard...');

      // Refresh the page to show the new budget on the dashboard
      window.location.reload();
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget. Please try again.');
      throw error;
    }
  };

  // Edit and save a budget
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);

  const handleEditBudget = (budgetData) => {
    setBudgetToEdit(budgetData);
    setShowBudgetEditor(true);
  };

  const handleSaveEditedBudget = async (editedBudget) => {
    try {
      await apiClient.post('/user/me/budgets', {
        budget_data: editedBudget
      });

      setShowBudgetEditor(false);
      setBudgetToEdit(null);
      alert('Budget saved successfully!');
    } catch (error) {
      console.error('Error saving edited budget:', error);
      alert('Failed to save budget. Please try again.');
      throw error;
    }
  };

  // Edit a message
  const handleEditMessage = async (messageId, newBody) => {
    if (!selectedConversation) {
      console.error('No conversation selected');
      return;
    }

    // Optimistically update the message immediately
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, body: newBody, edited_at: new Date().toISOString() }
          : msg
      )
    );

    try {
      const updatedMessage = await apiClient.editMessage(selectedConversation.id, messageId, {
        body: newBody
      });

      // Update with the actual server response (which includes the real edited_at timestamp)
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? updatedMessage : msg
        )
      );
    } catch (err) {
      console.error('Error editing message:', err);
      setMessagesError('Failed to edit message. Please try again.');

      // Reload messages to revert the optimistic update
      await loadMessages(selectedConversation.id, false);
    }
  };

  // Delete a message
  const handleDeleteMessage = async (messageId) => {
    if (!selectedConversation) {
      console.error('No conversation selected');
      return;
    }

    // Store the message in case we need to restore it
    const messageToDelete = messages.find(msg => msg.id === messageId);

    // Optimistically remove the message immediately
    setMessages(prevMessages =>
      prevMessages.filter(msg => msg.id !== messageId)
    );

    try {
      await apiClient.deleteMessage(selectedConversation.id, messageId);
      // Message successfully deleted on server, local state already updated
    } catch (err) {
      console.error('Error deleting message:', err);
      setMessagesError('Failed to delete message. Please try again.');

      // Restore the message if deletion failed
      if (messageToDelete) {
        setMessages(prevMessages => {
          // Insert the message back in its original position
          const newMessages = [...prevMessages];
          const insertIndex = prevMessages.findIndex(msg => msg.id > messageId);
          if (insertIndex === -1) {
            newMessages.push(messageToDelete);
          } else {
            newMessages.splice(insertIndex, 0, messageToDelete);
          }
          return newMessages;
        });
      }
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
      // For group chats, show the group name
      return conversation.group_name || 'Group Chat';
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
            <p className="text-gray-600">Communicate with other users and group members.</p>
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
              onClick={() => setShowJoinGroupModal(true)}
              className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Users className="h-4 w-4 mr-2" />
              Join Group
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
                <div
                  className={`p-4 border-b border-gray-200 ${
                    selectedConversation.kind === 'group' ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
                  }`}
                  onClick={() => {
                    if (selectedConversation.kind === 'group' && selectedConversation.group_id) {
                      setSelectedGroupId(selectedConversation.group_id);
                      setShowGroupDetailsModal(true);
                    }
                  }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    {getConversationTitle(selectedConversation)}
                    {selectedConversation.kind === 'group' && (
                      <User className="h-4 w-4 ml-2 text-gray-400" />
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatConversationPreview(selectedConversation)}
                    {selectedConversation.kind === 'group' && (
                      <span className="text-xs text-blue-600 ml-2">Click to view members</span>
                    )}
                  </p>
                </div>
                
                {/* Messages Area */}
                <MessageList
                  messages={messages}
                  loading={messagesLoading}
                  error={messagesError}
                  conversationType={selectedConversation.kind}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onSaveBudget={handleSaveBudget}
                  onEditBudget={handleEditBudget}
                />
                
                {/* Message Input */}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onSendBudget={handleSendBudget}
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
          console.log('Group joined! Refreshing groups data...');
          if (onGroupJoined) {
            onGroupJoined();
          }
        }}
      />

      {/* Enhanced Group Invite Modal */}
      <EnhancedGroupInviteModal
        isOpen={showGroupInviteManager}
        onClose={() => setShowGroupInviteManager(false)}
      />

      {/* Join Group Modal */}
      <JoinGroupModal
        isOpen={showJoinGroupModal}
        onClose={() => setShowJoinGroupModal(false)}
        onGroupJoined={() => {
          console.log('Group joined! Refreshing conversations and groups...');
          loadConversations();
          if (onGroupJoined) {
            onGroupJoined();
          }
        }}
      />

      {/* Group Details Modal */}
      <GroupDetailsModal
        isOpen={showGroupDetailsModal}
        onClose={() => {
          setShowGroupDetailsModal(false);
          setSelectedGroupId(null);
        }}
        groupId={selectedGroupId}
        onGroupLeft={async () => {
          // Refresh conversations when user leaves group
          await loadConversations();
          setSelectedConversation(null);
          if (onGroupJoined) {
            onGroupJoined();
          }
        }}
        onMemberRemoved={async () => {
          // Refresh conversations when a member is removed
          await loadConversations();
        }}
      />

      {/* Budget Editor Modal */}
      <BudgetEditor
        isOpen={showBudgetEditor}
        onClose={() => {
          setShowBudgetEditor(false);
          setBudgetToEdit(null);
        }}
        budgetData={budgetToEdit}
        onSave={handleSaveEditedBudget}
      />
    </div>
  );
};

// Plaid Bank Account Manager Component
const PlaidBankAccountManager = ({ userData, onAccountsChange }) => {
  const [connectedTokens, setConnectedTokens] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchConnectedAccounts = useCallback(async () => {
    try {
      setLoading(true);
      // console.log('Fetching connected tokens and accounts...');
      
      // Get aggregated accounts from all tokens - this endpoint works reliably
      const accounts = await apiClient.getUserAccounts();
      // console.log('API returned aggregated accounts:', accounts);
      setAllAccounts(accounts || []);
      
      // Get all Plaid tokens
      const tokens = await apiClient.getAllPlaidTokens();
      // console.log('API returned tokens:', tokens);
      setConnectedTokens(tokens || []);
      
      setError(null);
      
      // Notify parent component of account count change
      if (onAccountsChange) {
        onAccountsChange(accounts?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching connected accounts:', err);
      setConnectedTokens([]);
      setAllAccounts([]);
      setError('Failed to load connected accounts. Please try refreshing the page.');
      
      // Notify parent even on error
      if (onAccountsChange) {
        onAccountsChange(0);
      }
    } finally {
      setLoading(false);
    }
  }, [onAccountsChange]);

  useEffect(() => {
    if (user) {
      fetchConnectedAccounts();
    }
  }, [user, fetchConnectedAccounts]);

  const handlePlaidSuccess = async (success, itemId) => {
    try {
      // Token is now stored automatically server-side via exchange-token route
      // console.log('Successfully added Plaid connection');
      
      // Refresh the accounts list after successful connection
      await fetchConnectedAccounts();
    } catch (err) {
      console.error('Error adding Plaid token:', err);
      // Still refresh to see if it worked anyway
      await fetchConnectedAccounts();
    }
  };

  const handleUnlinkAccount = async (tokenReference) => {
    // Enhanced confirmation dialog
    const confirmed = confirm(
      `Are you sure you want to disconnect this bank institution?\n\n` +
      `This will:\n` +
      `• Remove all accounts from this bank\n` +
      `• Stop syncing transaction data\n` +
      `• Affect any budgets or goals using this data\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Unlinking bank connection...');
      
      // Use the API client with the token reference (already in correct format)
      await apiClient.deletePlaidToken(tokenReference);
      
      console.log('Bank connection unlinked successfully');
      
      // Refresh from backend to ensure sync
      await fetchConnectedAccounts();
      
      // Success message
      setError(null);
      alert('Bank institution successfully unlinked. You can add a new bank connection at any time.');
      
    } catch (err) {
      console.error('Error unlinking bank institution:', err);
      const errorMessage = err.message || 'Please try again later.';
      setError(`Failed to unlink bank institution: ${errorMessage}`);
      
      // Refresh from backend even on error to sync state
      await fetchConnectedAccounts();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <p className="text-gray-600 text-sm">
          Manage your connected bank accounts with Plaid. You can link new accounts or remove existing connections.
        </p>
      </div>

      {/* Connected Tokens and Accounts */}
      {connectedTokens.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Connected Bank Institutions ({connectedTokens.length})
          </h4>
          
          {/* Group accounts by token/institution */}
          <div className="space-y-4">
            {(() => {
              // Group accounts by token reference
              const accountsByToken = new Map();
              allAccounts.forEach(account => {
                const tokenRef = account.plaid_token_id;
                if (!accountsByToken.has(tokenRef)) {
                  accountsByToken.set(tokenRef, []);
                }
                accountsByToken.get(tokenRef).push(account);
              });
              
              return Array.from(accountsByToken.entries()).map(([tokenRef, accounts], index) => (
                <div key={tokenRef || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">
                        {accounts[0]?.institution_name || `Bank Institution ${index + 1}`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnlinkAccount(tokenRef)}
                      className="text-red-600 hover:text-red-800 transition-colors p-1"
                      title="Disconnect this bank institution"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Show accounts for this institution */}
                  <div className="ml-7">
                    {accounts.map((account) => (
                      <div key={account.account_id} className="p-2 bg-white rounded border mb-2">
                        <p className="font-medium text-gray-900 text-sm">{account.account_name}</p>
                        <p className="text-xs text-gray-600">
                          {account.account_type} {account.account_subtype && `• ${account.account_subtype}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Balance: ${Math.abs(account.current_balance).toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
          
          {/* Summary of all accounts */}
          {allAccounts.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">
                Total: {allAccounts.length} accounts across {new Set(allAccounts.map(a => a.plaid_token_id)).size} bank institutions
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No bank accounts connected</p>
        </div>
      )}

      {/* Add New Account */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Link New Account</h4>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Plus className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">Connect with Plaid</span>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            Securely connect a new bank account to track your finances and manage your budgets.
          </p>
          {user && (
            <PlaidLink 
              key={`plaid-link-${user.uid}`} // Unique key to prevent script duplication
              userId={user.uid} 
              onSuccess={handlePlaidSuccess}
              redirectAfterSuccess={false}
              includeLiabilities={false}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

// Profile Section
export const ProfileSection = ({ userData, onUserDataUpdate }) => {
  const [showPlaidManager, setShowPlaidManager] = useState(false);
  const [connectedAccountsCount, setConnectedAccountsCount] = useState(null);
  const [userGroupsCount, setUserGroupsCount] = useState(0);
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

  // Onboarding integration
  const { resetOnboarding, startOnboarding } = useOnboarding();

  // Fetch connected accounts count for the overview
  useEffect(() => {
    if (user) {
      // Fetch connected accounts count
      apiClient.get('/users/me/accounts')
        .then(accounts => setConnectedAccountsCount(accounts?.length || 0))
        .catch(() => setConnectedAccountsCount(0));
      
      // Fetch user's groups count
      apiClient.getUserGroups()
        .then(groups => setUserGroupsCount(groups?.length || 0))
        .catch(() => setUserGroupsCount(0));
    }
  }, [user]);

  // Handle account count updates from PlaidBankAccountManager
  const handleAccountsChange = (count) => {
    setConnectedAccountsCount(count);
  };

  // Initialize edit form when userData changes
  useEffect(() => {
    if (userData || user) {
      setEditForm({
        firstname: userData?.firstname || '',
        lastname: userData?.lastname || '',
        email: user?.email || userData?.email || ''
      });
    }
  }, [userData, user]);

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
      firstname: userData?.firstname || '',
      lastname: userData?.lastname || '',
      email: user?.email || userData?.email || ''
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

      // Update profile in backend database
      const updatedUser = await apiClient.put('/users/me/profile', {
        firstname: editForm.firstname,
        lastname: editForm.lastname
      });

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Update parent component's userData if callback provided
      if (onUserDataUpdate) {
        onUserDataUpdate({
          ...userData,
          firstname: editForm.firstname,
          lastname: editForm.lastname
        });
      }
      
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

  const handleRestartOnboarding = () => {
    if (confirm('This will restart the setup tutorial. Are you sure?')) {
      resetOnboarding();
      startOnboarding();
    }
  };

  const handleDeleteAccount = async () => {
    // Multi-step confirmation process
    const firstConfirm = confirm(
      '⚠️ WARNING: Delete Account\n\n' +
      'This will PERMANENTLY delete your account and ALL associated data:\n\n' +
      '• All financial data and transactions\n' +
      '• All budgets and goals\n' +
      '• All bank account connections\n' +
      '• All group memberships and conversations\n' +
      '• All advisor/client relationships\n\n' +
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
      'This will permanently delete your account and all data.'
    );

    if (deleteConfirmation !== 'DELETE') {
      alert('Account deletion cancelled. You must type "DELETE" exactly to confirm.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Show progress message
      alert('Deleting your account... This may take a few moments.');

      // Call the delete API
      const result = await apiClient.deleteUserAccount();

      // Show success message with cleanup summary
      const cleanupSummary = result.cleanup_summary || {};
      const successMessage = `
Account successfully deleted!

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
      console.error('Error deleting account:', err);

      let errorMessage = 'Failed to delete account. Please try again.';

      if (err.message.includes('404')) {
        errorMessage = 'Account not found. You may already be signed out.';
      } else if (err.message.includes('500')) {
        errorMessage = 'Server error occurred. Please contact support if this persists.';
      } else if (err.message) {
        errorMessage = `Delete failed: ${err.message}`;
      }

      setError(errorMessage);
      alert(`Account deletion failed!\n\n${errorMessage}\n\nIf you continue to experience issues, please contact support.`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences.</p>
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
                    value={isEditing ? editForm.firstname : (userData?.firstname || '')}
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
                    value={isEditing ? editForm.lastname : (userData?.lastname || '')}
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
                  value={isEditing ? editForm.email : (user?.email || userData?.email || 'No email available')}
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
                    <p className="text-sm text-gray-600">Receive updates about your financial goals</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Spending Alerts</p>
                    <p className="text-sm text-gray-600">Get notified when approaching budget limits</p>
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

        {/* Subscription Status */}
        <div className="space-y-6">
          <SubscriptionStatus userId={user?.uid} groupCount={userGroupsCount} />

          {/* Account Overview */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Account Type</span>
                <span className="font-medium text-gray-900">Individual</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium text-gray-900">August 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Connected Accounts</span>
                <span className="font-medium text-gray-900">
                  {connectedAccountsCount !== null ? connectedAccountsCount : '...'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setShowPlaidManager(!showPlaidManager)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Bank Accounts
              </button>
              <button 
                onClick={handleRestartOnboarding}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart Tutorial
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Change Password
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Export Data
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
      
      {/* Plaid Bank Account Management Panel */}
      {showPlaidManager && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bank Account Management</h3>
            <button 
              onClick={() => setShowPlaidManager(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          </div>
          
          <PlaidBankAccountManager userData={userData} onAccountsChange={handleAccountsChange} />
        </div>
      )}
    </div>
  );
};

// Remove GroupSection export since it's now a separate component
// export { MessagesSection, GroupSection, ProfileSection }; // OLD
// export { MessagesSection, ProfileSection }; // NEW