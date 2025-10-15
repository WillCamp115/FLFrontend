import React, { useState, useEffect } from 'react';
import { Users, Plus, Settings, MessageSquare, RefreshCw } from 'lucide-react';
import GroupDashboard from './GroupDashboard';
import EnhancedGroupInviteModal from '../modals/EnhancedGroupInviteModal';
import CreateGroupModal from '../modals/CreateGroupModal';
import GroupInviteManager from '../invitations/GroupInviteManager';
import apiClient from '../../../lib/apiClient';

const GroupsSection = ({ className = '', onGroupsChange }) => {
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, invitations
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserGroups();
  }, []);

  // Refresh groups when page comes back into focus (in case they joined via another tab)
  useEffect(() => {
    const handleFocus = () => {
      loadUserGroups();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Auto-refresh groups every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadUserGroups();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadUserGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const groups = await apiClient.getUserGroups();
      setUserGroups(groups);
      
      // Notify parent component of groups change
      if (onGroupsChange) {
        onGroupsChange(groups);
      }
      
      // Auto-select first group if available
      if (groups.length > 0 && !selectedGroup) {
        setSelectedGroup(groups[0]);
      }
    } catch (err) {
      console.error('Error loading user groups:', err);
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    setShowCreateGroupModal(true);
  };

  const handleGroupCreated = (newGroup) => {
    // Refresh the groups list
    loadUserGroups();
    // Select the newly created group
    setSelectedGroup(newGroup);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-300 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't return early - let the component render the full structure

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Groups</h2>
                <p className="text-sm text-gray-600">Collaborative budgeting with shared accounts</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleCreateGroup}
                className="flex items-center px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Group
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Send Invite
              </button>
            </div>
          </div>

          {/* Group Selection */}
          {userGroups.length > 1 && (
            <div className="flex space-x-2 mb-4">
              {userGroups.map(group => (
                <button
                  key={group.group_id}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    selectedGroup?.group_id === group.group_id
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {group.group_name}
                </button>
              ))}
            </div>
          )}

          {/* Tabs - Only show when there are groups */}
          {userGroups.length > 0 && (
            <div className="flex space-x-4 border-b">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="h-4 w-4 mr-1 inline" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'invitations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="h-4 w-4 mr-1 inline" />
                Invitations
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-0">
          {error && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <div className="h-5 w-5 text-red-500 mr-2">⚠</div>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {userGroups.length === 0 ? (
            <div className="p-6">
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Yet</h3>
                <p className="text-gray-600 mb-6">
                  Create or join a group to start collaborative budgeting with others.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleCreateGroup}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Group
                  </button>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Join via Invite
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && selectedGroup && (
                <div className="p-0">
                  <GroupDashboard
                    groupId={selectedGroup.group_id}
                    groupName={selectedGroup.group_name}
                    className="border-0 shadow-none rounded-none"
                  />
                </div>
              )}

              {activeTab === 'invitations' && (
                <div className="p-0">
                  <GroupInviteManager className="border-0 shadow-none rounded-none" />
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Your Groups Section - Always visible at bottom */}
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Your Groups</h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {userGroups.length}
                </span>
              </div>
              <button
                onClick={loadUserGroups}
                disabled={loading}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                title="Refresh groups"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {userGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h4>
                <p className="text-gray-600 mb-4">
                  Join a group using an invite code or create your own group to get started.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Join Group
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userGroups.map(group => (
                  <div
                    key={group.group_id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedGroup?.group_id === group.group_id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{group.group_name}</h4>
                        <p className="text-sm text-gray-500">Group ID: {group.group_id}</p>
                      </div>
                      {selectedGroup?.group_id === group.group_id && (
                        <div className="text-blue-600">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Group Invite Modal */}
      <EnhancedGroupInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </>
  );
};

export default GroupsSection;