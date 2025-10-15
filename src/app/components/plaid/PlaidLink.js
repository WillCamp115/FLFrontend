// app/components/PlaidLink.js
"use client";
import { useState, useEffect, useRef } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { useAccounts } from "../../../contexts/AccountContext";
import axios from "axios";
import apiClient from "../../../lib/apiClient";

const PlaidLink = ({ userId, onSuccess, redirectAfterSuccess = true, includeLiabilities = true }) => {
  const [linkToken, setLinkToken] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasOpened = useRef(false); // Prevent multiple opens
  
  const router = useRouter();
  const { user } = useAuth();
  const { triggerAccountRefresh } = useAccounts();

  const createLinkToken = async () => {
    try {
      if (!userId) {
        throw new Error("User ID is required to connect with Plaid.");
      }
      
      // For single-bank architecture: always create a fresh connection
      // This will replace any existing connection
      const requestBody = {
        client_user_id: userId,
        include_liabilities: includeLiabilities,
      };
      
      const response = await axios.post("/api/plaid/create-link-token", requestBody);
      setLinkToken(response.data.link_token);
      setError(null);
    } catch (error) {
      console.error("Error generating link token:", error);
      setError(error.message || "Failed to initialize Plaid connection.");
    }
  };

  const onPlaidSuccess = async (public_token, metadata) => {
    try {
      setIsProcessing(true);
      // console.log("Plaid Link Success - Public Token:", public_token);
      // console.log("Plaid Metadata:", metadata);

      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken(true);

      // Step 1: Exchange public token for access token (stored securely server-side)
      const response = await axios.post("/api/plaid/exchange-token", { 
        public_token,
        firebase_uid: user.uid
      }, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      const { success, item_id } = response.data;
      
      if (!success) {
        throw new Error("Failed to exchange token");
      }
      
      setIsConnected(true);

      // Notify that accounts have been updated
      triggerAccountRefresh();

      // Step 2: Handle different flows based on context
      if (redirectAfterSuccess && user) {
        // This is the initial signup flow - create new user
        const signupResponse = await axios.post("/api/signup", {
          firebaseUid: user.uid,
          itemId: item_id,
          clientUserId: user.uid,
          firstname: user.displayName?.split(" ")[0] || "",
          lastname: user.displayName?.split(" ").slice(1).join(" ") || "",
          isNewUser: true, // Always treat Plaid-linked users as new for onboarding
        });

        // console.log("Signup successful:", signupResponse.data);

        // Step 3: Redirect based on user status
        const redirectTo = signupResponse.data.redirectTo || "/onboarding";
        router.push(redirectTo);
      } else {
        // This is adding a new account from profile page - token already stored server-side
        // console.log("Plaid connection added successfully");
        
        // Call the parent's onSuccess
        if (onSuccess) {
          onSuccess(true, item_id);
        }
      }
    } catch (error) {
      console.error("Error in Plaid success flow:", error);
      setError("Failed to connect bank account.");
      
      // On error, still try to call parent's onSuccess if provided
      if (onSuccess) {
        onSuccess(null, null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const onPlaidError = (error) => {
    console.log("Plaid Link Error:", error);
    
    // Check if error is related to liabilities not being available
    if (error.error_code === 'PRODUCTS_NOT_SUPPORTED' || 
        error.error_message?.includes('liabilities') ||
        error.error_message?.includes('liability')) {
      console.log("Liabilities not supported - continuing without liability data");
      // Don't show this as an error, just continue the flow
      setError(null);
      return;
    }
    
    // For other errors, show the error message
    setError(`Connection failed: ${error.error_message || 'Unknown error'}`);
  };

  const onPlaidExit = (error, metadata) => {
    console.log("Plaid Link Exit:", error, metadata);
    
    // If user exits due to liability issues, don't treat as error
    if (error?.error_code === 'PRODUCTS_NOT_SUPPORTED') {
      console.log("User exited due to products not supported - continuing flow");
      setError(null);
      return;
    }
    
    if (error) {
      setError(`Connection cancelled: ${error.error_message || 'User cancelled'}`);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onError: onPlaidError,
    onExit: onPlaidExit,
  });

  const handleClick = () => {
    setError(null);
    if (!linkToken) {
      createLinkToken();
    } else if (!isConnected && !isProcessing) {
      open();
    }
  };

  // Open the modal automatically after linkToken is generated, but only if not connected
  useEffect(() => {
    if (linkToken && ready && !isConnected && !isProcessing && !hasOpened.current) {
      hasOpened.current = true;
      open();
    }
  }, [linkToken, ready, isConnected, isProcessing, open]);

  const getButtonText = () => {
    if (isProcessing) return "Setting up your account...";
    if (isConnected) return "Bank Account Connected";
    return "Connect Bank Account with Plaid";
  };

  const isButtonDisabled = () => {
    return isConnected || isProcessing || (linkToken && !ready);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isButtonDisabled()}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded mt-4 disabled:bg-gray-400 flex items-center justify-center"
      >
        {isProcessing && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        )}
        {getButtonText()}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default PlaidLink;