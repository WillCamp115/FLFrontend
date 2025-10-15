// app/signup/client/page.js
"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "../../../lib/firestoreClient";
import { auth } from "../../../lib/firestoreClient";
import PlaidLink from "../../components/plaid/PlaidLink";
import { useAuth } from "../../../contexts/AuthContext";

export default function ClientSignUpPage() {
  // Email signup form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  
  // General state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupMethod, setSignupMethod] = useState(null); // null, 'google', 'email'
  const [step, setStep] = useState(1); // 1: Choose method, 2: Email form, 3: MFA, 4: Plaid connection
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [enrollmentAttempted, setEnrollmentAttempted] = useState(false);

  // Plaid state
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [itemId, setItemId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  const router = useRouter();
  const { signInWithGoogle, user, mfa } = useAuth();

  const {
    needsEnrollment,
    processing: mfaProcessing,
    enrollment,
    startEnrollment,
    confirmEnrollment,
    resetEnrollment,
    error: mfaError,
  } = mfa;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleSignUp = async () => {
    try {
      setError("");
      setTotpError("");
      setTotpCode("");
      setQrCodeDataUrl("");
      setEnrollmentAttempted(false);
      if (typeof resetEnrollment === "function") {
        resetEnrollment();
      }
      setLoading(true);
      // console.log("Starting Google signup..."); // Debug log
      const result = await signInWithGoogle();
      // console.log("Google signup result:", result); // Debug log
      // console.log("Type of result:", typeof result); // Debug log
      // console.log("Result keys:", result ? Object.keys(result) : 'null'); // Debug log
      
      // Try different ways to get the user
      const userFromResult = result?.user || result;
      // console.log("User from result:", userFromResult); // Debug log
      // console.log("User UID:", userFromResult?.uid); // Debug log
      
      // Also check the context user
      // console.log("Context user:", user); // Debug log
      // console.log("Context user UID:", user?.uid); // Debug log
      
      setSignupMethod('google');
      
      // Use context user if result doesn't have user
      const actualUser = userFromResult?.uid ? userFromResult : user;
      setCurrentUser(actualUser);
      
      if (actualUser?.uid) {
        // console.log("Setting user UID:", actualUser.uid);
        setStep(3); // Move to MFA enrollment step
      } else {
        throw new Error("No user ID found after Google signup");
      }
    } catch (error) {
      setError("Failed to sign up with Google. Please try again.");
      console.error("Google sign-up error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError("Please fill in all fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      setTotpError("");
      setTotpCode("");
      setQrCodeDataUrl("");
      setEnrollmentAttempted(false);
      if (typeof resetEnrollment === "function") {
        resetEnrollment();
      }
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });
      
      setCurrentUser(userCredential.user);
      setSignupMethod('email');
      setStep(3); // Move to MFA enrollment step
    } catch (error) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError("An account with this email already exists.");
          break;
        case 'auth/invalid-email':
          setError("Invalid email address.");
          break;
        case 'auth/weak-password':
          setError("Password is too weak. Please use at least 6 characters.");
          break;
        default:
          setError("Failed to create account. Please try again.");
      }
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only skip MFA step if user already has MFA enrolled (shouldn't happen for new users)
    if (step === 3 && currentUser && !mfaProcessing) {
      const factors = currentUser.multiFactor?.enrolledFactors ?? [];
      if (factors.length > 0) {
        setStep(4);
      }
    }
  }, [step, currentUser, mfaProcessing]);

  useEffect(() => {
    if (step !== 3 || !currentUser) {
      return;
    }

    if (!needsEnrollment || mfaProcessing || enrollment?.uri || enrollmentAttempted) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setEnrollmentAttempted(true);
        
        if (typeof startEnrollment === "function") {
          await startEnrollment({});
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to start TOTP enrollment during signup:", err);
          setTotpError(err?.message || "Unable to generate an authenticator code. Please try again.");
          setEnrollmentAttempted(false); // Allow retry on error
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, currentUser, needsEnrollment, mfaProcessing, enrollment?.uri, startEnrollment, enrollmentAttempted]);

  useEffect(() => {
    if (!enrollment?.uri) {
      setQrCodeDataUrl("");
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(enrollment.uri, { margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrCodeDataUrl(dataUrl);
        }
      })
      .catch((err) => {
        console.error("Failed to render TOTP QR code during signup:", err);
        if (!cancelled) {
          setQrCodeDataUrl("");
          setTotpError((prev) => prev || "Unable to render the QR code. Use the manual setup key instead.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enrollment?.uri]);

  const handleGenerateNewSecret = async () => {
    try {
      setTotpError("");
      setTotpCode("");
      if (typeof resetEnrollment === "function") {
        resetEnrollment();
      }
      await startEnrollment({});
    } catch (err) {
      console.error("Failed to regenerate TOTP secret during signup:", err);
      setTotpError(err?.message || "Unable to generate a new code. Please try again.");
    }
  };

  const handleConfirmTotp = async () => {
    const sanitized = totpCode.replace(/\s+/g, "");
    if (!sanitized) {
      setTotpError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setTotpError("");
      await confirmEnrollment({ verificationCode: sanitized });
      setTotpCode("");
      // Advance to Plaid connection step after successful MFA enrollment
      setStep(4);
    } catch (err) {
      console.error("Failed to confirm TOTP code during signup:", err);
      setTotpError(err?.message || "Unable to verify code. Please try again.");
    }
  };

  const handlePlaidSuccess = async (success, itemId) => {
    setPlaidConnected(success);
    setItemId(itemId);
    
    // Automatically complete signup after Plaid connection
    await handleCompleteSignup(success, itemId);
  };

  const handleCompleteSignup = async (providedSuccess = null, providedItemId = null) => {
    if (needsEnrollment) {
      setError("Please finish setting up your authenticator app to secure your account.");
      return;
    }

    // Use provided values if available, otherwise fall back to state
    const successToUse = providedSuccess !== null ? providedSuccess : plaidConnected;
    const itemToUse = providedItemId || itemId;
    
    if (!successToUse || !currentUser) {
      setError("Please complete bank account connection.");
      return;
    }
    try {
      setLoading(true);
      
      // Step 1: Create user in backend
      const userResponse = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firebaseUid: currentUser.uid,
          itemId: itemToUse,
          clientUserId: currentUser.uid,
          firstname: signupMethod === 'email' ? formData.firstName : (currentUser.displayName?.split(' ')[0] || ''),
          lastname: signupMethod === 'email' ? formData.lastName : (currentUser.displayName?.split(' ')[1] || ''),
          isNewUser: true, // Always treat users going through signup flow as new for onboarding
        }),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || "User creation failed");
      }

      const userData = await userResponse.json();
      
      // Use the redirectTo from the signup response (should be /onboarding for new users)
      const redirectTo = userData.redirectTo || "/dashboard";
      router.push(redirectTo);
    } catch (err) {
      setError(err.message || "Failed to complete signup. Please try again.");
      console.error("Signup completion error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPlaid = () => {
    if (needsEnrollment) {
      setError("Please finish setting up your authenticator app before continuing.");
      return;
    }
    // Allow users to skip Plaid connection and add it later
    router.push("/dashboard");
  };

  // Step 1: Choose signup method
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-black text-center">
            Create Client Account
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Choose how you&apos;d like to sign up
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-3 px-4 rounded flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{loading ? "Signing up..." : "Continue with Google"}</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded"
            >
              Sign Up with Email
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <a href="/login" className="text-blue-500 hover:underline">
                Log in
              </a>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <a href="/signup" className="text-blue-500 hover:underline">
                ← Back to account type selection
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Email/Password Form
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-black text-center">
            Create Your Account
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                  placeholder="First name"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="Create a password"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="Confirm your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 px-4 rounded"
            >
              {loading ? "Creating Account..." : "Create Account & Continue"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              ← Back to Sign Up Options
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-black text-center">
            Secure Your Account
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Add an authenticator app for time-based one-time passwords before connecting financial data.
          </p>

          {(error || totpError || mfaError) && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {totpError || error || mfaError?.message || mfaError?.code || "Something went wrong."}
            </div>
          )}

          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-3">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Authenticator QR code"
                  className="w-40 h-40 border border-gray-200 rounded-lg shadow-sm"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm text-center px-4">
                  {mfaProcessing ? "Generating QR code..." : "QR code will appear here once generated."}
                </div>
              )}
              <button
                type="button"
                onClick={handleGenerateNewSecret}
                disabled={mfaProcessing}
                className="text-sm text-green-600 hover:text-green-700 disabled:text-gray-400"
              >
                {mfaProcessing ? "Working..." : "Generate a new QR code"}
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <p className="text-sm font-semibold text-gray-800">Manual setup key</p>
              <p className="mt-2 font-mono text-lg tracking-widest text-gray-900 select-all break-all">
                {enrollment?.secretKey || "Loading..."}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Enter this key into your authenticator app if you can&apos;t scan the QR code.
              </p>
            </div>

            <div>
              <label htmlFor="signup-totp-code" className="block text-sm font-medium text-gray-700 mb-1">
                Enter the 6-digit code
              </label>
              <input
                type="text"
                id="signup-totp-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
              />
            </div>

            <button
              type="button"
              onClick={handleConfirmTotp}
              disabled={mfaProcessing}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 px-4 rounded"
            >
              {mfaProcessing ? "Verifying..." : "Confirm & Continue"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setTotpCode("");
                setTotpError("");
                setQrCodeDataUrl("");
                if (typeof resetEnrollment === "function") {
                  resetEnrollment();
                }
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              ← Back to Sign Up Options
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Plaid Connection
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-black text-center">
          Connect Your Bank Account
        </h2>
        <p className="text-center text-gray-600 mb-2">
          Welcome, {currentUser?.displayName || `${formData.firstName} ${formData.lastName}`}!
        </p>
        <p className="text-center text-gray-600 mb-6">
          Now let&apos;s connect your bank account to get started with budgeting.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {!plaidConnected ? (
            <>
              {currentUser?.uid ? (
                <PlaidLink 
                  userId={currentUser.uid} 
                  onSuccess={handlePlaidSuccess} 
                  redirectAfterSuccess={false}
                  includeLiabilities={true}
                />
              ) : (
                <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                  Loading user information...
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                ✓ Bank account connected successfully! Completing signup...
              </div>
              {loading && (
                <div className="text-center text-gray-600">
                  <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full"></div>
                  <p className="mt-2">Finalizing your account...</p>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={handleSkipPlaid}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded text-sm"
          >
            Skip for now (you can connect later)
          </button>
        </div>
      </div>
    </div>
  );
}
