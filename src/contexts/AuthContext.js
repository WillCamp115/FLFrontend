"use client";
import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  multiFactor,
  TotpMultiFactorGenerator,
} from '../lib/firestoreClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [mfaEnrollmentRequired, setMfaEnrollmentRequired] = useState(false);

  // Helper function to check MFA status from ID token claims
  const checkMfaFromIdToken = useCallback(async (firebaseUser) => {
    try {
      const idTokenResult = await firebaseUser.getIdTokenResult(true);
      const claims = idTokenResult.claims;
      
      // Check for MFA-related claims
      const hasMfaClaim = claims.firebase?.sign_in_provider === 'google.com' && 
                         claims.firebase?.sign_in_second_factor !== undefined;
      
      // Also check if there are any MFA-related claims
      const hasAnyMfaClaim = Object.keys(claims).some(key => 
        key.includes('mfa') || key.includes('second_factor') || key.includes('totp')
      );
      
      return hasMfaClaim || hasAnyMfaClaim;
    } catch (error) {
      console.error('AuthContext: Error checking MFA from token:', error);
      return false;
    }
  }, []);
  const [mfaError, setMfaError] = useState(null);
  const [mfaProcessing, setMfaProcessing] = useState(false);
  const totpSecretRef = useRef(null);
  const enrollmentInProgressRef = useRef(false);
  const [totpEnrollmentData, setTotpEnrollmentData] = useState({
    uri: '',
    secretKey: '',
    accountName: '',
    issuer: '',
  });

  const evaluateMfaState = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setMfaEnrollmentRequired(false);
      return;
    }

    try {
      // Force a fresh token and reload to get latest MFA state
      await firebaseUser.getIdToken(true);
      await firebaseUser.reload();
      
      const factors = firebaseUser.multiFactor?.enrolledFactors ?? [];
      
      // Try alternative ways to check MFA status
      const hasMfaFromToken = await checkMfaFromIdToken(firebaseUser);
      
      const enrollmentRequired = factors.length === 0 && !hasMfaFromToken;
      
      // Only update if the state actually changed to prevent unnecessary re-renders
      if (mfaEnrollmentRequired !== enrollmentRequired) {
        setMfaEnrollmentRequired(enrollmentRequired);
      }
    } catch (error) {
      console.error('AuthContext: Error evaluating MFA state:', error);
      // Fallback to checking without reload
      const factors = firebaseUser.multiFactor?.enrolledFactors ?? [];
      const hasMfaFromToken = await checkMfaFromIdToken(firebaseUser);
      const enrollmentRequired = factors.length === 0 && !hasMfaFromToken;
      
      if (mfaEnrollmentRequired !== enrollmentRequired) {
        setMfaEnrollmentRequired(enrollmentRequired);
      }
    }
  }, [mfaEnrollmentRequired]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      await evaluateMfaState(firebaseUser);
      setLoading(false);
      if (firebaseUser && isAuthenticating) {
        setIsAuthenticating(false);
      }
    });

    // Check for redirect result on component mount
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Google sign-in redirect successful:', result.user);
          
          // Force reload user to ensure MFA state is properly loaded
          await result.user.reload();
          const refreshedUser = auth.currentUser;
          console.log('User reloaded after redirect, evaluating MFA state...');
          await evaluateMfaState(refreshedUser);
          
          setIsAuthenticating(false);
        }
      } catch (error) {
        console.error('Redirect result error:', error);
        
        // Handle MFA required for Google redirect sign-in
        if (error.code === "auth/multi-factor-auth-required") {
          console.log('MFA required after Google redirect, this should be handled in login page');
        }
        
        setError(error.message);
        setIsAuthenticating(false);
      }
    };

    checkRedirectResult();

    return () => unsubscribe();
  }, [isAuthenticating]);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setIsAuthenticating(true);
      const provider = new GoogleAuthProvider();
      
      // Try popup first, fall back to redirect if COOP blocks it
      try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (popupError) {
        console.log('Popup blocked, falling back to redirect method:', popupError.code);
        
        console.log('Popup error details:', {
          code: popupError.code,
          message: popupError.message,
          hasCOOPMessage: popupError.message?.includes('Cross-Origin-Opener-Policy')
        });
        
        // If MFA is required, let the login page handle it by throwing the error
        if (popupError.code === 'auth/multi-factor-auth-required') {
          console.log('MFA required for Google sign-in, letting login page handle it');
          throw popupError;
        }
        // If popup is blocked by COOP or other issues, use redirect instead
        else if (popupError.code === 'auth/popup-blocked' || 
                 popupError.code === 'auth/popup-closed-by-user' ||
                 popupError.message?.includes('Cross-Origin-Opener-Policy')) {
          console.log('Popup blocked, trying redirect method');
          await signInWithRedirect(auth, provider);
          // The redirect will handle the rest
          return null;
        } else {
          throw popupError;
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(error.message);
      setIsAuthenticating(false);
      throw error;
    }
  };

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) {
      setUser(null);
      setMfaEnrollmentRequired(false);
      return null;
    }

    // Force fresh token first, then reload
    await auth.currentUser.getIdToken(true);
    await auth.currentUser.reload();
    
    const refreshed = auth.currentUser;
    
    setUser(refreshed);
    await evaluateMfaState(refreshed);
    
    return refreshed;
  }, [evaluateMfaState]);

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message);
      throw error;
    }
  };

  const resetTotpEnrollmentState = useCallback(() => {
    totpSecretRef.current = null;
    enrollmentInProgressRef.current = false;
    setTotpEnrollmentData({
      uri: '',
      secretKey: '',
      accountName: '',
      issuer: '',
    });
  }, []);

  const sendEmailVerification = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user found');
      }
      
      console.log('Sending email verification to:', auth.currentUser.email);
      console.log('User email verified status:', auth.currentUser.emailVerified);
      
      await firebaseSendEmailVerification(auth.currentUser);
      console.log('Email verification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  }, []);

  const startTotpEnrollment = useCallback(async ({ accountName, issuer } = {}) => {
    if (!auth.currentUser) {
      throw new Error('Must be signed in to start multi-factor enrollment');
    }

    // Prevent duplicate enrollment requests
    if (enrollmentInProgressRef.current) {
      return;
    }

    try {
      enrollmentInProgressRef.current = true;
      setMfaError(null);
      setMfaProcessing(true);

      // Check if email is verified first
      if (!auth.currentUser.emailVerified) {
        throw new Error('Please verify your email address before setting up MFA. Check your inbox for a verification email.');
      }

      const session = await multiFactor(auth.currentUser).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);

      const fallbackAccountName = accountName || auth.currentUser.email || auth.currentUser.uid;
      const fallbackIssuer = issuer || 'FreedomLedger';
      const uri = secret.generateQrCodeUrl(fallbackAccountName, fallbackIssuer);

      totpSecretRef.current = secret;
      setTotpEnrollmentData({
        uri,
        secretKey: secret.secretKey,
        accountName: fallbackAccountName,
        issuer: fallbackIssuer,
      });

      return {
        uri,
        secretKey: secret.secretKey,
        accountName: fallbackAccountName,
        issuer: fallbackIssuer,
      };
    } catch (err) {
      console.error('Error starting TOTP enrollment:', err);
      
      // Handle specific Firebase errors with user-friendly messages
      if (err.code === 'auth/maximum-second-factor-count-exceeded') {
        const friendlyError = new Error('You have reached the maximum number of authenticator apps. Please remove existing authenticators from Firebase Console before adding a new one.');
        friendlyError.code = err.code;
        setMfaError(friendlyError);
        throw friendlyError;
      }
      
      setMfaError(err);
      throw err;
    } finally {
      setMfaProcessing(false);
      enrollmentInProgressRef.current = false;
    }
  }, []);

  const confirmTotpEnrollment = useCallback(async ({ verificationCode, displayName = 'Authenticator app' }) => {
    if (!auth.currentUser) {
      throw new Error('Must be signed in to confirm multi-factor enrollment');
    }

    if (!totpSecretRef.current) {
      throw new Error('No TOTP secret available. Please generate a new QR code.');
    }

    try {
      setMfaError(null);
      setMfaProcessing(true);

      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecretRef.current, verificationCode);
      await multiFactor(auth.currentUser).enroll(assertion, displayName);

      // Reset enrollment state first
      resetTotpEnrollmentState();
      
      // Force multiple refreshes to ensure state updates
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      
      // Use our refreshUser function which includes MFA state evaluation
      await refreshUser();
      
    } catch (err) {
      console.error('Error confirming TOTP enrollment:', err);
      setMfaError(err);
      throw err;
    } finally {
      setMfaProcessing(false);
    }
  }, [refreshUser, resetTotpEnrollmentState]);

  const mfaState = useMemo(() => ({
    needsEnrollment: mfaEnrollmentRequired,
    error: mfaError,
    processing: mfaProcessing,
    enrollment: totpEnrollmentData,
  }), [mfaEnrollmentRequired, mfaError, mfaProcessing, totpEnrollmentData]);

  const value = {
    user,
    loading,
    error,
    isAuthenticating,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
    refreshUser,
    sendEmailVerification,
    mfa: {
      ...mfaState,
      startEnrollment: startTotpEnrollment,
      confirmEnrollment: confirmTotpEnrollment,
      resetEnrollment: resetTotpEnrollmentState,
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
