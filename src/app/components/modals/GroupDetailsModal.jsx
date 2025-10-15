'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Crown, LogOut, UserMinus, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import apiClient from '../../../lib/apiClient';

const GroupDetailsModal = ({ isOpen, onClose, groupId, onGroupLeft, onMemberRemoved }) => {
  const { user } = useAuth();
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'leave' | 'remove', memberId: string }

  useEffect(() => {
    if (isOpen && groupId) {
      loadGroupMembers();
    }
  }, [isOpen, groupId]);

  const loadGroupMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getGroupMembers(groupId);
      setGroupData(data);
    } catch (err) {
      setError('Failed to load group members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      setActionLoading(true);
      setError('');
      await apiClient.leaveGroup(groupId);

      // Notify parent and close modal
      if (onGroupLeft) {
        onGroupLeft();
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to leave group. Please try again.');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleRemoveMember = async (memberFirebaseUid) => {
    try {
      setActionLoading(true);
      setError('');
      await apiClient.removeGroupMember(groupId, memberFirebaseUid);

      // Reload group members
      await loadGroupMembers();
      setConfirmAction(null);

      // Notify parent to refresh conversations
      if (onMemberRemoved) {
        onMemberRemoved();
      }
    } catch (err) {
      setError(err.message || 'Failed to remove member. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              {groupData?.group_name || 'Group Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading group members...</span>
            </div>
          ) : (
            <>
              {/* Members List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Members ({groupData?.members?.length || 0})
                </h3>

                {groupData?.members?.map((member) => (
                  <div
                    key={member.firebase_uid}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-semibold">
                          {member.firstname.charAt(0)}{member.lastname.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium text-gray-900">
                            {member.firstname} {member.lastname}
                          </p>
                          {member.is_owner && (
                            <Crown className="h-4 w-4 text-yellow-500 ml-2" />
                          )}
                          {member.is_current_user && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {member.is_owner ? 'Group Owner' : 'Member'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div>
                      {/* Current user sees leave button (if not owner) */}
                      {member.is_current_user && !member.is_owner && (
                        <button
                          onClick={() => setConfirmAction({ type: 'leave' })}
                          disabled={actionLoading}
                          className="flex items-center px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          Leave
                        </button>
                      )}

                      {/* Owner sees remove button for other members */}
                      {groupData?.current_user_is_owner && !member.is_current_user && !member.is_owner && (
                        <button
                          onClick={() => setConfirmAction({ type: 'remove', member })}
                          disabled={actionLoading}
                          className="flex items-center px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {groupData?.members?.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No members in this group.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {confirmAction.type === 'leave' ? 'Leave Group?' : 'Remove Member?'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction.type === 'leave'
                ? 'Are you sure you want to leave this group? You will no longer have access to group conversations and shared data.'
                : `Are you sure you want to remove ${confirmAction.member?.firstname} ${confirmAction.member?.lastname} from this group?`}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'leave') {
                    handleLeaveGroup();
                  } else {
                    handleRemoveMember(confirmAction.member.firebase_uid);
                  }
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  confirmAction.type === 'leave' ? 'Leave Group' : 'Remove Member'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetailsModal;
