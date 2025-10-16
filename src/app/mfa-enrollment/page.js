"use client";
import React, { useEffect, useState, Suspense } from "react";
import QRCode from "qrcode";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { auth } from "../../lib/firestoreClient";

// Force dynamic rendering to prevent build-time errors on Azure
export const dynamic = 'force-dynamic';

function MfaEnrollmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const { user, loading, mfa, signOut, sendEmailVerification } = useAuth();

  const {
    needsEnrollment,
    processing,
    enrollment,
    startEnrollment,
    confirmEnrollment,
    resetEnrollment,
    error: mfaError,
  } = mfa;

  const [totpCode, setTotpCode] = useState("");
  const [localError, setLocalError] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [enrollmentCompleted, setEnrollmentCompleted] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  
  // One-shot ref to prevent re-entry - make it more robust
  const startedRef = React.useRef(false);
  const enrollmentAttemptedRef = React.useRef(false);

  // Reset refs when component unmounts
  useEffect(() => {
    return () => {
      startedRef.current = false;
      enrollmentAttemptedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Prevent duplicate executions (React Strict Mode doubles useEffect calls)
    if (startedRef.current || enrollmentAttemptedRef.current || enrollmentCompleted) {
      return;
    }
    
    if (loading || !user) {
      return;
    }
    
    if (processing) {
      return;
    }
    
    // Check for success flag from resolver enrollment
    const mfaEnrolled = searchParams.get("mfa") === "enrolled";
    if (mfaEnrolled) {
      router.replace(redirectTo);
      return;
    }

    // Check if user already has MFA enrolled directly from Firebase
    const factors = user.multiFactor?.enrolledFactors ?? [];

    // If user actually has MFA enrolled but needsEnrollment is true, force refresh
    if (factors.length > 0 && needsEnrollment) {
      router.replace(redirectTo);
      return;
    }

    if (!needsEnrollment && !processing) {
      router.replace(redirectTo);
      return;
    }

    // Mark as started BEFORE async operation to prevent React Strict Mode duplicates
    startedRef.current = true;
    enrollmentAttemptedRef.current = true;

    (async () => {
      try {
        
        // Force a server read before deciding
        await auth.currentUser.getIdToken(true);
        await auth.currentUser.reload();
        const serverFactors = auth.currentUser.multiFactor?.enrolledFactors ?? [];
        

        if (serverFactors.length > 0) {
          // already enrolled -> bail (no QR!)
          router.replace(redirectTo);
          return;
        }
        
        if (typeof startEnrollment === "function") {
          await startEnrollment({});
        }
      } catch (err) {
        console.error("Failed to start TOTP enrollment:", err);
        
        if (err.code === "auth/maximum-second-factor-count-exceeded") {
          // show error and STOP – do not retry
          setLocalError("Authenticator is already set up for this account.");
          router.replace(redirectTo);
          return;
        }
        
        if (err.message.includes("verify your email")) {
          setLocalError(err.message);
          return;
        }
        
        setLocalError(err.message || "Could not start authenticator setup.");
      }
    })();
  }, [loading, user, processing, searchParams, redirectTo, router, startEnrollment, needsEnrollment, enrollmentCompleted]);

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
        console.error("Failed to render TOTP QR code:", err);
        if (!cancelled) {
          setQrCodeDataUrl("");
          setLocalError((prev) => prev || "Unable to render the QR code. Use the manual setup key instead.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enrollment?.uri]);

  const handleGenerateNewSecret = async () => {
    try {
      setLocalError("");
      setTotpCode("");
      setEmailVerificationSent(false);
      
      // Reset all refs to allow retry
      startedRef.current = false;
      enrollmentAttemptedRef.current = false;
      setEnrollmentCompleted(false);
      
      if (typeof resetEnrollment === "function") {
        resetEnrollment();
      }
      
      // Add small delay to ensure state is reset
      setTimeout(async () => {
        try {
          await startEnrollment({});
        } catch (err) {
          console.error("Failed to regenerate TOTP secret:", err);
          setLocalError(err?.message || "Unable to generate a new code. Please try again.");
        }
      }, 100);
    } catch (err) {
      console.error("Failed to reset for regeneration:", err);
      setLocalError(err?.message || "Unable to reset. Please refresh the page.");
    }
  };

  const handleSendEmailVerification = async () => {
    try {
      await sendEmailVerification();
      setEmailVerificationSent(true);
    } catch (error) {
      setLocalError("Failed to send verification email. Please try again.");
    }
  };

  const handleConfirmCode = async () => {
    const sanitizedCode = totpCode.replace(/\s+/g, "");
    if (!sanitizedCode) {
      setLocalError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setLocalError("");
      
      // Confirm the enrollment
      await confirmEnrollment({ verificationCode: sanitizedCode });
      
      
      // CRITICAL: Force refresh user state to update MFA status
      await auth.currentUser?.reload();
      await auth.currentUser?.getIdToken(true);
      
      // Mark enrollment as completed to prevent retries
      setEnrollmentCompleted(true);
      
      // Add a small delay to ensure state propagates
      setTimeout(() => {
        router.replace(redirectTo);
      }, 500);
      
    } catch (err) {
      console.error("Failed to verify code:", err);
      setLocalError(err?.message || "Unable to verify code. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Preparing your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-xl max-w-lg w-full p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Enable Authenticator MFA
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Scan the QR code or enter the setup key below using any TOTP authenticator app (Google Authenticator, 1Password, etc.).
        </p>

        {(localError || mfaError) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {localError || mfaError?.message || mfaError?.code || "Something went wrong."}
            {localError?.includes("verify your email") && !emailVerificationSent && (
              <div className="mt-3">
                <button
                  onClick={handleSendEmailVerification}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Send Verification Email
                </button>
              </div>
            )}
            {emailVerificationSent && (
              <div className="mt-2 text-sm text-green-600">
                Verification email sent! Check your inbox and click the link to verify your email.
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-3">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Authenticator QR code"
                className="w-48 h-48 border border-gray-200 rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm text-center px-4">
                {processing ? "Generating QR code..." : "QR code will appear here once generated."}
              </div>
            )}
            <button
              type="button"
              onClick={handleGenerateNewSecret}
              disabled={processing}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              {processing ? "Working..." : "Generate a new QR code"}
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <p className="text-sm font-semibold text-gray-800">Manual setup key</p>
            <p className="mt-2 font-mono text-lg tracking-widest text-gray-900 select-all break-all">
              {enrollment?.secretKey || "Loading..."}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              If you can&apos;t scan the QR code, paste this key into your authenticator app as a time-based token.
            </p>
          </div>

          <div>
            <label htmlFor="totp-code" className="block text-sm font-medium text-gray-700 mb-1">
              Enter the 6-digit code
            </label>
            <input
              type="text"
              id="totp-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
            />
          </div>

          <button
            type="button"
            onClick={handleConfirmCode}
            disabled={processing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded"
          >
            {processing ? "Verifying..." : "Confirm & Continue"}
          </button>

          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="font-semibold text-blue-900 mb-1">Why this matters</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Authenticator apps keep attackers out even if your password leaks</li>
              <li>Required before viewing budgets, transactions, or bank details</li>
              <li>Helps us meet industry and client security expectations</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded"
          >
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrap the content in Suspense to handle useSearchParams during build
export default function MfaEnrollmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    }>
      <MfaEnrollmentContent />
    </Suspense>
  );
}
