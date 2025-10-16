import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updateEmail,
  sendEmailVerification,
  multiFactor,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  connectAuthEmulator, // only needed when you enable the emulator block
} from "firebase/auth";

// Only initialize Firebase in the browser (not during SSR/build)
const firebaseConfig = typeof window !== 'undefined' ? {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} : null;

// Create a dummy app for SSR/build that won't actually initialize
export const firebaseApp = typeof window !== 'undefined' && firebaseConfig
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

// Only run debug logging in the browser
if (typeof window !== 'undefined' && firebaseApp) {
// Debug Firebase project configuration on app load
console.log('=== FIREBASE PROJECT VERIFICATION ===');
console.log('Project ID:', firebaseApp.options.projectId);
console.log('API Key:', firebaseApp.options.apiKey?.substring(0, 20) + '...');
console.log('App ID:', firebaseApp.options.appId);
console.log('Auth Domain:', firebaseApp.options.authDomain);
console.log('Storage Bucket:', firebaseApp.options.storageBucket);
console.log('Messaging Sender ID:', firebaseApp.options.messagingSenderId);

// Debug environment variables loading
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID from env:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('NEXT_PUBLIC_FIREBASE_API_KEY from env:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 20) + '...');
console.log('NEXT_PUBLIC_FIREBASE_APP_ID from env:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

// Verify configuration matches expected values
const expectedProjectId = 'freedomledger-1d1b2';
const expectedApiKeyPrefix = 'AIzaSyAjG0er7sodOKIB';
if (firebaseApp.options.projectId !== expectedProjectId) {
  console.error('❌ PROJECT ID MISMATCH! Expected:', expectedProjectId, 'Got:', firebaseApp.options.projectId);
} else {
  console.log('✅ Project ID matches expected value');
}

if (!firebaseApp.options.apiKey?.startsWith(expectedApiKeyPrefix)) {
  console.error('❌ API KEY MISMATCH! Expected to start with:', expectedApiKeyPrefix, 'Got:', firebaseApp.options.apiKey?.substring(0, 20) + '...');
} else {
  console.log('✅ API Key matches expected value');
}
}

// Auth instance
export const auth = firebaseApp ? getAuth(firebaseApp) : null;

/* ─────────── Uncomment if you want to run the Auth emulator locally ───────────
if (
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH_EMULATOR === "true"
) {
  connectAuthEmulator(auth, "http://localhost:9099");
  // Skip reCAPTCHA during emulator testing
  auth.settings = { appVerificationDisabledForTesting: true };
}
*/

// Re‑export helpers so callers can import from a single module
export {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updateEmail,
  sendEmailVerification,
  multiFactor,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
};
