import React, { useState, useEffect } from 'react';
import { X, Search, User, Users, MessageCircle, Plus } from 'lucide-react';
import apiClient from '../../../lib/apiClient';

const UserInviteModal = ({ isOpen, onClose, onStartConversation, onGroupJoined }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [debugUsers, setDebugUsers] = useState([]);
  const [conversationMode, setConversationMode] = useState('direct'); // 'direct', 'group'
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Clear state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setError('');
      setIsCreating(false);
      setDebugUsers([]);
      setConversationMode('direct');
      setSelectedGroup(null);
      loadUserGroups();
    }
  }, [isOpen]);

  // Load user's groups
  const loadUserGroups = async () => {
    try {
      setLoadingGroups(true);
      const groups = await apiClient.getUserGroups();
      setUserGroups(groups);
    } catch (err) {
      // Silent fail - groups will remain empty
    } finally {
      setLoadingGroups(false);
    }
  };

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        setError('');
        const results = await apiClient.searchUsers(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        setError('Failed to search users. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserSelect = (user) => {
    const isAlreadySelected = selectedUsers.some(u => u.firebase_uid === user.firebase_uid);
    
    if (isAlreadySelected) {
      setSelectedUsers(selectedUsers.filter(u => u.firebase_uid !== user.firebase_uid));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleStartConversation = async () => {
    try {
      setIsCreating(true);
      setError('');

      if (conversationMode === 'group' && selectedGroup) {
        // Create conversation for existing group
        const conversationData = {
          kind: 'group',
          participant_ids: [], // Will be populated from group members
          group_id: selectedGroup.group_id
        };

        const conversation = await apiClient.createConversation(conversationData);
        
        if (onStartConversation) {
          onStartConversation(conversation);
        }
      } else {
        // Create direct or ad-hoc group conversation
        if (selectedUsers.length === 0) {
          setError('Please select at least one user to start a conversation.');
          return;
        }

        const conversationData = {
          kind: selectedUsers.length === 1 ? 'direct' : 'group',
          participant_ids: selectedUsers.map(user => user.firebase_uid),
          group_id: null
        };

        const conversation = await apiClient.createConversation(conversationData);
        
        if (onStartConversation) {
          onStartConversation(conversation);
        }
      }

      // Close the modal
      onClose();
    } catch (err) {
      setError('Failed to start conversation. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveSelected = (userToRemove) => {
    setSelectedUsers(selectedUsers.filter(u => u.firebase_uid !== userToRemove.firebase_uid));
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Start New Conversation</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isCreating}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Mode Selection */}
          <div className="flex space-x-2">
            <button
              onClick={() => setConversationMode('direct')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                conversationMode === 'direct' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={isCreating}
            >
              Direct/Group Chat
            </button>
            <button
              onClick={() => setConversationMode('group')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                conversationMode === 'group' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={isCreating}
            >
              From Existing Group
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Existing Group Mode */}
          {conversationMode === 'group' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Group
              </label>
              {loadingGroups ? (
                <div className="flex items-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-gray-600">Loading groups...</span>
                </div>
              ) : userGroups.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No groups found. Create a group first to use this option.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {userGroups.map(group => (
                    <div
                      key={group.group_id}
                      onClick={() => setSelectedGroup(group)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedGroup?.group_id === group.group_id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      disabled={isCreating}
                    >
                      <p className="font-medium text-gray-900">{group.group_name}</p>
                      <p className="text-xs text-gray-500">Group ID: {group.group_id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Direct/Group Chat Mode - Search Input */}
          {conversationMode === 'direct' && (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isCreating}
                  />
                </div>
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                  <p className="text-sm text-gray-500 mt-1">Type at least 2 characters to search</p>
                )}
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Selected ({selectedUsers.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div
                        key={user.firebase_uid}
                        className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <User className="h-3 w-3 mr-1" />
                        {user.firstname} {user.lastname}
                        <button
                          onClick={() => handleRemoveSelected(user)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          disabled={isCreating}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Searching...</span>
                </div>
              )}

              {!isSearching && searchQuery.trim().length >= 2 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Search Results
                  </h3>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No users found matching "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map(user => {
                        const isSelected = selectedUsers.some(u => u.firebase_uid === user.firebase_uid);
                        return (
                          <div
                            key={user.firebase_uid}
                            onClick={() => handleUserSelect(user)}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border-blue-200 text-blue-900'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-900'
                            }`}
                            disabled={isCreating}
                          >
                            <div className="flex items-center flex-1">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                                isSelected ? 'bg-blue-200' : 'bg-gray-300'
                              }`}>
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{user.firstname} {user.lastname}</p>
                                <p className="text-xs text-gray-500">ID: {user.id}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="text-blue-600">
                                <Plus className="h-4 w-4 transform rotate-45" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Instructions for direct mode */}
              {searchQuery.trim().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="mb-1">Start typing to search for users</p>
                  <p className="text-sm">You can select multiple users for group conversations</p>
                </div>
              )}
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            {conversationMode === 'direct' && selectedUsers.length === 1 && (
              <>
                <MessageCircle className="h-4 w-4 mr-1" />
                Direct Message
              </>
            )}
            {conversationMode === 'direct' && selectedUsers.length > 1 && (
              <>
                <Users className="h-4 w-4 mr-1" />
                Group Chat ({selectedUsers.length + 1} members)
              </>
            )}
            {conversationMode === 'group' && selectedGroup && (
              <>
                <Users className="h-4 w-4 mr-1" />
                Group: {selectedGroup.group_name}
              </>
            )}
            {conversationMode === 'join-by-code' && (
              <>
                <Users className="h-4 w-4 mr-1" />
                Join Group
              </>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              onClick={handleStartConversation}
              disabled={
                (conversationMode === 'direct' && selectedUsers.length === 0) ||
                (conversationMode === 'group' && !selectedGroup) ||
                isCreating
              }
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Start Conversation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInviteModal;