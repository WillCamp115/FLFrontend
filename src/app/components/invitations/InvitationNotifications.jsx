import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

const InvitationNotifications = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState({});

  useEffect(() => {
    fetchReceivedInvitations();
  }, []);

  const fetchReceivedInvitations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.getReceivedInvitations();
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error('Error fetching received invitations:', err);
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (invitationId, status) => {
    try {
      setResponding(prev => ({ ...prev, [invitationId]: true }));
      
      await apiClient.respondToInvitation(invitationId, status);
      
      // Refresh the invitations list
      await fetchReceivedInvitations();
      
      const statusText = status === 'accepted' ? 'accepted' : 'declined';
      // You could show a toast notification here instead of alert
      alert(`Invitation ${statusText} successfully!`);
      
    } catch (err) {
      console.error('Error responding to invitation:', err);
      alert('Failed to respond to invitation. Please try again.');
    } finally {
      setResponding(prev => ({ ...prev, [invitationId]: false }));
    }
  };

  const getInvitationTypeLabel = (type) => {
    switch (type) {
      case 'advisor_client':
        return 'Financial Advisor Connection';
      case 'group':
        return 'Group Invitation';
      default:
        return 'Invitation';
    }
  };

  const getInvitationDescription = (invitation) => {
    switch (invitation.invitation_type) {
      case 'advisor_client':
        return `${invitation.sender_name} wants to become your financial advisor. They will be able to view your financial data and provide guidance.`;
      case 'group':
        return `${invitation.sender_name} has invited you to join their financial group.`;
      default:
        return `${invitation.sender_name} has sent you an invitation.`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-gray-600">Loading invitations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show anything if no invitations
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <Bell className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">
          Pending Invitations ({invitations.length})
        </h3>
      </div>

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {getInvitationTypeLabel(invitation.invitation_type)}
                    </h4>
                    <p className="text-xs text-gray-500">
                      From {invitation.sender_name} • {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-4">
                  {getInvitationDescription(invitation)}
                </p>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleRespond(invitation.id, 'accepted')}
                    disabled={responding[invitation.id]}
                    className="flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {responding[invitation.id] ? 'Accepting...' : 'Accept'}
                  </button>
                  
                  <button
                    onClick={() => handleRespond(invitation.id, 'rejected')}
                    disabled={responding[invitation.id]}
                    className="flex items-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {responding[invitation.id] ? 'Declining...' : 'Decline'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvitationNotifications;
