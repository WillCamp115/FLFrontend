// app/signup/advisor/page.js
"use client";
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "../../../lib/firestoreClient";
import { auth } from "../../../lib/firestoreClient";
import { useAuth } from "../../../contexts/AuthContext";

export default function AdvisorSignUpPage() {
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
  const [step, setStep] = useState(1); // 1: Choose method, 2: Email form, 3: MFA, 4: Complete signup
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [enrollmentAttempted, setEnrollmentAttempted] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  
  const router = useRouter();
  const { signInWithGoogle, mfa } = useAuth();

  const {
    needsEnrollment,
    processing: mfaProcessing,
    enrollment,
    startEnrollment,
    confirmEnrollment,
    resetEnrollment,
    error: mfaError,
  } = mfa;

  // Automatically clear loading state when reaching final step
  useEffect(() => {
    if (step === 4) {
      setLoading(false);
      setError("");
    }
  }, [step]);

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
      setSignupMethod('google');
      
      const result = await signInWithGoogle();
      
      setCurrentUser(result);
      setStep(3); // Move to MFA enrollment step
      setLoading(false); // Reset loading state after successful signup
      
    } catch (error) {
      setError("Failed to sign up with Google. Please try again.");
      console.error("Google signup error:", error);
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setError("");
      setLoading(true);
      setTotpError("");
      setTotpCode("");
      setQrCodeDataUrl("");
      setEnrollmentAttempted(false);
      if (typeof resetEnrollment === "function") {
        resetEnrollment();
      }
      
      // Create Firebase user
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
      setStep(3); // Move to MFA enrollment step
      
    } catch (error) {
      setError(error.message);
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
          console.error("Failed to start TOTP enrollment during advisor signup:", err);
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
        console.error("Failed to render TOTP QR code during advisor signup:", err);
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
      console.error("Failed to regenerate TOTP secret during advisor signup:", err);
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
      setStep(4);
    } catch (err) {
      console.error("Failed to confirm TOTP code during advisor signup:", err);
      setTotpError(err?.message || "Unable to verify code. Please try again.");
    }
  };

  const handleCompleteSignup = async () => {
    try {
      if (needsEnrollment) {
        setError("Please complete authenticator setup to secure your account.");
        setLoading(false);
        return;
      }

      if (!currentUser) {
        setError("No user found. Please try signing up again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      
      const requestBody = {
        firebaseUid: currentUser.uid,
        firstname: signupMethod === 'email' ? formData.firstName : (currentUser.displayName?.split(' ')[0] || ''),
        lastname: signupMethod === 'email' ? formData.lastName : (currentUser.displayName?.split(' ').slice(1).join(' ') || ''),
        isNewUser: currentUser.metadata?.creationTime === currentUser.metadata?.lastSignInTime,
      };
      

      
      // Step 1: Create user in backend (no Plaid access token needed for advisors)
      const userResponse = await fetch("/api/signup-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });



      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error("User creation failed - Raw response:", errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || "Unknown error" };
        }
        
        throw new Error(`User creation failed (${userResponse.status}): ${errorData.error || errorData.detail || "Unknown error"}`);
      }

      const userData = await userResponse.json();

      // Use the redirectTo from the API response, or default to advisor dashboard
      const redirectPath = userData.redirectTo || "/advisor-dashboard";
      
      router.push(redirectPath);
    } catch (err) {
      console.error("Signup completion error:", err);
      setError(err.message || "Failed to complete signup. Please try again.");
      setLoading(false);
    }
  };

  const handleSkipSignup = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-black text-center">
          {step === 1 && "Advisor Sign Up"}
          {step === 2 && "Complete Your Information"}
          {step === 3 && "Secure Your Account"}
          {step === 4 && "Complete Registration"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Step 1: Choose signup method */}
        {step === 1 && (
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? "Signing up..." : "Continue with Google"}
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
              onClick={() => {
                setSignupMethod('email');
                setStep(2);
              }}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded"
            >
              Sign up with Email
            </button>

            <div className="text-center">
              <button
                onClick={handleSkipSignup}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Email signup form */}
        {step === 2 && (
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                required
                minLength="6"
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                required
                minLength="6"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Back
            </button>
          </form>
        )}

        {/* Step 3: MFA enrollment */}
        {step === 3 && (
          <div className="space-y-6">
            {(error || totpError || mfaError) && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {totpError || error || mfaError?.message || mfaError?.code || "Something went wrong."}
              </div>
            )}

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
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
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
                Use this code if your authenticator app can&apos;t scan the QR code.
              </p>
            </div>

            <div>
              <label htmlFor="advisor-totp" className="block text-sm font-medium text-gray-700">
                Enter the 6-digit code
              </label>
              <input
                type="text"
                id="advisor-totp"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
              />
            </div>

            <button
              type="button"
              onClick={handleConfirmTotp}
              disabled={mfaProcessing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded"
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
              Back
            </button>
          </div>
        )}

        {/* Step 4: Complete registration */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome, {signupMethod === 'email' ? formData.firstName : currentUser?.displayName?.split(' ')[0]}!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Complete your advisor registration to access the dashboard and start managing clients.
              </p>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full"></div>
                  <p className="mt-2">Setting up your advisor account...</p>
                </div>
              ) : (
                <button
                  onClick={handleCompleteSignup}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded"
                >
                  Complete Advisor Registration
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
