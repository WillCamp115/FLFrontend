// app/login/page.js
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import {
  signInWithEmailAndPassword,
  auth,
  getMultiFactorResolver,
  GoogleAuthProvider,
  signInWithRedirect,
  TotpMultiFactorGenerator,
} from "../../lib/firestoreClient";
import QRCode from "qrcode";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const { signInWithGoogle, loading, mfa, user, refreshUser } = useAuth();
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [totpEnrollment, setTotpEnrollment] = useState(null);

  // Handle successful login redirect - only redirect if no MFA processes are active
  useEffect(() => {
    if (!loading && user && !mfa.needsEnrollment && !mfaChallenge && !totpEnrollment && !isRedirecting) {
      setIsRedirecting(true);
      // Use replace to prevent back button issues
      router.replace("/dashboard");
    }
  }, [loading, user, mfa.needsEnrollment, mfaChallenge, totpEnrollment, isRedirecting, router]);

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setIsRedirecting(true);
      setMfaChallenge(null);
      setTotpEnrollment(null);
      
      // Proactively fall back to redirect if cross-origin isolation is on
      if (typeof window !== 'undefined' && window.crossOriginIsolated) {
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
        return;
      }
      
      const result = await signInWithGoogle();
      
      // If result is null, it means we're using redirect flow
      if (result === null) {
        // Redirect is in progress, don't set timeout
        return;
      }
      
      // Popup succeeded, redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (error) {
      setIsRedirecting(false);
      console.error("Google sign-in error:", error);
      
      // Handle MFA required for Google sign-in
      if (error.code === "auth/multi-factor-auth-required") {
        try {
          const resolver = getMultiFactorResolver(auth, error);
          
          // Debug logging to see what factors are enrolled
          
          // Only consider TOTP factors as hints
          const totpHint = resolver?.hints?.find(
            (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
          );

          // Guard clause: if no TOTP hint but other factors exist, user must resolve those first
          if (!totpHint && resolver.hints.length > 0) {
            setError("Another MFA factor exists. Complete or remove it first.");
            return;
          }

          // If no TOTP hint, we need to enroll during sign-in
          if (!totpHint) {
            const accountName = auth.currentUser?.email || email || user?.email || "unknown@freedomledger";
            const issuer = "FreedomLedger";

            try {
              const secret = await TotpMultiFactorGenerator.generateSecret(resolver.session);
              const uri = secret.generateQrCodeUrl(accountName, issuer);
              const qrCodeDataUrl = await QRCode.toDataURL(uri, { margin: 1 });

              setTotpEnrollment({
                resolver,
                secret,
                qrCodeDataUrl,
                secretKey: secret.secretKey,
                accountName,
                issuer,
                code: "",
                verifying: false,
                error: "",
              });
              setError("");
              return;
            } catch (generateError) {
              console.error("Failed to start TOTP enrollment from Google sign-in:", generateError);
              setError("We couldn't start authenticator setup. Please try again or use email sign-in.");
              return;
            }
          }

          const hintLabel = totpHint?.displayName || "your authenticator app";


          setMfaChallenge({
            resolver,
            hint: totpHint,
            code: "",
            verifying: false,
            error: "",
            hintLabel,
          });

          setError("");
        } catch (resolverError) {
          console.error("Failed to prepare multi-factor sign-in:", resolverError);
          setError("Multi-factor authentication failed to initialize. Please try again.");
        }
      } else {
        setError("Failed to sign in with Google. Please try again.");
      }
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setError("");
      setIsRedirecting(true);
      setMfaChallenge(null);
      setTotpEnrollment(null);
      await signInWithEmailAndPassword(auth, email, password);
      // Add small delay to ensure auth state propagates
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (error) {
      setIsRedirecting(false);
      switch (error.code) {
        case "auth/multi-factor-auth-required": {
          try {
            const resolver = getMultiFactorResolver(auth, error);
            
            // Debug logging to see what factors are enrolled
            
            // Only consider TOTP factors as hints
            const totpHint = resolver?.hints?.find(
              (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
            );

            // Guard clause: if no TOTP hint but other factors exist, user must resolve those first
            if (!totpHint && resolver.hints.length > 0) {
              setError("Another MFA factor exists. Complete or remove it first.");
              return;
            }

            // If no TOTP hint, we need to enroll during sign-in
            if (!totpHint) {
              const accountName = auth.currentUser?.email || email || user?.email || "unknown@freedomledger";
              const issuer = "FreedomLedger";

              try {
                const secret = await TotpMultiFactorGenerator.generateSecret(resolver.session);
                const uri = secret.generateQrCodeUrl(accountName, issuer);
                const qrCodeDataUrl = await QRCode.toDataURL(uri, { margin: 1 });

                setTotpEnrollment({
                  resolver,
                  secret,
                  qrCodeDataUrl,
                  secretKey: secret.secretKey,
                  accountName,
                  issuer,
                  code: "",
                  verifying: false,
                  error: "",
                });
                setError("");
                return;
              } catch (generateError) {
                console.error("Failed to start TOTP enrollment for email sign-in:", generateError);
                setError("We couldn't start authenticator setup. Please try again later.");
                return;
              }
            }

            const hintLabel = totpHint?.displayName || "your authenticator app";

            setMfaChallenge({
              resolver,
              hint: totpHint,
              code: "",
              verifying: false,
              error: "",
              hintLabel,
            });

            setError("");
          } catch (resolverError) {
            console.error("Failed to prepare multi-factor sign-in:", resolverError);
            setError("Multi-factor authentication failed to initialize. Please try again.");
          }
          break;
        }
        case 'auth/user-not-found':
          setError("No account found with this email address.");
          break;
        case 'auth/wrong-password':
          setError("Incorrect password.");
          break;
        case 'auth/invalid-email':
          setError("Invalid email address.");
          break;
        case 'auth/too-many-requests':
          setError("Too many failed login attempts. Please try again later.");
          break;
        default:
          setError("Failed to sign in. Please check your credentials.");
      }
      console.error("Email sign-in error:", error);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (mfaChallenge?.verifying) {
      return;
    }
    
    const code = mfaChallenge?.code?.trim();
    if (!mfaChallenge || !mfaChallenge.resolver || !code) {
      setMfaChallenge((prev) => prev ? { ...prev, error: "Enter the 6-digit code from your authenticator app." } : prev);
      return;
    }

    try {
      setMfaChallenge((prev) => prev ? { ...prev, verifying: true, error: "" } : prev);
      
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(mfaChallenge.hint?.uid, code);
      
      await mfaChallenge.resolver.resolveSignIn(assertion);

      
      // Clear the challenge state immediately
      setMfaChallenge(null);
      
      // For verification (not enrollment), we don't need to check factors
      // The user is already enrolled and just verified their identity
      setIsRedirecting(true);
      
      // Refresh user state in background but don't wait for it
      if (refreshUser) {
        refreshUser().then(() => {
        }).catch(err => {
          console.warn('Failed to refresh user state after MFA verification:', err);
        });
      }
      
      router.replace("/dashboard");
      
    } catch (err) {
      console.error("Failed to complete multi-factor sign-in:", err);
      console.error("Error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      setMfaChallenge((prev) => prev ? {
        ...prev,
        verifying: false,
        error: `Verification failed: ${err.message || "Please try again."}`,
      } : prev);
    }
  };

  const handleTotpEnrollmentSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (totpEnrollment?.verifying) {
      return;
    }
    
    if (!totpEnrollment?.resolver || !totpEnrollment?.secret) {
      setTotpEnrollment((prev) => prev ? { ...prev, error: "Authenticator setup isn't ready yet." } : prev);
      return;
    }

    const code = totpEnrollment.code.trim();
    if (!code) {
      setTotpEnrollment((prev) => prev ? { ...prev, error: "Enter the 6-digit code from your authenticator app." } : prev);
      return;
    }

    try {
      setTotpEnrollment((prev) => prev ? { ...prev, verifying: true, error: "" } : prev);
      
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpEnrollment.secret, code);
      
      await totpEnrollment.resolver.resolveSignIn(assertion);

      
      // Refresh user state first
      if (refreshUser) {
        await refreshUser();
      }
      
      // Clear the enrollment state after successful refresh
      setTotpEnrollment(null);
      
      // Force a final check and redirect
      await auth.currentUser?.reload();
      const factors = auth.currentUser?.multiFactor?.enrolledFactors ?? [];
      
      if (factors.length > 0) {
        setIsRedirecting(true);
        router.replace("/dashboard");
      } else {
        console.warn('Enrollment completed but no factors found, something may be wrong');
        setTotpEnrollment((prev) => prev ? { ...prev, error: "Enrollment may not have completed properly. Please try again." } : prev);
      }
      
    } catch (err) {
      console.error("Failed to enroll authenticator during sign-in:", err);
      console.error("Error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      setTotpEnrollment((prev) => prev ? {
        ...prev,
        verifying: false,
        error: `Enrollment failed: ${err.message || "Please try again."}`,
      } : prev);
    }
  };


  // Show loading overlay when redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl text-black font-bold mb-6 text-center">Sign In</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {totpEnrollment ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Scan this QR code with your authenticator app, then enter the 6-digit code below to finish signing in.
            </p>

            {totpEnrollment.error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {totpEnrollment.error}
              </div>
            )}

            <div className="flex justify-center">
              {totpEnrollment.qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={totpEnrollment.qrCodeDataUrl}
                  alt="Authenticator QR code"
                  className="w-40 h-40 border border-gray-200 rounded-lg shadow-sm"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm text-center px-4">
                  Generating QR code...
                </div>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <p className="text-sm font-semibold text-gray-800">Manual setup key</p>
              <p className="mt-2 font-mono text-lg tracking-widest text-gray-900 select-all break-all">
                {totpEnrollment.secretKey || "Loading..."}
              </p>
            </div>

            <form onSubmit={handleTotpEnrollmentSubmit} className="space-y-4">
              <div>
                <label htmlFor="totp-enroll-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Authenticator Code
                </label>
                <input
                  type="text"
                  id="totp-enroll-code"
                  value={totpEnrollment.code}
                  onChange={(e) => setTotpEnrollment((prev) => prev ? { ...prev, code: e.target.value.replace(/[^0-9]/g, '') } : prev)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={totpEnrollment.verifying || totpEnrollment.code.length !== 6}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded transition-colors"
              >
                {totpEnrollment.verifying ? "Verifying..." : "Confirm Code"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setTotpEnrollment(null);
                setError("");
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Back to Sign In Options
            </button>
          </div>
        ) : mfaChallenge ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Multi-factor authentication is required. Open <span className="font-semibold">{mfaChallenge.hintLabel}</span> and enter the current 6-digit code.
            </p>

            {mfaChallenge.error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {mfaChallenge.error}
              </div>
            )}

            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div>
                <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Authenticator Code
                </label>
                <input
                  type="text"
                  id="mfa-code"
                  value={mfaChallenge.code}
                  onChange={(e) => setMfaChallenge((prev) => prev ? { ...prev, code: e.target.value.replace(/[^0-9]/g, '') } : prev)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={mfaChallenge.verifying || mfaChallenge.code.length !== 6}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded transition-colors"
              >
                {mfaChallenge.verifying ? "Verifying..." : "Confirm Code"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMfaChallenge(null);
                setTotpEnrollment(null);
                setError("");
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Back to Sign In Options
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {!isEmailLogin ? (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading || isRedirecting}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-3 px-4 rounded flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>{loading || isRedirecting ? "Signing in..." : "Continue with Google"}</span>
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
                  onClick={() => setIsEmailLogin(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded"
                >
                  Sign in with Email
                </button>
              </>
            ) : (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || isRedirecting}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded"
                >
                  {loading || isRedirecting ? "Signing in..." : "Sign In"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEmailLogin(false)}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Back to Other Options
                </button>
              </form>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account? {" "}
          <a href="/signup" className="text-blue-500 hover:text-blue-600">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}
