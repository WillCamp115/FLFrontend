"use client";
import { useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { auth } from "../../../lib/firestoreClient";

export default function RequireMfa({ children }) {
  const { user, loading, mfa } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Helper function to check MFA status from ID token claims (same as AuthContext)
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
      console.error('RequireMfa: Error checking MFA from token:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      return;
    }

    if (pathname === "/mfa-enrollment") {
      return;
    }

    // Check MFA status using reliable method (same as AuthContext)
    const checkMfaStatus = async () => {
      try {
        // Force fresh token and reload
        await user.getIdToken(true);
        await user.reload();
        
        const factors = user.multiFactor?.enrolledFactors ?? [];
        const hasMfaFromToken = await checkMfaFromIdToken(user);
        
        // User has MFA if either method detects it
        if (factors.length > 0 || hasMfaFromToken) {
          return; // User has MFA, no redirect needed
        }
        
        // If context says no enrollment needed, trust it
        if (!mfa.needsEnrollment) {
          return;
        }
        
        // User needs MFA enrollment
        const params = new URLSearchParams();
        if (pathname) {
          params.set("redirect", pathname);
        }
        router.replace(params.size > 0 ? `/mfa-enrollment?${params.toString()}` : "/mfa-enrollment");
      } catch (error) {
        console.error('RequireMfa: Error checking MFA status:', error);
        // Fallback to context state
        if (mfa.needsEnrollment) {
          const params = new URLSearchParams();
          if (pathname) {
            params.set("redirect", pathname);
          }
          router.replace(params.size > 0 ? `/mfa-enrollment?${params.toString()}` : "/mfa-enrollment");
        }
      }
    };

    // Add delay to allow state synchronization after MFA verification
    const timer = setTimeout(checkMfaStatus, 500);
    
    return () => clearTimeout(timer);
  }, [loading, user, mfa.needsEnrollment, mfa.processing, router, pathname, checkMfaFromIdToken]);

  if (loading) {
    return children;
  }

  if (mfa.needsEnrollment && pathname !== "/mfa-enrollment") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Additional verification required</h2>
          <p className="text-sm text-gray-600">
            We&apos;re redirecting you to finish setting up your authenticator-based multi-factor protection.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
