import React, { useState } from 'react';
import { X, Users, KeyRound, AlertCircle } from 'lucide-react';
import apiClient from '../../../lib/apiClient';

const JoinGroupModal = ({ isOpen, onClose, onGroupJoined }) => {
  const [joinGroupCode, setJoinGroupCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Clear state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setJoinGroupCode('');
      setError('');
      setSuccess('');
      setIsJoining(false);
    }
  }, [isOpen]);

  const handleJoinGroup = async () => {
    try {
      setIsJoining(true);
      setError('');
      setSuccess('');

      if (!joinGroupCode.trim()) {
        setError('Please enter a group invitation code.');
        return;
      }

      const result = await apiClient.joinGroupByCode(joinGroupCode.trim());
      
      setSuccess(`Successfully joined group: ${result.group_name || 'the group'}!`);
      
      // Refresh groups list in parent component
      if (onGroupJoined) {
        onGroupJoined();
      }

      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      // Handle specific error messages
      if (err.message.includes('404') || err.message.includes('not found')) {
        setError('Invalid invitation code. Please check and try again.');
      } else if (err.message.includes('already a member') || err.message.includes('already the owner')) {
        setError('You are already a member of this group.');
      } else if (err.message.includes('expired')) {
        setError('This invitation code has expired.');
      } else if (err.message.includes('max uses') || err.message.includes('reached')) {
        setError('This invitation code has reached its maximum number of uses.');
      } else if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
        // This will catch the error we just fixed - but show user-friendly message
        setError('You may already be a member of this group, or there was a server issue. Please try refreshing the page.');
      } else {
        setError(err.message || 'Failed to join group. Please try again.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && joinGroupCode.trim() && !isJoining) {
      handleJoinGroup();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Join Group</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isJoining}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Enter the invitation code shared by a group member to join their group and start collaborating on financial goals.
          </p>

          {/* Invitation Code Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <KeyRound className="h-4 w-4 mr-2 text-gray-500" />
                Group Invitation Code
              </div>
            </label>
            <input
              type="text"
              placeholder="Enter invitation code (e.g., ABC-123-XYZ)"
              value={joinGroupCode}
              onChange={(e) => setJoinGroupCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-400 font-mono text-center text-lg tracking-wider"
              disabled={isJoining}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              The invitation code is provided by the person who invited you to the group.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start">
                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-green-700 font-medium">{success}</p>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">What happens when you join?</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You'll become a member of the group</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can collaborate on financial goals and budgets</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can communicate with other group members</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You'll have access to shared financial insights</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isJoining}
            >
              Cancel
            </button>
            <button
              onClick={handleJoinGroup}
              disabled={!joinGroupCode.trim() || isJoining}
              className="flex-1 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isJoining ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </span>
              ) : (
                'Join Group'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinGroupModal;

