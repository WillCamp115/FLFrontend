import React, { useState } from 'react';
import { X, Users, Trash2, LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { apiClient } from '../../../lib/apiClient';

const GroupManagementModal = ({ isOpen, onClose, groups, currentGroupId, currentUserId, onGroupAction }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [action, setAction] = useState(null); // 'leave' or 'delete'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [currentUserDbId, setCurrentUserDbId] = useState(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedGroup(null);
      setAction(null);
      setError('');
      setConfirmText('');
      fetchCurrentUserDbId();
    }
  }, [isOpen]);

  // Fetch current user's database ID for ownership comparison
  const fetchCurrentUserDbId = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setCurrentUserDbId(userData.id);
      console.log('Current user DB ID:', userData.id);
    } catch (err) {
      console.error('Failed to fetch current user DB ID:', err);
      setError('Failed to load user information');
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setAction(null);
    setError('');
    setConfirmText('');
  };

  const handleActionSelect = (actionType) => {
    setAction(actionType);
    setError('');
    setConfirmText('');
  };

  const handleConfirm = async () => {
    if (!selectedGroup || !action) return;

    // Validate confirmation text
    const expectedText = action === 'delete' ? 'DELETE' : 'LEAVE';
    if (confirmText !== expectedText) {
      setError(`Please type "${expectedText}" to confirm`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (action === 'leave') {
        await apiClient.leaveGroup(selectedGroup.group_id);
        onGroupAction('left', selectedGroup);
        onClose();
      } else if (action === 'delete') {
        await apiClient.deleteGroup(selectedGroup.group_id);
        onGroupAction('deleted', selectedGroup);
        onClose();
      }
    } catch (err) {
      console.error(`Error ${action}ing group:`, err);
      setError(err.message || `Failed to ${action} group. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = (group) => {
    // Compare the group's owner_id with the current user's database ID
    // Convert both to strings to handle potential type mismatches
    return group.owner_id && group.owner_id.toString() === currentUserDbId?.toString();
  };

  const canDelete = (group) => {
    // Only owners can delete groups
    return isOwner(group);
  };

  const canLeave = (group) => {
    // Owners cannot leave - they must delete the group instead
    // This prevents orphaned groups where owner_id points to a non-member
    return !isOwner(group);
  };

  const renderGroupSelection = () => (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Select Group to Manage</h3>
      <p className="text-sm text-gray-600 mb-6">
        Choose which group you want to leave or delete.
      </p>

      {!currentUserDbId && (
        <div className="flex items-center justify-center py-4 mb-6">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading user information...</span>
        </div>
      )}

      <div className="space-y-3">
        {groups.map(group => (
          <div
            key={group.group_id}
            onClick={() => handleGroupSelect(group)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedGroup?.group_id === group.group_id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{group.group_name}</h4>
                <p className="text-sm text-gray-600">
                  Created {new Date(group.date_created).toLocaleDateString()}
                </p>
                {isOwner(group) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                    You own this group
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {canLeave(group) && (
                  <span className="text-base font-semibold text-gray-700 bg-gray-200 px-4 py-2 rounded-lg">
                    Leave
                  </span>
                )}
                {canDelete(group) && (
                  <span className="text-base font-semibold text-red-700 bg-red-200 px-4 py-2 rounded-lg">
                    Delete
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedGroup && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setSelectedGroup(null)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  const renderActionSelection = () => (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Action</h3>
      <p className="text-sm text-gray-600 mb-6">
        What would you like to do with <strong>{selectedGroup?.group_name}</strong>?
      </p>

      <div className="space-y-6">
        {canLeave(selectedGroup) && (
          <button
            onClick={() => handleActionSelect('leave')}
            className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
              action === 'leave'
                ? 'border-orange-500 bg-orange-100 shadow-lg'
                : 'border-orange-300 hover:border-orange-400 hover:bg-orange-50'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-200 rounded-xl">
                <LogOut className="h-6 w-6 text-orange-700" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-orange-900">Leave Group</h4>
                <p className="text-base text-orange-700">
                  Remove yourself from this group. You can rejoin later if invited.
                </p>
              </div>
            </div>
          </button>
        )}

        {canDelete(selectedGroup) && (
          <button
            onClick={() => handleActionSelect('delete')}
            className={`w-full p-6 border-2 rounded-xl text-left transition-all ${
              action === 'delete'
                ? 'border-red-500 bg-red-100 shadow-lg'
                : 'border-red-300 hover:border-red-400 hover:bg-red-50'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-200 rounded-xl">
                <Trash2 className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-red-900">Delete Group</h4>
                <p className="text-base text-red-700">
                  Permanently delete this group and all its data. This action cannot be undone.
                </p>
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => {
            setAction(null);
            setSelectedGroup(null);
          }}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back
        </button>
        {action && (
          <button
            onClick={() => setAction(null)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  const renderConfirmation = () => {
    const isDelete = action === 'delete';
    const actionText = isDelete ? 'delete' : 'leave';
    const actionColor = isDelete ? 'red' : 'orange';
    const ActionIcon = isDelete ? Trash2 : LogOut;

    return (
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`p-2 bg-${actionColor}-100 rounded-lg`}>
            <AlertTriangle className={`h-6 w-6 text-${actionColor}-600`} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Confirm {isDelete ? 'Delete' : 'Leave'} Group
            </h3>
            <p className="text-sm text-gray-600">
              This action cannot be undone
            </p>
          </div>
        </div>

        <div className={`bg-${actionColor}-50 border border-${actionColor}-200 rounded-lg p-4 mb-6`}>
          <div className="flex items-start space-x-3">
            <ActionIcon className={`h-5 w-5 text-${actionColor}-600 mt-0.5`} />
            <div>
              <h4 className={`font-medium text-${actionColor}-900 mb-2`}>
                {isDelete ? 'Delete Group' : 'Leave Group'}
              </h4>
              <p className={`text-sm text-${actionColor}-800`}>
                {isDelete ? (
                  <>
                    You are about to permanently delete <strong>{selectedGroup?.group_name}</strong>.
                    This will remove all group data, shared accounts, and conversations.
                    All members will be removed from the group.
                  </>
                ) : (
                  <>
                    You are about to leave <strong>{selectedGroup?.group_name}</strong>.
                    You will no longer have access to group data and will need to be invited again to rejoin.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <strong>{isDelete ? 'DELETE' : 'LEAVE'}</strong> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={isDelete ? 'DELETE' : 'LEAVE'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setAction(null)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || confirmText !== (isDelete ? 'DELETE' : 'LEAVE')}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center ${
              isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ActionIcon className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Processing...' : `${isDelete ? 'Delete' : 'Leave'} Group`}
          </button>
        </div>
      </div>
    );
  };

  const getCurrentStep = () => {
    if (!selectedGroup) return 'group';
    if (!action) return 'action';
    return 'confirm';
  };

  const currentStep = getCurrentStep();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Groups" size="lg">
      {error && (
        <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {currentStep === 'group' && renderGroupSelection()}
      {currentStep === 'action' && renderActionSelection()}
      {currentStep === 'confirm' && renderConfirmation()}
    </Modal>
  );
};

export default GroupManagementModal;
