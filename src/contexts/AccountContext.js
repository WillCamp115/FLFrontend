"use client";
import { createContext, useContext, useState, useCallback } from 'react';

const AccountContext = createContext({});

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
};

export const AccountProvider = ({ children }) => {
  const [accountsVersion, setAccountsVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const notifyAccountsUpdated = useCallback(() => {
    console.log('AccountContext: Notifying accounts updated');
    setAccountsVersion(prev => prev + 1);
  }, []);

  const startAccountRefresh = useCallback(() => {
    console.log('AccountContext: Starting account refresh');
    setIsRefreshing(true);
  }, []);

  const finishAccountRefresh = useCallback(() => {
    console.log('AccountContext: Finishing account refresh');
    setIsRefreshing(false);
  }, []);

  const triggerAccountRefresh = useCallback(() => {
    console.log('AccountContext: Triggering account refresh');
    startAccountRefresh();
    notifyAccountsUpdated();
  }, [notifyAccountsUpdated, startAccountRefresh]);

  const value = {
    accountsVersion,
    isRefreshing,
    notifyAccountsUpdated,
    startAccountRefresh,
    finishAccountRefresh,
    triggerAccountRefresh
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
};