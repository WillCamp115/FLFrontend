import React, { useState, useEffect } from 'react';
import { Users, CreditCard, Check, X, Calendar, User, Building2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import apiClient from '../../../lib/apiClient';

const GroupInviteManager = ({ className = '' }) => {
  const [receivedInvites, setReceivedInvites] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingInvites, setProcessingInvites] = useState(new Set());

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [received, sent] = await Promise.all([
        apiClient.getReceivedGroupInvitations(),
        apiClient.getSentGroupInvitations()
      ]);
      
      setReceivedInvites(received);
      setSentInvites(sent);
    } catch (err) {
      console.error('Error loading invitations:', err);
      setError('Failed to load invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteResponse = async (inviteId, response) => {
    try {
      setProcessingInvites(prev => new Set([...prev, inviteId]));
      setError('');
      
      await apiClient.respondToGroupInvitation(inviteId, response);
      
      // Update the invitation status locally
      setReceivedInvites(prev =>
        prev.map(invite =>
          invite.id === inviteId
            ? { ...invite, invitation_status: response === 'accept' ? 'accepted' : 'rejected' }
            : invite
        )
      );
      
    } catch (err) {
      console.error(`Error ${response}ing invitation:`, err);
      setError(`Failed to ${response} invitation. Please try again.`);
    } finally {
      setProcessingInvites(prev => {
        const newSet = new Set(prev);
        newSet.delete(inviteId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const InviteCard = ({ invite, isReceived = true }) => {
    const isProcessing = processingInvites.has(invite.id);
    const isPending = invite.invitation_status === 'pending';
    
    return (
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{invite.group_name}</h3>
              <p className="text-sm text-gray-600">
                {isReceived ? `From ${invite.sender_name}` : `To ${invite.client_name}`}
              </p>
            </div>
          </div>
          
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invite.invitation_status)}`}>
            {invite.invitation_status}
          </span>
        </div>

        {/* Shared Accounts */}
        {invite.shared_accounts && invite.shared_accounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              <CreditCard className="h-4 w-4 mr-1" />
              Shared Accounts ({invite.shared_accounts.length})
            </h4>
            <div className="space-y-1">
              {invite.shared_accounts.slice(0, 3).map((account, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                  <Building2 className="h-3 w-3" />
                  <span className="font-medium">{account.account_name}</span>
                  <span className="text-xs text-gray-500">• {account.account_type}</span>
                  {account.institution_name && (
                    <span className="text-xs text-gray-500">• {account.institution_name}</span>
                  )}
                </div>
              ))}
              {invite.shared_accounts.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{invite.shared_accounts.length - 3} more accounts
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(invite.created_at)}
          </div>
          
          {isReceived && isPending && (
            <div className="flex space-x-2">
              <button
                onClick={() => handleInviteResponse(invite.id, 'decline')}
                disabled={isProcessing}
                className="flex items-center px-3 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <X className="h-3 w-3 mr-1" />
                )}
                Decline
              </button>
              <button
                onClick={() => handleInviteResponse(invite.id, 'accept')}
                disabled={isProcessing}
                className="flex items-center px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Check className="h-3 w-3 mr-1" />
                )}
                Accept
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading invitations...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Group Invitations</h2>
          <button
            onClick={loadInvitations}
            disabled={loading}
            className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        {/* Tabs */}
        <div className="mt-4 flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('received')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'received'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Received ({receivedInvites.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sent'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Sent ({sentInvites.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {activeTab === 'received' && (
          <div className="space-y-4">
            {receivedInvites.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No invitations received</p>
                <p className="text-sm">Group invitations will appear here when you receive them.</p>
              </div>
            ) : (
              receivedInvites.map(invite => (
                <InviteCard key={invite.id} invite={invite} isReceived={true} />
              ))
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="space-y-4">
            {sentInvites.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No invitations sent</p>
                <p className="text-sm">Invitations you send will be tracked here.</p>
              </div>
            ) : (
              sentInvites.map(invite => (
                <InviteCard key={invite.id} invite={invite} isReceived={false} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupInviteManager;