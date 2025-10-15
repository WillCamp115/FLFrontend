import React, { useState, useEffect } from 'react';
import { X, Users, Copy, Check, Plus } from 'lucide-react';
import apiClient from '../../../lib/apiClient';

const GroupInviteManager = ({ isOpen, onClose }) => {
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteCodes, setInviteCodes] = useState({});
  const [copiedCodes, setCopiedCodes] = useState({});
  const [creatingInvite, setCreatingInvite] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadUserGroups();
    }
  }, [isOpen]);

  const loadUserGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const groups = await apiClient.getUserGroups();
      setUserGroups(groups);
    } catch (err) {
      console.error('Error loading user groups:', err);
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createGroupInvite = async (groupId) => {
    try {
      setCreatingInvite(prev => ({ ...prev, [groupId]: true }));
      setError('');
      
      const result = await apiClient.createGroupInvite(groupId);
      
      setInviteCodes(prev => ({
        ...prev,
        [groupId]: result.invitation_code
      }));

      // Auto-copy to clipboard
      await copyToClipboard(result.invitation_code, groupId);
      
    } catch (err) {
      console.error('Error creating group invite:', err);
      setError('Failed to create invitation. Please try again.');
    } finally {
      setCreatingInvite(prev => ({ ...prev, [groupId]: false }));
    }
  };

  const copyToClipboard = async (code, groupId) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodes(prev => ({ ...prev, [groupId]: true }));
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedCodes(prev => ({ ...prev, [groupId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Manage Group Invitations</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading groups...</span>
            </div>
          ) : userGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-2">No groups found</p>
              <p className="text-sm">Create a group first to generate invitations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Create invitation codes for your groups to share with others.
              </p>
              
              {userGroups.map(group => (
                <div key={group.group_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{group.group_name}</h3>
                      <p className="text-xs text-gray-500">Group ID: {group.group_id}</p>
                    </div>
                    <button
                      onClick={() => createGroupInvite(group.group_id)}
                      disabled={creatingInvite[group.group_id]}
                      className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {creatingInvite[group.group_id] ? 'Creating...' : 'Create Invite'}
                    </button>
                  </div>

                  {inviteCodes[group.group_id] && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-2">
                          <p className="text-xs text-gray-600 mb-1">Invitation Code:</p>
                          <code className="text-sm font-mono text-gray-800 break-all">
                            {inviteCodes[group.group_id]}
                          </code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(inviteCodes[group.group_id], group.group_id)}
                          className={`flex items-center px-2 py-1 text-xs rounded transition-colors ${
                            copiedCodes[group.group_id]
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {copiedCodes[group.group_id] ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Share this code with people you want to invite to the group.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupInviteManager;