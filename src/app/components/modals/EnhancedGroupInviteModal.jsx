import React, { useState, useEffect } from 'react';
import { X, Users, Send, UserPlus, CreditCard, AlertCircle, Check, Copy, Loader2 } from 'lucide-react';
import Modal from './Modal';
import AccountSelectionModal from './AccountSelectionModal';
import apiClient from '../../../lib/apiClient';
import { auth } from '../../../lib/firestoreClient';

const EnhancedGroupInviteModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState('selectGroup');
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [targetUser, setTargetUser] = useState('');
  const [targetUserId, setTargetUserId] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [maxUses, setMaxUses] = useState(5);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [showEmailSharing, setShowEmailSharing] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState('');
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailResults, setEmailResults] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadUserGroups();
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setCurrentStep('selectGroup');
    setSelectedGroup(null);
    setSelectedAccounts([]);
    setTargetUser('');
    setTargetUserId(null);
    setInviteCode('');
    setError('');
    setSearchResults([]);
    setShowCreateGroup(false);
    setNewGroupName('');
    setMaxUses(5);
    setExpiresInDays(7);
    setShowEmailSharing(false);
    setEmailAddresses('');
    setEmailResults(null);
  };

  const loadUserGroups = async () => {
    try {
      setLoading(true);
      const groups = await apiClient.getUserGroups();
      setUserGroups(groups);
    } catch (err) {
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const users = await apiClient.searchUsers(query);
      setSearchResults(users);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUserSearch = (e) => {
    const query = e.target.value;
    setTargetUser(query);
    setTargetUserId(null);
    
    // Debounce search
    setTimeout(() => {
      if (query === e.target.value) {
        searchUsers(query);
      }
    }, 300);
  };

  const selectUser = (user) => {
    setTargetUser(`${user.firstname} ${user.lastname} (${user.firebase_uid})`);
    setTargetUserId(user.id);
    setSearchResults([]);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
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
        group_name: newGroupName.trim()
      };
      
      const newGroup = await apiClient.createGroup(groupData);
      
      // Add new group to local state
      setUserGroups(prev => [...prev, newGroup]);
      
      // Select the new group and continue
      setSelectedGroup(newGroup);
      setShowCreateGroup(false);
      setNewGroupName('');
      setCurrentStep('selectAccounts');

    } catch (err) {
      setError('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!selectedGroup) {
      setError('Please select a group');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Convert days to hours for the API
      const expiresInHours = expiresInDays * 24;

      // If accounts are selected, add them to the group first
      if (selectedAccounts.length > 0) {
        await apiClient.createGroupInviteWithAccounts(selectedGroup.group_id, selectedAccounts);
      }
      
      // Create a configurable invite link (not tied to specific user)
      const result = await apiClient.createGroupInviteLink(
        selectedGroup.group_id,
        maxUses,
        expiresInHours
      );
      
      setInviteCode(result.code);
      setCurrentStep('success');

    } catch (err) {
      setError('Failed to create invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      // Silent fail
    }
  };

  const handleSendEmails = async () => {
    if (!emailAddresses.trim()) {
      setError('Please enter at least one email address');
      return;
    }

    // Parse email addresses (split by comma, semicolon, or newline)
    const emails = emailAddresses
      .split(/[,\n;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (emails.length === 0) {
      setError('Please enter valid email addresses');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      setError(`Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    try {
      setSendingEmails(true);
      setError('');
      
      const result = await apiClient.sendGroupInvitationEmails(
        inviteCode,
        emails,
        selectedGroup.group_name
      );
      
      setEmailResults(result);
      setEmailAddresses(''); // Clear the input

    } catch (err) {
      setError('Failed to send emails. Please try again.');
    } finally {
      setSendingEmails(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'selectGroup', label: 'Group' },
      { key: 'selectAccounts', label: 'Settings' },
      { key: 'success', label: 'Complete' }
    ];

    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep === step.key
                ? 'bg-blue-600 text-white'
                : steps.findIndex(s => s.key === currentStep) > index
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {steps.findIndex(s => s.key === currentStep) > index ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-1 mx-2 ${
                steps.findIndex(s => s.key === currentStep) > index
                  ? 'bg-green-600'
                  : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderSelectGroup = () => (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Select Group</h3>
      <p className="text-sm text-gray-600 mb-4">
        Choose which group you want to invite someone to join.
      </p>

      {userGroups.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Found</h3>
          <p className="text-gray-600 mb-6">
            You need to create a group before you can send invitations.
          </p>
          
          {!showCreateGroup ? (
            <button
              onClick={() => setShowCreateGroup(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Group
            </button>
          ) : (
            <div className="max-w-sm mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newGroupName.trim() && !loading) {
                      handleCreateGroup();
                    }
                  }}
                  placeholder="Enter group name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCreateGroup(false);
                    setNewGroupName('');
                    setError('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={loading || !newGroupName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Group
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {userGroups.map(group => (
            <div
              key={group.group_id}
                                onClick={() => {
                    setSelectedGroup(group);
                    setCurrentStep('selectAccounts');
                  }}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedGroup?.group_id === group.group_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <h4 className="font-medium text-gray-900">{group.group_name}</h4>
              <p className="text-xs text-gray-500 mt-1">Group ID: {group.group_id}</p>
            </div>
          ))}
          
          {/* Create new group option */}
          <div className="pt-4 border-t border-gray-200 mt-6">
            {!showCreateGroup ? (
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center"
              >
                <Users className="h-5 w-5 mr-2" />
                Create New Group
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newGroupName.trim() && !loading) {
                        handleCreateGroup();
                      }
                    }}
                    placeholder="Enter group name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateGroup(false);
                      setNewGroupName('');
                      setError('');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={loading || !newGroupName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Create Group
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderSelectUser = () => (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Select User to Invite</h3>
      <p className="text-sm text-gray-600 mb-4">
        Search for the user you want to invite to <strong>{selectedGroup?.group_name}</strong>.
      </p>

      <div className="relative">
        <input
          type="text"
          value={targetUser}
          onChange={handleUserSearch}
          placeholder="Search by name or email..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {searching && (
          <div className="absolute right-3 top-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
            {searchResults.map(user => (
              <div
                key={user.id}
                onClick={() => selectUser(user)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              >
                <div className="font-medium text-gray-900">
                  {user.firstname} {user.lastname}
                </div>
                <div className="text-sm text-gray-600">{user.firebase_uid}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {targetUserId && (
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setCurrentStep('selectGroup')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => setCurrentStep('selectAccounts')}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const renderSelectAccounts = () => (
    <div className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Configure Group Invitation</h3>
      <p className="text-sm text-gray-600 mb-4">
        Create a shareable invitation code for <strong>{selectedGroup?.group_name}</strong>. Configure sharing settings and invitation limits.
      </p>

      <div className="space-y-4">
        <button
          onClick={() => setShowAccountModal(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          {selectedAccounts.length === 0 ? 'Select Accounts' : 'Modify Selected Accounts'}
        </button>

        {selectedAccounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Selected Accounts:</h4>
            {selectedAccounts.map((account, index) => (
              <div key={index} className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <CreditCard className="h-4 w-4 text-blue-600 mr-3" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{account.account_name}</div>
                  <div className="text-sm text-gray-600">{account.account_type}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invitation Settings */}
        <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700">Invitation Settings</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Uses
              </label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>1 use (Single)</option>
                <option value={5}>5 uses</option>
                <option value={10}>10 uses</option>
                <option value={25}>25 uses</option>
                <option value={50}>50 uses</option>
                <option value={100}>100 uses</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">How many people can use this code</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expires In
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>1 week</option>
                <option value={30}>1 month</option>
                <option value={90}>3 months</option>
                <option value={365}>1 year</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">When this code expires</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setCurrentStep('selectGroup')}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleCreateInvite}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Create Invitation
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">Invitation Created!</h3>
        <p className="text-sm text-gray-600 mb-6">
          Share this invitation code with users to join your group.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Invitation Code:</label>
          <button
            onClick={copyInviteCode}
            className={`flex items-center px-2 py-1 text-xs rounded transition-colors ${
              copiedCode
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {copiedCode ? (
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
        <code className="text-lg font-mono text-gray-800 break-all">{inviteCode}</code>
      </div>

      <div className="text-sm text-gray-600 space-y-1 mb-6">
        <p><strong>Group:</strong> {selectedGroup?.group_name}</p>
        <p><strong>Max Uses:</strong> {maxUses} {maxUses === 1 ? 'person' : 'people'}</p>
        <p><strong>Expires:</strong> {expiresInDays} {expiresInDays === 1 ? 'day' : 'days'}</p>
        <p><strong>Shared Accounts:</strong> {selectedAccounts.length}</p>
      </div>

      {/* Email Sharing Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-900">Share via Email</h4>
          <button
            onClick={() => setShowEmailSharing(!showEmailSharing)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showEmailSharing ? 'Hide' : 'Send Emails'}
          </button>
        </div>

        {showEmailSharing && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Addresses
              </label>
              <textarea
                value={emailAddresses}
                onChange={(e) => setEmailAddresses(e.target.value)}
                placeholder="Enter email addresses separated by commas, semicolons, or new lines&#10;example@email.com, another@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                disabled={sendingEmails}
              />
              <p className="text-xs text-gray-500 mt-1">
                You can enter multiple emails separated by commas, semicolons, or new lines
              </p>
            </div>

            <button
              onClick={handleSendEmails}
              disabled={sendingEmails || !emailAddresses.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
            >
              {sendingEmails ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending Emails...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation Emails
                </>
              )}
            </button>

            {emailResults && (
              <div className={`p-3 rounded-lg ${
                emailResults.failed_emails > 0 
                  ? 'bg-yellow-50 border border-yellow-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <div className="text-sm">
                  <p className={`font-medium ${
                    emailResults.failed_emails > 0 ? 'text-yellow-800' : 'text-green-800'
                  }`}>
                    {emailResults.successful_emails} of {emailResults.total_emails} emails sent successfully
                  </p>
                  {emailResults.failed_emails > 0 && (
                    <p className="text-yellow-700 mt-1">
                      {emailResults.failed_emails} emails failed to send
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Create Group Invitation" size="lg">
        {renderStepIndicator()}
        
        {error && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading && currentStep !== 'success' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Processing...</span>
          </div>
        )}

        {!loading && (
          <>
            {currentStep === 'selectGroup' && renderSelectGroup()}
            {currentStep === 'selectAccounts' && renderSelectAccounts()}
            {currentStep === 'success' && renderSuccess()}
          </>
        )}
      </Modal>

      <AccountSelectionModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onAccountsSelected={setSelectedAccounts}
        preSelectedAccounts={selectedAccounts}
        title="Select Accounts for Group Sharing"
      />
    </>
  );
};

export default EnhancedGroupInviteModal;