// components/PlaidSuccessHandler.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

const PlaidSuccessHandler = ({ publicToken, metadata }) => {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const handlePlaidSuccess = async () => {
      try {
        // console.log("Plaid Link Success - Public Token:", publicToken);
        // console.log("Plaid Metadata:", metadata);

        // Step 1: Exchange public token for access token
        const exchangeResponse = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken }),
        });

        if (!exchangeResponse.ok) {
          throw new Error("Failed to exchange token");
        }

        const { access_token, item_id } = await exchangeResponse.json();
        // console.log("Token exchange successful");

        // Step 2: Create/update user with access token
        const signupResponse = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebaseUid: user.uid,
            accessToken: access_token,
            itemId: item_id,
            clientUserId: user.uid,
            firstname: user.displayName?.split(" ")[0] || "",
            lastname: user.displayName?.split(" ").slice(1).join(" ") || "",
            isNewUser: user.metadata?.creationTime === user.metadata?.lastSignInTime, // Simple new user check
          }),
        });

        if (!signupResponse.ok) {
          throw new Error("Failed to create user");
        }

        const signupData = await signupResponse.json();
        // console.log("Signup successful:", signupData);

        // Step 3: Redirect based on user status
        const redirectTo = signupData.redirectTo || "/onboarding";
        router.push(redirectTo);

      } catch (error) {
        console.error("Error in Plaid success flow:", error);
        // On error, still redirect to dashboard as fallback
        router.push("/dashboard");
      }
    };

    if (publicToken && user) {
      handlePlaidSuccess();
    }
  }, [publicToken, metadata, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Setting up your account...</p>
      </div>
    </div>
  );
};

export default PlaidSuccessHandler;