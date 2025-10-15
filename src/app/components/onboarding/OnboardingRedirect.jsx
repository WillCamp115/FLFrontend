'use client'
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../lib/apiClient';

const OnboardingRedirect = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading || !user) {
        return;
      }

      // Don't redirect if we're already on onboarding-related pages
      if (pathname === '/onboarding' || pathname.startsWith('/signup')) {
        setIsChecking(false);
        return;
      }

      try {
        // Check if user exists in our backend
        const userProfile = await apiClient.getCurrentUser();

        // If user doesn't exist in backend, they need onboarding
        if (!userProfile || !userProfile.firebase_uid) {
          console.log('User not found in backend, creating user and redirecting to onboarding');

          try {
            // Create user in backend before redirecting to onboarding
            const userResponse = await fetch("/api/signup", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                firebaseUid: user.uid,
                itemId: 'onboarding-redirect', // Placeholder since we don't have Plaid yet
                clientUserId: user.uid,
                firstname: user.displayName?.split(' ')[0] || '',
                lastname: user.displayName?.split(' ').slice(1).join(' ') || '',
                isNewUser: true,
              }),
            });

            if (!userResponse.ok) {
              const errorData = await userResponse.json();
              console.error('Failed to create user in backend:', errorData);
              // Continue to onboarding anyway - they can complete setup there
            }

            setShouldRedirect(true);
            router.push('/onboarding');
            return;
          } catch (createError) {
            console.error('Error creating user in backend:', createError);
            // Continue to onboarding anyway
            setShouldRedirect(true);
            router.push('/onboarding');
            return;
          }
        }

        // User exists in backend, no redirect needed
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking user profile:', error);

        // If we get a 404 or user not found error, assume user needs onboarding
        if (error.response?.status === 404 ||
            error.message?.includes('not found') ||
            error.message?.includes('User not registered')) {
          console.log('User not found (404), creating user in backend and redirecting to onboarding');

          try {
            // Create user in backend before redirecting to onboarding
            const userResponse = await fetch("/api/signup", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                firebaseUid: user.uid,
                itemId: 'onboarding-redirect', // Placeholder since we don't have Plaid yet
                clientUserId: user.uid,
                firstname: user.displayName?.split(' ')[0] || '',
                lastname: user.displayName?.split(' ').slice(1).join(' ') || '',
                isNewUser: true,
              }),
            });

            if (!userResponse.ok) {
              const errorData = await userResponse.json();
              console.error('Failed to create user in backend:', errorData);
              // Continue to onboarding anyway - they can complete setup there
            }

            setShouldRedirect(true);
            router.push('/onboarding');
            return;
          } catch (createError) {
            console.error('Error creating user in backend:', createError);
            // Continue to onboarding anyway
            setShouldRedirect(true);
            router.push('/onboarding');
            return;
          }
        }

        // For other errors, allow them to proceed (don't block legitimate users)
        console.warn('Non-blocking error during onboarding check, allowing user to proceed');
        setIsChecking(false);
      }
    };

    if (!authLoading) {
      checkOnboardingStatus();
    }
  }, [user, authLoading, router, pathname]);

  // Show loading while checking
  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If we're redirecting, show loading
  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // User is verified, render children
  return children;
};

export default OnboardingRedirect;