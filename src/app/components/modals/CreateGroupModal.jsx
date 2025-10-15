import React, { useState } from 'react';
import { Users, Loader2, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import apiClient from '../../../lib/apiClient';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setGroupName('');
    setError('');
    onClose();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get user's database ID
      const userInfo = await apiClient.getCurrentUser();

      const groupData = {
        owner_id: userInfo.id,
        group_name: groupName.trim()
      };

      const newGroup = await apiClient.createGroup(groupData);

      // Call the success callback
      if (onGroupCreated) {
        onGroupCreated(newGroup);
      }

      // Reset and close
      setGroupName('');
      onClose();

    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && groupName.trim() && !loading) {
      handleCreateGroup();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Group" size="md">
      <div className="p-6">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-blue-100 rounded-full">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6 text-center">
          Create a new group to collaborate on budgeting and share accounts with others.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter a name for your group..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose a descriptive name that members will recognize
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateGroup}
              disabled={loading || !groupName.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Create Group
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateGroupModal;
