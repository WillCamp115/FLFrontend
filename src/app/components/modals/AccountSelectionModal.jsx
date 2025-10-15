import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Building2, Plus, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import apiClient from '../../../lib/apiClient';

const AccountSelectionModal = ({ 
  isOpen, 
  onClose, 
  onAccountsSelected, 
  title = "Select Accounts to Share",
  preSelectedAccounts = [],
  allowNewConnection = true 
}) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState(preSelectedAccounts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectingNew, setConnectingNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUserAccounts();
      setSelectedAccounts(preSelectedAccounts);
    }
  }, [isOpen, preSelectedAccounts]);

  const loadUserAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const userAccounts = await apiClient.getUserAccounts();
      setAccounts(userAccounts);
    } catch (err) {
      console.error('Error loading user accounts:', err);
      setError('Failed to load your accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountToggle = (account) => {
    setSelectedAccounts(prev => {
      const isSelected = prev.some(acc => acc.plaid_account_id === account.account_id);
      
      if (isSelected) {
        // Remove account
        return prev.filter(acc => acc.plaid_account_id !== account.account_id);
      } else {
        // Add account
        const newAccount = {
          plaid_account_id: account.account_id,
          account_name: account.account_name,
          account_type: account.account_type,
          institution_name: account.institution_name
        };
        return [...prev, newAccount];
      }
    });
  };

  const isAccountSelected = (account) => {
    return selectedAccounts.some(acc => acc.plaid_account_id === account.account_id);
  };

  const handleConnectNewAccount = async () => {
    setConnectingNew(true);
    try {
      // This would typically trigger Plaid Link
      // For now, we'll just show a placeholder
      alert('Plaid Link integration would be triggered here to connect a new account');
      // After successful connection, reload accounts
      await loadUserAccounts();
    } catch (err) {
      console.error('Error connecting new account:', err);
      setError('Failed to connect new account. Please try again.');
    } finally {
      setConnectingNew(false);
    }
  };

  const handleConfirm = () => {
    onAccountsSelected(selectedAccounts);
    onClose();
  };

  const getAccountIcon = (accountType) => {
    if (accountType?.includes('credit')) return <CreditCard className="h-5 w-5" />;
    return <Building2 className="h-5 w-5" />;
  };

  const getAccountTypeColor = (accountType) => {
    const type = accountType?.toLowerCase() || '';
    if (type.includes('checking')) return 'bg-blue-100 text-blue-800';
    if (type.includes('savings')) return 'bg-green-100 text-green-800';
    if (type.includes('credit')) return 'bg-purple-100 text-purple-800';
    if (type.includes('investment')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatAccountBalance = (balance) => {
    if (balance === null || balance === undefined) return 'Balance unavailable';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading your accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts Found</h3>
            <p className="text-gray-600 mb-6">
              You need to connect your bank accounts first to share them with groups.
            </p>
            {allowNewConnection && (
              <button
                onClick={handleConnectNewAccount}
                disabled={connectingNew}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {connectingNew ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Connect Bank Account
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Select the accounts you want to share with this group. Selected accounts will be visible to all group members for budgeting purposes.
              </p>
            </div>

            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {accounts.map((account) => {
                const selected = isAccountSelected(account);
                return (
                  <div
                    key={account.account_id}
                    onClick={() => handleAccountToggle(account)}
                    className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${selected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          {getAccountIcon(account.account_type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900">
                              {account.account_name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAccountTypeColor(account.account_type)}`}>
                              {account.account_type}
                            </span>
                          </div>
                          
                          <div className="mt-1 space-y-1">
                            {account.institution_name && (
                              <p className="text-sm text-gray-600">
                                {account.institution_name}
                              </p>
                            )}
                            
                            {account.mask && (
                              <p className="text-sm text-gray-500">
                                ••••{account.mask}
                              </p>
                            )}
                            
                            {account.balances?.current !== undefined && (
                              <p className="text-sm font-medium text-gray-700">
                                {formatAccountBalance(account.balances.current)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {selected && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {allowNewConnection && (
              <div className="mb-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleConnectNewAccount}
                  disabled={connectingNew}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors disabled:opacity-50"
                >
                  {connectingNew ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-5 w-5 mr-2" />
                  )}
                  Connect Another Account
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} selected
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AccountSelectionModal;